-- ============================================================
-- 0005 — Medio de pago en ventas: efectivo, transferencia o tarjeta
-- ============================================================

alter table public.sales
  add column if not exists payment_method text not null default 'efectivo'
  check (payment_method in ('efectivo', 'transferencia', 'tarjeta'));

-- Se reemplaza create_sale para recibir el medio de pago.
-- (drop primero: cambiar la firma crearía una sobrecarga ambigua para el RPC)
drop function if exists public.create_sale(jsonb, text);

create or replace function public.create_sale(
  items jsonb,
  sale_note text default null,
  payment_method text default 'efectivo'
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  new_sale   public.sales;
  item       record;
  prod       public.products;
  sale_total numeric := 0;
begin
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'La venta debe incluir al menos un producto';
  end if;

  if payment_method not in ('efectivo', 'transferencia', 'tarjeta') then
    raise exception 'Medio de pago inválido';
  end if;

  insert into public.sales (note, payment_method)
  values (sale_note, payment_method)
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

    -- Snapshot de precio y costo al momento de la venta.
    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    values (new_sale.id, prod.id, item.quantity, prod.price, prod.cost);

    -- El trigger trg_apply_movement descuenta el stock.
    insert into public.inventory_movements (product_id, type, quantity, sale_id, note)
    values (prod.id, 'salida', item.quantity, new_sale.id, 'Venta');

    sale_total := sale_total + prod.price * item.quantity;
  end loop;

  update public.sales set total = sale_total
  where id = new_sale.id
  returning * into new_sale;

  return new_sale;
end;
$$;

revoke all on function public.create_sale(jsonb, text, text) from public, anon;
grant execute on function public.create_sale(jsonb, text, text) to authenticated;
