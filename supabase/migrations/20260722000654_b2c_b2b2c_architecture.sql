-- Nakshatra: B2C/B2B2C architecture foundation
--
-- Goal: keep the current one-link biodata app working while adding the
-- primitives needed for frictionless viewing, controlled reveal, broker
-- attribution, marketplace leads, and premium services.

create extension if not exists "pgcrypto";

-- --- Enums ---------------------------------------------------------------

do $$
begin
  create type public.user_role_hint as enum ('candidate', 'parent', 'broker', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.organization_type as enum ('family', 'matchmaker_agency', 'platform');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.organization_member_role as enum ('owner', 'admin', 'editor', 'viewer', 'broker_agent');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('invited', 'active', 'suspended', 'removed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.candidate_source as enum ('self_signup', 'broker_invite', 'marketplace_claim', 'admin_created');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.candidate_status as enum ('draft', 'active', 'paused', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.portfolio_privacy_mode as enum ('open', 'progressive', 'private');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.portfolio_version_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.visibility_level as enum ('public', 'blurred', 'interest_required', 'approved_only', 'owner_only', 'hidden');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.media_type as enum ('hero', 'gallery', 'family', 'horoscope', 'document', 'verification');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.link_channel as enum ('whatsapp', 'email', 'manual', 'marketplace', 'social', 'other');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.interest_status as enum ('new', 'pending_review', 'approved', 'rejected', 'revealed', 'closed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.attribution_status as enum ('original', 'duplicate_same_broker', 'conflict_different_broker', 'unattributed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.verification_type as enum ('identity', 'education', 'immigration', 'employment');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.verification_status as enum ('pending', 'verified', 'failed', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.marketplace_listing_status as enum ('open', 'claimed', 'closed', 'paused');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.lead_claim_status as enum ('requested', 'approved', 'rejected', 'paid', 'assigned', 'withdrawn');
exception when duplicate_object then null;
end $$;

-- --- Identity and ownership --------------------------------------------

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  role_hint public.user_role_hint,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  type public.organization_type not null,
  name text not null,
  slug text unique,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_member_role not null default 'viewer',
  status public.member_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.matchmaker_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique not null references public.organizations(id) on delete cascade,
  display_name text not null,
  slug text unique,
  bio text,
  service_regions text[] not null default '{}',
  verification_status public.verification_status not null default 'pending',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- Candidate source of truth -----------------------------------------

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  primary_owner_user_id uuid references auth.users(id) on delete set null,
  current_organization_id uuid references public.organizations(id) on delete set null,
  display_name text not null,
  legal_name text,
  gender text,
  birth_date date,
  current_city text,
  current_region text,
  current_country text,
  source public.candidate_source not null default 'self_signup',
  status public.candidate_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broker_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  matchmaker_profile_id uuid references public.matchmaker_profiles(id) on delete set null,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  relationship_status text not null default 'active',
  introduced_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, candidate_id)
);

create table if not exists public.candidate_personal_details (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  preferred_name text,
  marital_status text,
  height_text text,
  complexion text,
  birthplace text,
  immigration_status text,
  relocation_preference text,
  about text,
  values_statement text,
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_astrology_details (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  birth_time time,
  birth_timezone text,
  birth_place text,
  rashi text,
  nakshatra text,
  pada text,
  lagnam text,
  gothram text,
  maternal_gothram text,
  manglik_status text,
  chart_payload jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_family_members (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  relationship text not null,
  name text,
  occupation text,
  business_name text,
  location text,
  marital_status text,
  visibility public.visibility_level not null default 'public',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_education_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  institution text,
  degree text,
  field_of_study text,
  location text,
  start_year int,
  end_year int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_career_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  company text,
  title text,
  industry text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_lifestyle_details (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  diet text,
  smoking text,
  drinking text,
  languages text[] not null default '{}',
  hobbies text[] not null default '{}',
  music text,
  lifestyle_payload jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_partner_preferences (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  age_min int,
  age_max int,
  height_min_text text,
  height_max_text text,
  marital_status text,
  community text,
  location_preference text,
  narrative text,
  preferences_payload jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- --- Extend existing portfolio table without breaking current app --------

alter table public.portfolios
  add column if not exists candidate_id uuid references public.candidates(id) on delete set null,
  add column if not exists owner_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists public_slug text,
  add column if not exists privacy_mode public.portfolio_privacy_mode not null default 'progressive',
  add column if not exists visibility_settings jsonb not null default '{}';

create unique index if not exists idx_portfolios_candidate_id
  on public.portfolios(candidate_id)
  where candidate_id is not null;

create unique index if not exists idx_portfolios_public_slug
  on public.portfolios(public_slug)
  where public_slug is not null;

create index if not exists idx_portfolios_owner_organization_id
  on public.portfolios(owner_organization_id)
  where owner_organization_id is not null;

create table if not exists public.portfolio_versions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  version_number int not null,
  status public.portfolio_version_status not null default 'draft',
  draft_data jsonb not null default '{}',
  published_data jsonb,
  created_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, version_number)
);

create table if not exists public.portfolio_sections (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  version_id uuid references public.portfolio_versions(id) on delete cascade,
  section_key text not null,
  title text,
  content jsonb not null default '{}',
  visibility public.visibility_level not null default 'public',
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, version_id, section_key)
);

create table if not exists public.portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  media_type public.media_type not null,
  storage_path text not null,
  thumbnail_path text,
  public_url text,
  alt_text text,
  visibility public.visibility_level not null default 'public',
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visibility_rules (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  section_key text not null,
  visibility public.visibility_level not null default 'public',
  blurred_teaser text,
  requires_interest boolean not null default false,
  requires_owner_approval boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, section_key)
);

-- --- Frictionless share links and silent tracking ------------------------

create table if not exists public.portfolio_links (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(12), 'hex'),
  label text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  matchmaker_profile_id uuid references public.matchmaker_profiles(id) on delete set null,
  channel public.link_channel not null default 'manual',
  campaign_label text,
  is_active boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_links_portfolio_id
  on public.portfolio_links(portfolio_id);

create index if not exists idx_portfolio_links_active_token
  on public.portfolio_links(token)
  where is_active = true and revoked_at is null;

create table if not exists public.viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  portfolio_link_id uuid references public.portfolio_links(id) on delete set null,
  anonymous_viewer_id text,
  ip_hash text,
  user_agent_hash text,
  referrer text,
  country text,
  region text,
  city text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_viewer_sessions_portfolio_id
  on public.viewer_sessions(portfolio_id, started_at desc);

create index if not exists idx_viewer_sessions_portfolio_link_id
  on public.viewer_sessions(portfolio_link_id, started_at desc)
  where portfolio_link_id is not null;

create table if not exists public.portfolio_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.viewer_sessions(id) on delete set null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  portfolio_link_id uuid references public.portfolio_links(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_portfolio_events_portfolio_id
  on public.portfolio_events(portfolio_id, created_at desc);

create index if not exists idx_portfolio_events_event_type
  on public.portfolio_events(event_type, created_at desc);

-- --- Express interest, attribution, and controlled reveal ----------------

create table if not exists public.interest_requests (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  portfolio_link_id uuid references public.portfolio_links(id) on delete set null,
  viewer_session_id uuid references public.viewer_sessions(id) on delete set null,
  viewer_name text,
  viewer_phone text,
  viewer_email text,
  viewer_family_context text,
  message text,
  prospect_key_hash text,
  referring_organization_id uuid references public.organizations(id) on delete set null,
  referring_matchmaker_profile_id uuid references public.matchmaker_profiles(id) on delete set null,
  status public.interest_status not null default 'new',
  attribution_status public.attribution_status not null default 'unattributed',
  duplicate_of uuid references public.interest_requests(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interest_requests_portfolio_id
  on public.interest_requests(portfolio_id, created_at desc);

create index if not exists idx_interest_requests_candidate_prospect
  on public.interest_requests(candidate_id, prospect_key_hash)
  where prospect_key_hash is not null;

create table if not exists public.attribution_records (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  interest_request_id uuid unique not null references public.interest_requests(id) on delete cascade,
  winning_organization_id uuid references public.organizations(id) on delete set null,
  winning_matchmaker_profile_id uuid references public.matchmaker_profiles(id) on delete set null,
  winning_portfolio_link_id uuid references public.portfolio_links(id) on delete set null,
  prospect_key_hash text,
  conflict_detected boolean not null default false,
  conflict_reason text,
  locked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create unique index if not exists idx_attribution_records_candidate_prospect
  on public.attribution_records(candidate_id, prospect_key_hash)
  where prospect_key_hash is not null;

create table if not exists public.reveal_grants (
  id uuid primary key default gen_random_uuid(),
  interest_request_id uuid not null references public.interest_requests(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  viewer_session_id uuid references public.viewer_sessions(id) on delete set null,
  granted_sections text[] not null default '{}',
  granted_media_ids uuid[] not null default '{}',
  expires_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reveal_grants_interest_request_id
  on public.reveal_grants(interest_request_id);

-- --- Monetization and premium services ----------------------------------

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  audience text not null default 'b2c',
  price_cents int,
  currency text not null default 'usd',
  billing_interval text,
  features jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or organization_id is not null)
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  feature_key text not null,
  feature_value jsonb not null default 'true',
  source text not null default 'manual',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or organization_id is not null)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  candidate_id uuid references public.candidates(id) on delete set null,
  product_code text not null,
  amount_cents int not null,
  currency text not null default 'usd',
  status public.payment_status not null default 'pending',
  provider text,
  provider_payment_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  type public.verification_type not null,
  provider text,
  status public.verification_status not null default 'pending',
  badge_label text,
  evidence_payload jsonb not null default '{}',
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compatibility_reports (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  interest_request_id uuid references public.interest_requests(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  partner_birth_details jsonb not null default '{}',
  report_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- --- B2B2C lead marketplace ---------------------------------------------

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  anonymized_snapshot jsonb not null default '{}',
  visibility_region text,
  status public.marketplace_listing_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_claims (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  matchmaker_profile_id uuid references public.matchmaker_profiles(id) on delete set null,
  claimed_by uuid references auth.users(id) on delete set null,
  status public.lead_claim_status not null default 'requested',
  claim_fee_purchase_id uuid references public.purchases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, organization_id)
);

-- --- Helper functions for RLS -------------------------------------------

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.has_organization_role(
  p_organization_id uuid,
  p_roles public.organization_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role = any(p_roles)
  );
$$;

create or replace function public.owns_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = p_candidate_id
      and (
        c.primary_owner_user_id = auth.uid()
        or c.created_by = auth.uid()
        or (
          c.current_organization_id is not null
          and public.is_organization_member(c.current_organization_id)
        )
      )
  );
$$;

create or replace function public.can_manage_portfolio(p_portfolio_id uuid)
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
      and (
        p.user_id = auth.uid()
        or (
          p.candidate_id is not null
          and public.owns_candidate(p.candidate_id)
        )
        or (
          p.owner_organization_id is not null
          and public.is_organization_member(p.owner_organization_id)
        )
      )
  );
$$;

create or replace function public.is_published_portfolio(p_portfolio_id uuid)
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
      and p.is_published = true
      and (p.expires_at is null or p.expires_at > now())
  );
$$;

-- --- RLS -----------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.matchmaker_profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.broker_clients enable row level security;
alter table public.candidate_personal_details enable row level security;
alter table public.candidate_astrology_details enable row level security;
alter table public.candidate_family_members enable row level security;
alter table public.candidate_education_entries enable row level security;
alter table public.candidate_career_entries enable row level security;
alter table public.candidate_lifestyle_details enable row level security;
alter table public.candidate_partner_preferences enable row level security;
alter table public.portfolio_versions enable row level security;
alter table public.portfolio_sections enable row level security;
alter table public.portfolio_media enable row level security;
alter table public.visibility_rules enable row level security;
alter table public.portfolio_links enable row level security;
alter table public.viewer_sessions enable row level security;
alter table public.portfolio_events enable row level security;
alter table public.interest_requests enable row level security;
alter table public.attribution_records enable row level security;
alter table public.reveal_grants enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchases enable row level security;
alter table public.verifications enable row level security;
alter table public.compatibility_reports enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.lead_claims enable row level security;

create policy "Users can manage own profile"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Organization creators can create organizations"
  on public.organizations
  for insert
  with check (auth.uid() = created_by);

create policy "Organization members can read organizations"
  on public.organizations
  for select
  using (public.is_organization_member(id));

create policy "Organization admins can update organizations"
  on public.organizations
  for update
  using (public.has_organization_role(id, array['owner', 'admin']::public.organization_member_role[]))
  with check (public.has_organization_role(id, array['owner', 'admin']::public.organization_member_role[]));

create policy "Organization members can read membership"
  on public.organization_members
  for select
  using (public.is_organization_member(organization_id) or auth.uid() = user_id);

create policy "Organization admins can manage membership"
  on public.organization_members
  for all
  using (public.has_organization_role(organization_id, array['owner', 'admin']::public.organization_member_role[]))
  with check (public.has_organization_role(organization_id, array['owner', 'admin']::public.organization_member_role[]));

create policy "Organization members can manage matchmaker profile"
  on public.matchmaker_profiles
  for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "Candidate owners can manage candidates"
  on public.candidates
  for all
  using (public.owns_candidate(id))
  with check (
    primary_owner_user_id = auth.uid()
    or created_by = auth.uid()
    or (
      current_organization_id is not null
      and public.is_organization_member(current_organization_id)
    )
  );

create policy "Organization members can manage candidate portfolios"
  on public.portfolios
  for all
  using (
    (candidate_id is not null and public.owns_candidate(candidate_id))
    or (owner_organization_id is not null and public.is_organization_member(owner_organization_id))
  )
  with check (
    (candidate_id is not null and public.owns_candidate(candidate_id))
    or (owner_organization_id is not null and public.is_organization_member(owner_organization_id))
  );

create policy "Broker clients visible to org members"
  on public.broker_clients
  for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "Candidate personal details manageable by candidate owners"
  on public.candidate_personal_details
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Candidate astrology details manageable by candidate owners"
  on public.candidate_astrology_details
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Candidate family members manageable by candidate owners"
  on public.candidate_family_members
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Candidate education manageable by candidate owners"
  on public.candidate_education_entries
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Candidate career manageable by candidate owners"
  on public.candidate_career_entries
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Candidate lifestyle manageable by candidate owners"
  on public.candidate_lifestyle_details
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Candidate preferences manageable by candidate owners"
  on public.candidate_partner_preferences
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Portfolio versions manageable by portfolio managers"
  on public.portfolio_versions
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Portfolio sections manageable by portfolio managers"
  on public.portfolio_sections
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Public can read published public or blurred sections"
  on public.portfolio_sections
  for select
  using (
    public.is_published_portfolio(portfolio_id)
    and visibility in ('public', 'blurred')
    and is_enabled = true
  );

create policy "Portfolio media manageable by portfolio managers"
  on public.portfolio_media
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Public can read published public media"
  on public.portfolio_media
  for select
  using (
    public.is_published_portfolio(portfolio_id)
    and visibility = 'public'
  );

create policy "Visibility rules manageable by portfolio managers"
  on public.visibility_rules
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Public can resolve active portfolio links"
  on public.portfolio_links
  for select
  using (
    is_active = true
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  );

create policy "Portfolio links manageable by portfolio managers"
  on public.portfolio_links
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Anyone can create viewer sessions"
  on public.viewer_sessions
  for insert
  with check (true);

create policy "Portfolio managers can read viewer sessions"
  on public.viewer_sessions
  for select
  using (public.can_manage_portfolio(portfolio_id));

create policy "Anyone can create portfolio events"
  on public.portfolio_events
  for insert
  with check (true);

create policy "Portfolio managers can read portfolio events"
  on public.portfolio_events
  for select
  using (public.can_manage_portfolio(portfolio_id));

create policy "Anyone can express interest"
  on public.interest_requests
  for insert
  with check (true);

create policy "Portfolio managers can manage interest requests"
  on public.interest_requests
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Portfolio managers can read attribution records"
  on public.attribution_records
  for select
  using (
    exists (
      select 1
      from public.interest_requests ir
      where ir.id = attribution_records.interest_request_id
        and public.can_manage_portfolio(ir.portfolio_id)
    )
  );

create policy "Portfolio managers can manage attribution records"
  on public.attribution_records
  for all
  using (
    exists (
      select 1
      from public.interest_requests ir
      where ir.id = attribution_records.interest_request_id
        and public.can_manage_portfolio(ir.portfolio_id)
    )
  )
  with check (
    exists (
      select 1
      from public.interest_requests ir
      where ir.id = attribution_records.interest_request_id
        and public.can_manage_portfolio(ir.portfolio_id)
    )
  );

create policy "Portfolio managers can manage reveal grants"
  on public.reveal_grants
  for all
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Anyone can read active plans"
  on public.plans
  for select
  using (is_active = true);

create policy "Users can read own subscriptions"
  on public.subscriptions
  for select
  using (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_organization_member(organization_id)
    )
  );

create policy "Users can read own entitlements"
  on public.entitlements
  for select
  using (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_organization_member(organization_id)
    )
  );

create policy "Users can read own purchases"
  on public.purchases
  for select
  using (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_organization_member(organization_id)
    )
    or (
      candidate_id is not null
      and public.owns_candidate(candidate_id)
    )
  );

create policy "Candidate owners can read verifications"
  on public.verifications
  for select
  using (public.owns_candidate(candidate_id));

create policy "Candidate owners can read compatibility reports"
  on public.compatibility_reports
  for select
  using (public.owns_candidate(candidate_id));

create policy "Candidate owners can manage marketplace listings"
  on public.marketplace_listings
  for all
  using (public.owns_candidate(candidate_id))
  with check (public.owns_candidate(candidate_id));

create policy "Matchmakers can read open marketplace listings"
  on public.marketplace_listings
  for select
  using (
    status = 'open'
    and exists (
      select 1
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = auth.uid()
        and om.status = 'active'
        and o.type = 'matchmaker_agency'
    )
  );

create policy "Matchmaker orgs can manage lead claims"
  on public.lead_claims
  for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

-- --- Updated-at triggers ------------------------------------------------

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.update_updated_at();

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_updated_at();

create trigger organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.update_updated_at();

create trigger matchmaker_profiles_updated_at
  before update on public.matchmaker_profiles
  for each row execute function public.update_updated_at();

create trigger candidates_updated_at
  before update on public.candidates
  for each row execute function public.update_updated_at();

create trigger broker_clients_updated_at
  before update on public.broker_clients
  for each row execute function public.update_updated_at();

create trigger candidate_personal_details_updated_at
  before update on public.candidate_personal_details
  for each row execute function public.update_updated_at();

create trigger candidate_astrology_details_updated_at
  before update on public.candidate_astrology_details
  for each row execute function public.update_updated_at();

create trigger candidate_family_members_updated_at
  before update on public.candidate_family_members
  for each row execute function public.update_updated_at();

create trigger candidate_education_entries_updated_at
  before update on public.candidate_education_entries
  for each row execute function public.update_updated_at();

create trigger candidate_career_entries_updated_at
  before update on public.candidate_career_entries
  for each row execute function public.update_updated_at();

create trigger candidate_lifestyle_details_updated_at
  before update on public.candidate_lifestyle_details
  for each row execute function public.update_updated_at();

create trigger candidate_partner_preferences_updated_at
  before update on public.candidate_partner_preferences
  for each row execute function public.update_updated_at();

create trigger portfolio_versions_updated_at
  before update on public.portfolio_versions
  for each row execute function public.update_updated_at();

create trigger portfolio_sections_updated_at
  before update on public.portfolio_sections
  for each row execute function public.update_updated_at();

create trigger portfolio_media_updated_at
  before update on public.portfolio_media
  for each row execute function public.update_updated_at();

create trigger visibility_rules_updated_at
  before update on public.visibility_rules
  for each row execute function public.update_updated_at();

create trigger portfolio_links_updated_at
  before update on public.portfolio_links
  for each row execute function public.update_updated_at();

create trigger interest_requests_updated_at
  before update on public.interest_requests
  for each row execute function public.update_updated_at();

create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.update_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();

create trigger purchases_updated_at
  before update on public.purchases
  for each row execute function public.update_updated_at();

create trigger verifications_updated_at
  before update on public.verifications
  for each row execute function public.update_updated_at();

create trigger marketplace_listings_updated_at
  before update on public.marketplace_listings
  for each row execute function public.update_updated_at();

create trigger lead_claims_updated_at
  before update on public.lead_claims
  for each row execute function public.update_updated_at();

-- --- Handoff notes -------------------------------------------------------

comment on table public.candidates is
  'Candidate source of truth. A candidate may be self-managed, family-managed, or represented by a matchmaker organization.';

comment on table public.portfolio_links is
  'Tracked share links. These are the silent attribution layer for WhatsApp sharing and broker commission dispute resolution.';

comment on table public.interest_requests is
  'Frictionless prospect handshakes. Public viewers express interest here instead of seeing raw contact details by default.';

comment on table public.reveal_grants is
  'Controlled disclosure grants for contact details, private gallery, horoscope, and other sensitive sections.';
