-- ============================================================
-- 0001 — Esquema completo: tablas, trigger de stock, RLS, seed
-- ============================================================

-- ---------- Secuencia para SKU numérico ----------

create sequence if not exists public.sku_seq start with 100000001 increment by 1;

-- ---------- Tablas ----------

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

-- ---------- Índices ----------

create index idx_products_sku on public.products (sku);
create index idx_movements_product on public.inventory_movements (product_id, created_at desc);
create index idx_sale_items_sale on public.sale_items (sale_id);
create index idx_sales_sold_at on public.sales (sold_at desc);
create index idx_expenses_date on public.expenses (expense_date desc);

-- ---------- Trigger: el stock se deriva de los movimientos ----------

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

-- ---------- RLS ----------

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
