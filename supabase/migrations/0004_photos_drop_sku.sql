-- ============================================================
-- 0004 — Fotos de productos y eliminación del SKU
-- ============================================================

alter table public.products drop column if exists sku;
alter table public.products add column if not exists image_url text;

-- Bucket público para las fotos (lectura pública, escritura solo autenticado).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "authenticated manage productos bucket" on storage.objects
  for all to authenticated
  using (bucket_id = 'productos')
  with check (bucket_id = 'productos');

create policy "public read productos bucket" on storage.objects
  for select to public
  using (bucket_id = 'productos');
