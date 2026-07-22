-- `photos` is a private bucket. Do not allow blanket public reads.
drop policy if exists "Public can view photos" on storage.objects;

create policy "Users can read own photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update own photos" on storage.objects;

create policy "Users can update own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );