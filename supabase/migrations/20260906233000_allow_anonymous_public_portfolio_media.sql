-- Let anonymous Storage requests evaluate the public-media allowlist without
-- granting direct access to private portfolio or media tables. This predicate
-- returns false for both private and missing paths, so it cannot be used to
-- enumerate private objects.
grant execute on function public.is_public_portfolio_media_path(text, text)
  to anon;

drop policy if exists "Active portfolio public photos are readable" on storage.objects;
create policy "Active portfolio public photos are readable"
  on storage.objects for select
  to anon, authenticated
  using (public.is_public_portfolio_media_path(bucket_id, name));

drop policy if exists "Active portfolio protected previews are readable" on storage.objects;
create policy "Active portfolio protected previews are readable"
  on storage.objects for select
  to anon, authenticated
  using (public.is_public_portfolio_media_path(bucket_id, name));
