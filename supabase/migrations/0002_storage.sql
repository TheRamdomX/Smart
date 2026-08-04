-- ============================================================
-- 0002 — Storage: bucket de fotos de productos
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  5242880,
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
