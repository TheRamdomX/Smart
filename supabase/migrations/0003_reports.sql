-- ============================================================
-- 0003 — Funciones de reportes: profit_summary y top_products
-- Las fechas se interpretan en la zona horaria del negocio
-- (America/Santiago) para que una venta a las 23:00 cuente en
-- el día correcto.
-- ============================================================

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
      coalesce(sum(si.quantity * si.unit_price), 0) as revenue,
      coalesce(sum(si.quantity * si.unit_cost), 0)  as cogs
    from public.sale_items si
    join public.sales sa on sa.id = si.sale_id
    where (sa.sold_at at time zone 'America/Santiago')::date
          between from_date and to_date
  ),
  e as (
    select coalesce(sum(amount), 0) as total_expenses
    from public.expenses
    where expense_date between from_date and to_date
  )
  select
    s.revenue,
    s.cogs,
    s.revenue - s.cogs,
    e.total_expenses,
    s.revenue - s.cogs - e.total_expenses
  from s, e;
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
