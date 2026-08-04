-- Private portfolios may show one public gallery photo clearly while presenting
-- every remaining gallery item through its generated low-detail derivative.
-- Originals remain private; this policy grants access only to matching blurPath
-- objects for active, published Private-mode snapshots.
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
      left join public.public_portfolio_snapshots snapshot
        on snapshot.portfolio_id = media.portfolio_id
      where media.metadata ->> 'blurPath' = name
        and (
          media.visibility in ('blurred', 'interest_required', 'approved_only')
          or (
            media.visibility = 'public'
            and media.media_type = 'gallery'
            and snapshot.is_active = true
            and snapshot.data ->> 'privacy_mode' = 'private'
          )
        )
        and public.is_published_portfolio(media.portfolio_id)
    )
  );
