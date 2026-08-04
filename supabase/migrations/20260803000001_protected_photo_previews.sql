-- Public viewers may discover protected media rows, but can only read their
-- deliberately low-detail derivative. Original and owner thumbnail objects
-- remain inaccessible in the private `photos` bucket.
create policy "Public can read published protected media descriptors"
  on public.portfolio_media
  for select
  to anon, authenticated
  using (
    public.is_published_portfolio(portfolio_id)
    and visibility in ('blurred', 'interest_required')
    and metadata ? 'blurPath'
  );

create policy "Published protected photo previews are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      where media.metadata ->> 'blurPath' = name
        and media.visibility in ('blurred', 'interest_required')
        and public.is_published_portfolio(media.portfolio_id)
    )
  );
