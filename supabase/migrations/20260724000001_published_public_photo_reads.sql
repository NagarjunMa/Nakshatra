-- Keep the `photos` bucket private while allowing published portfolios to serve only public images.
create policy "Published public portfolio photos are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      where media.storage_path = name
        and media.visibility = 'public'
        and public.is_published_portfolio(media.portfolio_id)
    )
  );
