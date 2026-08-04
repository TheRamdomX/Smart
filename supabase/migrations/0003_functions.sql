-- ============================================================
-- 0003 — Funciones: create_sale, profit_summary, top_products
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

-- ---------- Reportes ----------

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
