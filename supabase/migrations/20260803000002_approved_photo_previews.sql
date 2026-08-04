-- Approved-interest photos remain discoverable as protected previews before
-- approval. Public viewers can read only the deliberately low-detail
-- derivative; original and owner thumbnail objects remain private.
drop policy if exists "Public can read published protected media descriptors"
  on public.portfolio_media;

create policy "Public can read published protected media descriptors"
  on public.portfolio_media
  for select
  to anon, authenticated
  using (
    public.is_published_portfolio(portfolio_id)
    and visibility in ('blurred', 'interest_required', 'approved_only')
    and metadata ? 'blurPath'
  );

drop policy if exists "Published protected photo previews are readable"
  on storage.objects;

create policy "Published protected photo previews are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      where media.metadata ->> 'blurPath' = name
        and media.visibility in ('blurred', 'interest_required', 'approved_only')
        and public.is_published_portfolio(media.portfolio_id)
    )
  );
