-- Nakshatra: Wedding Biodata App — Initial Schema

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Portfolios table (one per user)
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  share_token text unique,

  draft_data jsonb not null default '{}',
  published_data jsonb,

  template_id int not null default 1,
  theme_color text,
  sun_sign text,

  is_published boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  last_renewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- View tracking
create table public.portfolio_views (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

-- Index for public link lookup
create index idx_portfolios_share_token on public.portfolios(share_token) where share_token is not null;

-- Index for view counts
create index idx_portfolio_views_portfolio_id on public.portfolio_views(portfolio_id);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute function public.update_updated_at();

-- RLS Policies

alter table public.portfolios enable row level security;
alter table public.portfolio_views enable row level security;

-- Owner can do everything with their own portfolio
create policy "Users can manage own portfolio"
  on public.portfolios
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read published, non-expired portfolios (public link)
create policy "Public can view published portfolios"
  on public.portfolios
  for select
  using (
    is_published = true
    and share_token is not null
    and (expires_at is null or expires_at > now())
  );

-- Anyone can insert views (for tracking)
create policy "Anyone can record a view"
  on public.portfolio_views
  for insert
  with check (true);

-- Owner can read views of their portfolio
create policy "Owner can read own portfolio views"
  on public.portfolio_views
  for select
  using (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

-- Storage bucket for photos
-- Note: Run this via Supabase dashboard or CLI, not via migration
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
