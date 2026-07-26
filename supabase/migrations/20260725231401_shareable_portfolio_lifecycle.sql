-- A snapshot is public only while its owner portfolio and token remain active.
alter table public.public_portfolio_snapshots
  add column if not exists is_active boolean not null default true;

create or replace function public.is_current_public_snapshot(
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

drop policy if exists "Public can read active sanitized portfolio snapshots"
  on public.public_portfolio_snapshots;

create policy "Public can read active sanitized portfolio snapshots"
  on public.public_portfolio_snapshots for select
  to anon, authenticated
  using (
    is_active
    and public.is_published_portfolio(portfolio_id)
    and public.is_current_public_snapshot(portfolio_id, share_token)
  );

-- Preserve only links whose corresponding owner portfolio is still publishable.
update public.public_portfolio_snapshots snapshot
set is_active = exists (
  select 1
  from public.portfolios portfolio
  where portfolio.id = snapshot.portfolio_id
    and portfolio.is_published = true
    and portfolio.share_token = snapshot.share_token
    and (portfolio.expires_at is null or portfolio.expires_at > now())
);
