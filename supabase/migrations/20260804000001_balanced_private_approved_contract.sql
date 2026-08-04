-- Simplify portfolio disclosure to two public modes plus one authenticated,
-- identity-bound approved-request projection.

alter table public.portfolios alter column privacy_mode drop default;

update public.portfolios
set privacy_mode = 'progressive'
where privacy_mode::text = 'open';

do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'portfolio_privacy_mode' and e.enumlabel = 'progressive'
  ) and not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'portfolio_privacy_mode' and e.enumlabel = 'balanced'
  ) then
    alter type public.portfolio_privacy_mode rename value 'progressive' to 'balanced';
  end if;
end $$;

alter table public.portfolios
  alter column privacy_mode set default 'balanced';

alter table public.portfolios
  drop constraint if exists portfolios_supported_privacy_mode;

alter table public.portfolios
  add constraint portfolios_supported_privacy_mode
  check (privacy_mode::text in ('balanced', 'private'));

update public.portfolios
set draft_data = jsonb_set(draft_data, '{privacy_mode}', '"balanced"'::jsonb, true)
where draft_data ->> 'privacy_mode' in ('open', 'progressive');

update public.portfolios
set published_data = jsonb_set(published_data, '{privacy_mode}', '"balanced"'::jsonb, true)
where published_data is not null
  and published_data ->> 'privacy_mode' in ('open', 'progressive');

update public.portfolios
set visibility_settings = jsonb_set(
  coalesce(visibility_settings, '{}'::jsonb),
  '{preset}',
  '"balanced"'::jsonb,
  true
)
where visibility_settings ->> 'preset' in ('open', 'progressive');

update public.public_portfolio_snapshots
set data = jsonb_set(data, '{privacy_mode}', '"balanced"'::jsonb, true)
where data ->> 'privacy_mode' in ('open', 'progressive');

alter table public.reveal_grants
  alter column access_level set default 'full';

update public.reveal_grants
set access_level = 'full'
where access_level = 'selected'
  and revoked_at is null;

create table if not exists public.approved_portfolio_snapshots (
  portfolio_id uuid primary key references public.portfolios(id) on delete cascade,
  data jsonb not null,
  template_id int not null,
  theme_color text,
  sun_sign text,
  published_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.approved_portfolio_snapshots enable row level security;

drop policy if exists "Portfolio managers can manage approved snapshots"
  on public.approved_portfolio_snapshots;
create policy "Portfolio managers can manage approved snapshots"
  on public.approved_portfolio_snapshots
  for all
  to authenticated
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

drop policy if exists "Approved viewers can read active approved snapshots"
  on public.approved_portfolio_snapshots;
create policy "Approved viewers can read active approved snapshots"
  on public.approved_portfolio_snapshots
  for select
  to authenticated
  using (
    public.is_published_portfolio(portfolio_id)
    and exists (
      select 1
      from public.reveal_grants grant_record
      where grant_record.portfolio_id = approved_portfolio_snapshots.portfolio_id
        and grant_record.viewer_user_id = (select auth.uid())
        and grant_record.access_level = 'full'
        and grant_record.revoked_at is null
        and (grant_record.expires_at is null or grant_record.expires_at > now())
    )
  );

drop trigger if exists approved_portfolio_snapshots_updated_at
  on public.approved_portfolio_snapshots;
create trigger approved_portfolio_snapshots_updated_at
  before update on public.approved_portfolio_snapshots
  for each row execute function public.update_updated_at();

create index if not exists idx_approved_portfolio_snapshots_published
  on public.approved_portfolio_snapshots(portfolio_id, published_at desc);

drop policy if exists "Approved viewers can read approved photo originals"
  on storage.objects;
create policy "Approved viewers can read approved photo originals"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      where media.storage_path = storage.objects.name
        and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only')
        and public.is_published_portfolio(media.portfolio_id)
        and exists (
          select 1
          from public.reveal_grants grant_record
          where grant_record.portfolio_id = media.portfolio_id
            and grant_record.viewer_user_id = (select auth.uid())
            and grant_record.access_level = 'full'
            and grant_record.revoked_at is null
            and (grant_record.expires_at is null or grant_record.expires_at > now())
        )
    )
  );

drop policy if exists "Approved viewers can read published horoscope attachments"
  on public.portfolio_horoscopes;
create policy "Approved viewers can read published horoscope attachments"
  on public.portfolio_horoscopes
  for select
  to authenticated
  using (
    published_at is not null
    and public.is_published_portfolio(portfolio_id)
    and exists (
      select 1
      from public.reveal_grants grant_record
      where grant_record.portfolio_id = portfolio_horoscopes.portfolio_id
        and grant_record.viewer_user_id = (select auth.uid())
        and grant_record.access_level = 'full'
        and grant_record.revoked_at is null
        and (grant_record.expires_at is null or grant_record.expires_at > now())
    )
  );

drop policy if exists "Approved viewers can read horoscope files"
  on storage.objects;
create policy "Approved viewers can read horoscope files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'horoscopes'
    and exists (
      select 1
      from public.portfolio_horoscopes horoscope
      where horoscope.storage_path = storage.objects.name
        and horoscope.published_at is not null
        and public.is_published_portfolio(horoscope.portfolio_id)
        and exists (
          select 1
          from public.reveal_grants grant_record
          where grant_record.portfolio_id = horoscope.portfolio_id
            and grant_record.viewer_user_id = (select auth.uid())
            and grant_record.access_level = 'full'
            and grant_record.revoked_at is null
            and (grant_record.expires_at is null or grant_record.expires_at > now())
        )
    )
  );

comment on table public.approved_portfolio_snapshots is
  'Sanitized full-blueprint payload. Readable only by the owner or an authenticated viewer with an active full reveal grant.';
