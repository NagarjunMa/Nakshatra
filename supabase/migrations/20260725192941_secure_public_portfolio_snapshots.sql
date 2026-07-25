-- Public visitors may only query this whitelisted representation, never the owner portfolio row.
create table public.public_portfolio_snapshots (
  portfolio_id uuid primary key references public.portfolios(id) on delete cascade,
  share_token text unique not null,
  data jsonb not null default '{}'::jsonb,
  template_id int not null,
  theme_color text,
  sun_sign text,
  expires_at timestamptz,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_public_portfolio_snapshots_share_token
  on public.public_portfolio_snapshots(share_token);

alter table public.public_portfolio_snapshots enable row level security;

grant select on public.public_portfolio_snapshots to anon;
grant select, insert, update, delete on public.public_portfolio_snapshots to authenticated;

create policy "Public can read active sanitized portfolio snapshots"
  on public.public_portfolio_snapshots for select
  to anon, authenticated
  using (expires_at is null or expires_at > now());

create policy "Portfolio managers can manage sanitized portfolio snapshots"
  on public.public_portfolio_snapshots for all
  to authenticated
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create trigger public_portfolio_snapshots_updated_at
  before update on public.public_portfolio_snapshots
  for each row execute function public.update_updated_at();

-- Remove the old anonymous portfolio-table policy: it exposed full published_data through the Data API.
drop policy if exists "Public can view published portfolios" on public.portfolios;

-- Preserve currently published links by backfilling only fields permitted in the public representation.
insert into public.public_portfolio_snapshots (
  portfolio_id,
  share_token,
  data,
  template_id,
  theme_color,
  sun_sign,
  expires_at,
  published_at
)
select
  p.id,
  p.share_token,
  jsonb_strip_nulls(jsonb_build_object(
    'personal', jsonb_strip_nulls(jsonb_build_object(
      'name', p.published_data #>> '{personal,name}',
      'preferred_name', p.published_data #>> '{personal,preferred_name}',
      'dob', p.published_data #>> '{personal,dob}',
      'current_location', p.published_data #>> '{personal,current_location}',
      'gender', p.published_data #>> '{personal,gender}',
      'marital_status', p.published_data #>> '{personal,marital_status}',
      'relocation_preference', p.published_data #>> '{personal,relocation_preference}',
      'profile_summary', p.published_data #>> '{personal,profile_summary}'
    )),
    'vitals', jsonb_strip_nulls(jsonb_build_object(
      'height', p.published_data #>> '{vitals,height}',
      'complexion', p.published_data #>> '{vitals,complexion}'
    )),
    'astrology', jsonb_strip_nulls(jsonb_build_object(
      'rashi', p.published_data #>> '{astrology,rashi}',
      'nakshatra', p.published_data #>> '{astrology,nakshatra}',
      'pada', p.published_data #>> '{astrology,pada}'
    )),
    'education', p.published_data -> 'education',
    'career', p.published_data -> 'career',
    'lifestyle', p.published_data -> 'lifestyle',
    'style', p.published_data -> 'style',
    'preferences', p.published_data -> 'preferences',
    'visibility', jsonb_build_object(
      'family', 'restricted',
      'astrology_details', 'restricted',
      'gallery', 'restricted',
      'contact', 'restricted'
    )
  )),
  p.template_id,
  p.theme_color,
  p.sun_sign,
  p.expires_at,
  coalesce(p.published_at, now())
from public.portfolios p
where p.is_published = true
  and p.share_token is not null
  and p.published_data is not null
on conflict (portfolio_id) do update
set
  share_token = excluded.share_token,
  data = excluded.data,
  template_id = excluded.template_id,
  theme_color = excluded.theme_color,
  sun_sign = excluded.sun_sign,
  expires_at = excluded.expires_at,
  published_at = excluded.published_at;
