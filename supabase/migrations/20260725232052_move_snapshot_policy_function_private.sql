-- Keep the SECURITY DEFINER token check out of the API-exposed public schema.
create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.is_current_public_snapshot(
  p_portfolio_id uuid,
  p_share_token text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portfolios p
    where p.id = p_portfolio_id
      and p.share_token = p_share_token
      and p.is_published = true
      and (p.expires_at is null or p.expires_at > now())
  );
$$;

grant usage on schema app_private to anon, authenticated;
grant execute on function app_private.is_current_public_snapshot(uuid, text)
  to anon, authenticated;

drop policy if exists "Public can read active sanitized portfolio snapshots"
  on public.public_portfolio_snapshots;

create policy "Public can read active sanitized portfolio snapshots"
  on public.public_portfolio_snapshots for select
  to anon, authenticated
  using (
    is_active
    and public.is_published_portfolio(portfolio_id)
    and app_private.is_current_public_snapshot(portfolio_id, share_token)
  );

drop function public.is_current_public_snapshot(uuid, text);
