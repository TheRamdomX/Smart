-- ============================================================
-- 0006 — Limpieza de datos: elimina TODOS los registros
-- manteniendo tablas, funciones, triggers y políticas.
--
-- ⚠️ DESTRUCTIVO E IRREVERSIBLE: borra productos, ventas,
-- movimientos y gastos. La configuración (settings) se conserva.
-- Pensado para partir de cero después de las pruebas.
-- ============================================================

truncate table
  public.sale_items,
  public.inventory_movements,
  public.sales,
  public.products,
  public.expenses
restart identity cascade;
