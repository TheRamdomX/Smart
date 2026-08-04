-- ============================================================
-- Migración a esquema v2
-- Conserva productos existentes, descarta ventas/movimientos.
-- Ejecutar en el SQL Editor de Supabase (Dashboard).
-- ============================================================

begin;

-- 1. Respaldar productos
create temp table _products_backup on commit drop as
  select id, name, image_url, category, cost, price, stock, min_stock, active, created_at
  from public.products;

-- 2. Eliminar funciones (cascade quita dependencias)
drop function if exists public.create_sale cascade;
drop function if exists public.profit_summary cascade;
drop function if exists public.top_products cascade;
drop function if exists public.apply_movement cascade;

-- 3. Eliminar tablas (orden por FK)
drop table if exists public.sale_items cascade;
drop table if exists public.inventory_movements cascade;
drop table if exists public.sales cascade;
drop table if exists public.expenses cascade;
drop table if exists public.products cascade;
drop table if exists public.settings cascade;

-- 4. Eliminar secuencia previa si existe
drop sequence if exists public.sku_seq;

-- ============================================================
-- 0001 — Esquema completo
-- ============================================================

create sequence public.sku_seq start with 100000001 increment by 1;

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null unique default lpad(nextval('public.sku_seq')::text, 9, '0'),
  name        text not null,
  image_url   text,
  category    text,
  cost        numeric(12,0) not null default 0 check (cost >= 0),
  price       numeric(12,0) not null default 0 check (price >= 0),
  offer_price numeric(12,0) default null check (offer_price is null or offer_price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  min_stock   integer not null default 5 check (min_stock >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.sales (
  id              uuid primary key default gen_random_uuid(),
  sold_at         timestamptz not null default now(),
  total           numeric(12,0) not null default 0,
  note            text,
  payment_method  text not null default 'efectivo'
                  check (payment_method in ('efectivo', 'transferencia', 'tarjeta')),
  shipping_cost   numeric(12,0) not null default 0 check (shipping_cost >= 0),
  adjustment      numeric(12,0) not null default 0,
  adjustment_note text
);

create table public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales (id) on delete cascade,
  product_id  uuid not null references public.products (id),
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(12,0) not null,
  unit_cost   numeric(12,0) not null
);

create table public.inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id),
  type        text not null check (type in ('entrada', 'salida', 'ajuste')),
  quantity    integer not null check (quantity <> 0),
  note        text,
  sale_id     uuid references public.sales (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (type = 'ajuste' or quantity > 0)
);

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  amount        numeric(12,0) not null check (amount > 0),
  category      text not null,
  description   text,
  expense_date  date not null default current_date,
  created_at    timestamptz not null default now()
);

create table public.settings (
  id                  integer primary key check (id = 1),
  business_name       text not null default 'Mi Negocio',
  currency            text not null default 'CLP',
  default_min_stock   integer not null default 5 check (default_min_stock >= 0),
  product_categories  text[] not null default array['General'],
  expense_categories  text[] not null default array['Arriendo', 'Servicios', 'Insumos', 'Transporte', 'Otros']
);

insert into public.settings (id) values (1);

create index idx_products_sku on public.products (sku);
create index idx_movements_product on public.inventory_movements (product_id, created_at desc);
create index idx_sale_items_sale on public.sale_items (sale_id);
create index idx_sales_sold_at on public.sales (sold_at desc);
create index idx_expenses_date on public.expenses (expense_date desc);

-- Trigger de stock
create or replace function public.apply_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set stock = stock + case new.type
    when 'entrada' then new.quantity
    when 'salida'  then -new.quantity
    when 'ajuste'  then new.quantity
  end
  where id = new.product_id;
  return new;
end;
$$;

create trigger trg_apply_movement
  after insert on public.inventory_movements
  for each row execute function public.apply_movement();

-- RLS
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

create policy "authenticated full access" on public.products
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.sales
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.sale_items
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.inventory_movements
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.expenses
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.settings
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 0002 — Storage (bucket ya existe, ON CONFLICT lo ignora)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos', 'productos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Las políticas de storage se recrean solo si no existen.
-- Si ya existen del esquema anterior, el DO NOTHING evita error.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'authenticated manage productos bucket'
  ) then
    create policy "authenticated manage productos bucket" on storage.objects
      for all to authenticated
      using (bucket_id = 'productos')
      with check (bucket_id = 'productos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'public read productos bucket'
  ) then
    create policy "public read productos bucket" on storage.objects
      for select to public
      using (bucket_id = 'productos');
  end if;
end;
$$;

-- ============================================================
-- 0003 — Funciones
-- ============================================================

create or replace function public.create_sale(
  items jsonb,
  sale_note text default null,
  payment_method text default 'efectivo',
  p_shipping_cost numeric default 0,
  p_adjustment numeric default 0,
  p_adjustment_note text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  new_sale        public.sales;
  item            record;
  prod            public.products;
  sale_total      numeric := 0;
  effective_price numeric;
begin
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'La venta debe incluir al menos un producto';
  end if;

  if payment_method not in ('efectivo', 'transferencia', 'tarjeta') then
    raise exception 'Medio de pago inválido';
  end if;

  if p_shipping_cost < 0 then
    raise exception 'El cargo por envío no puede ser negativo';
  end if;

  insert into public.sales (note, payment_method, shipping_cost, adjustment, adjustment_note)
  values (sale_note, payment_method, p_shipping_cost, p_adjustment, p_adjustment_note)
  returning * into new_sale;

  for item in
    select * from jsonb_to_recordset(items) as x(product_id uuid, quantity integer)
  loop
    if item.product_id is null or item.quantity is null or item.quantity <= 0 then
      raise exception 'Línea de venta inválida';
    end if;

    select * into prod from public.products where id = item.product_id for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;
    if not prod.active then
      raise exception 'El producto "%" está inactivo', prod.name;
    end if;
    if prod.stock < item.quantity then
      raise exception 'Stock insuficiente para "%": disponible %, pedido %',
        prod.name, prod.stock, item.quantity;
    end if;

    effective_price := coalesce(prod.offer_price, prod.price);

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    values (new_sale.id, prod.id, item.quantity, effective_price, prod.cost);

    insert into public.inventory_movements (product_id, type, quantity, sale_id, note)
    values (prod.id, 'salida', item.quantity, new_sale.id, 'Venta');

    sale_total := sale_total + effective_price * item.quantity;
  end loop;

  update public.sales set total = sale_total + p_shipping_cost + p_adjustment
  where id = new_sale.id
  returning * into new_sale;

  return new_sale;
end;
$$;

revoke all on function public.create_sale(jsonb, text, text, numeric, numeric, text) from public, anon;
grant execute on function public.create_sale(jsonb, text, text, numeric, numeric, text) to authenticated;

create or replace function public.profit_summary(from_date date, to_date date)
returns table (
  revenue        numeric,
  cogs           numeric,
  gross_profit   numeric,
  total_expenses numeric,
  net_profit     numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select
      coalesce(sum(si.quantity * si.unit_price), 0) as product_revenue,
      coalesce(sum(si.quantity * si.unit_cost), 0)  as cogs
    from public.sale_items si
    join public.sales sa on sa.id = si.sale_id
    where (sa.sold_at at time zone 'America/Santiago')::date
          between from_date and to_date
  ),
  extras as (
    select
      coalesce(sum(shipping_cost), 0) as total_shipping,
      coalesce(sum(adjustment), 0)    as total_adjustment
    from public.sales
    where (sold_at at time zone 'America/Santiago')::date
          between from_date and to_date
  ),
  e as (
    select coalesce(sum(amount), 0) as total_expenses
    from public.expenses
    where expense_date between from_date and to_date
  )
  select
    s.product_revenue + extras.total_shipping + extras.total_adjustment,
    s.cogs,
    s.product_revenue + extras.total_shipping + extras.total_adjustment - s.cogs,
    e.total_expenses,
    s.product_revenue + extras.total_shipping + extras.total_adjustment - s.cogs - e.total_expenses
  from s, extras, e;
$$;

create or replace function public.top_products(
  from_date date,
  to_date date,
  limit_count integer default 10
)
returns table (
  product_id uuid,
  name       text,
  units      integer,
  revenue    numeric,
  profit     numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    sum(si.quantity)::integer                              as units,
    sum(si.quantity * si.unit_price)                       as revenue,
    sum(si.quantity * (si.unit_price - si.unit_cost))      as profit
  from public.sale_items si
  join public.sales sa on sa.id = si.sale_id
  join public.products p on p.id = si.product_id
  where (sa.sold_at at time zone 'America/Santiago')::date
        between from_date and to_date
  group by p.id, p.name
  order by revenue desc
  limit limit_count;
$$;

revoke all on function public.profit_summary(date, date) from public, anon;
grant execute on function public.profit_summary(date, date) to authenticated;

revoke all on function public.top_products(date, date, integer) from public, anon;
grant execute on function public.top_products(date, date, integer) to authenticated;

-- ============================================================
-- 5. Reinsertar productos (SKU se auto-genera, offer_price = null)
-- ============================================================

insert into public.products (id, name, image_url, category, cost, price, stock, min_stock, active, created_at)
select id, name, image_url, category, cost, price, stock, min_stock, active, created_at
from _products_backup;

-- La tabla temporal se elimina automáticamente al terminar la transacción.

commit;
