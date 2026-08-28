-- Phase 4: identity/session integrity, privacy lifecycle, and least-privilege B2B roles.

-- Existing row timestamp triggers call this shared function. Pin its lookup path
-- before adding new privileged database surfaces in this migration.
alter function public.update_updated_at() set search_path = '';

-- Authenticated requests can use this predicate to reject access tokens whose
-- backing session has been revoked. Access tokens remain cryptographically
-- valid until expiry, so signature validation alone is insufficient here.
create or replace function public.is_current_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions session_record
    where session_record.user_id = auth.uid()
      and session_record.id::text = coalesce(auth.jwt() ->> 'session_id', '')
  );
$$;

revoke all on function public.is_current_session_active() from public, anon, authenticated;
grant execute on function public.is_current_session_active() to authenticated;

-- Organization helpers use fixed paths and make the role matrix explicit.
create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members member_record
    where member_record.organization_id = p_organization_id
      and member_record.user_id = auth.uid()
      and member_record.status = 'active'
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
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members member_record
    where member_record.organization_id = p_organization_id
      and member_record.user_id = auth.uid()
      and member_record.status = 'active'
      and member_record.role = any(p_roles)
  );
$$;

create or replace function public.can_manage_organization_member(
  p_organization_id uuid,
  p_target_role public.organization_member_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_organization_role(
      p_organization_id,
      array['owner']::public.organization_member_role[]
    )
    or (
      p_target_role <> 'owner'
      and public.has_organization_role(
        p_organization_id,
        array['admin']::public.organization_member_role[]
      )
    );
$$;

create or replace function public.owns_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates candidate
    where candidate.id = p_candidate_id
      and (
        candidate.primary_owner_user_id = auth.uid()
        or candidate.created_by = auth.uid()
        or (
          candidate.current_organization_id is not null
          and public.has_organization_role(
            candidate.current_organization_id,
            array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
          )
        )
      )
  );
$$;

create or replace function public.can_manage_portfolio(p_portfolio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolios portfolio
    where portfolio.id = p_portfolio_id
      and (
        portfolio.user_id = auth.uid()
        or (
          portfolio.candidate_id is not null
          and public.owns_candidate(portfolio.candidate_id)
        )
        or (
          portfolio.owner_organization_id is not null
          and public.has_organization_role(
            portfolio.owner_organization_id,
            array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
          )
        )
      )
  );
$$;

revoke all on function public.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function public.has_organization_role(uuid, public.organization_member_role[]) from public, anon, authenticated;
revoke all on function public.can_manage_organization_member(uuid, public.organization_member_role) from public, anon, authenticated;
revoke all on function public.owns_candidate(uuid) from public, anon, authenticated;
revoke all on function public.can_manage_portfolio(uuid) from public, anon, authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.organization_member_role[]) to authenticated;
grant execute on function public.can_manage_organization_member(uuid, public.organization_member_role) to authenticated;
grant execute on function public.owns_candidate(uuid) to authenticated;
grant execute on function public.can_manage_portfolio(uuid) to authenticated;

-- Object privileges open only the operations that have an RLS contract below.
-- RPC-only analytics, request decisions, grants, and destructive maintenance
-- intentionally remain unavailable for direct writes.
grant select, update, delete on table public.organizations to authenticated;
grant select, insert, update, delete on table
  public.user_profiles,
  public.organization_members,
  public.matchmaker_profiles,
  public.broker_clients,
  public.portfolio_versions,
  public.portfolio_sections,
  public.portfolio_links,
  public.attribution_records,
  public.marketplace_listings,
  public.lead_claims
to authenticated;
grant select on table
  public.plans,
  public.subscriptions,
  public.entitlements,
  public.purchases,
  public.verifications,
  public.compatibility_reports
to authenticated;
grant select on table public.plans to anon;

-- Prevent direct Data API inserts from creating an internally published row
-- without the same public-hero requirement enforced on later updates.
create or replace function app_private.enforce_publication_media_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_validate boolean := false;
  public_hero_count integer;
begin
  if new.is_published = true and tg_op = 'INSERT' then
    should_validate := true;
  elsif new.is_published = true and old.is_published is distinct from true then
    should_validate := true;
  end if;

  if should_validate then
    select pg_catalog.count(*) into public_hero_count
    from public.portfolio_media media
    where media.portfolio_id = new.id
      and media.media_type = 'hero'
      and media.visibility = 'public';
    if public_hero_count <> 1 then
      raise exception 'publishing requires exactly one public hero photo' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_publication_media_contract() from public;
drop trigger if exists enforce_publication_media_contract on public.portfolios;
create trigger enforce_publication_media_contract
  before insert or update of is_published on public.portfolios
  for each row execute function app_private.enforce_publication_media_contract();

-- Creating an organization and its first owner is one transaction. Direct
-- inserts are removed so an organization can never be created ownerless.
create or replace function public.create_organization_with_owner(
  p_type public.organization_type,
  p_name text,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  organization_record public.organizations%rowtype;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 2 and 120 then
    raise exception 'invalid organization name' using errcode = '22023';
  end if;
  if p_slug is not null and p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid organization slug' using errcode = '22023';
  end if;

  insert into public.organizations (type, name, slug, created_by)
  values (p_type, pg_catalog.btrim(p_name), nullif(pg_catalog.btrim(p_slug), ''), actor_id)
  returning * into organization_record;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (organization_record.id, actor_id, 'owner', 'active');

  return pg_catalog.jsonb_build_object(
    'id', organization_record.id,
    'name', organization_record.name,
    'type', organization_record.type,
    'role', 'owner'
  );
end;
$$;

revoke all on function public.create_organization_with_owner(public.organization_type, text, text) from public, anon, authenticated;
grant execute on function public.create_organization_with_owner(public.organization_type, text, text) to authenticated;
revoke insert on table public.organizations from authenticated;
drop policy if exists "Organization creators can create organizations" on public.organizations;

create or replace function app_private.enforce_organization_owner_invariant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_to_check uuid := old.organization_id;
begin
  if exists (
    select 1
    from public.organizations organization_record
    where organization_record.id = organization_id_to_check
  )
    and not exists (
      select 1
      from public.organization_members other_owner
      where other_owner.organization_id = organization_id_to_check
        and other_owner.role = 'owner'
        and other_owner.status = 'active'
    ) then
    raise exception 'organization requires an active owner' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function app_private.enforce_organization_owner_invariant() from public;
drop trigger if exists enforce_organization_owner_invariant on public.organization_members;
create constraint trigger enforce_organization_owner_invariant
  after update or delete on public.organization_members
  deferrable initially deferred
  for each row execute function app_private.enforce_organization_owner_invariant();

drop policy if exists "Organization admins can manage membership" on public.organization_members;
create policy "Organization owners and admins can add membership"
  on public.organization_members for insert to authenticated
  with check (public.can_manage_organization_member(organization_id, role));
create policy "Organization owners and admins can update membership"
  on public.organization_members for update to authenticated
  using (public.can_manage_organization_member(organization_id, role))
  with check (public.can_manage_organization_member(organization_id, role));
create policy "Organization owners and admins can remove membership"
  on public.organization_members for delete to authenticated
  using (public.can_manage_organization_member(organization_id, role));

drop policy if exists "Organization admins can update organizations" on public.organizations;
create policy "Organization owners and admins can update organizations"
  on public.organizations for update to authenticated
  using (public.has_organization_role(id, array['owner', 'admin']::public.organization_member_role[]))
  with check (public.has_organization_role(id, array['owner', 'admin']::public.organization_member_role[]));
create policy "Organization owners can delete organizations"
  on public.organizations for delete to authenticated
  using (public.has_organization_role(id, array['owner']::public.organization_member_role[]));

drop policy if exists "Candidate owners can read candidates" on public.candidates;
drop policy if exists "Candidate owners can create candidates" on public.candidates;
drop policy if exists "Candidate owners can update candidates" on public.candidates;
drop policy if exists "Candidate owners can delete candidates" on public.candidates;
create policy "Candidate owners and operators can read candidates"
  on public.candidates for select to authenticated
  using (
    primary_owner_user_id = auth.uid()
    or created_by = auth.uid()
    or (
      current_organization_id is not null
      and public.has_organization_role(
        current_organization_id,
        array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
      )
    )
  );
create policy "Candidate owners and operators can create candidates"
  on public.candidates for insert to authenticated
  with check (
    primary_owner_user_id = auth.uid()
    or created_by = auth.uid()
    or (
      current_organization_id is not null
      and public.has_organization_role(
        current_organization_id,
        array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
      )
    )
  );
create policy "Candidate owners and operators can update candidates"
  on public.candidates for update to authenticated
  using (public.owns_candidate(id))
  with check (
    primary_owner_user_id = auth.uid()
    or created_by = auth.uid()
    or (
      current_organization_id is not null
      and public.has_organization_role(
        current_organization_id,
        array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
      )
    )
  );
create policy "Candidate owners and operators can delete candidates"
  on public.candidates for delete to authenticated
  using (public.owns_candidate(id));

drop policy if exists "Organization members can manage candidate portfolios" on public.portfolios;
create policy "Organization operators can read candidate portfolios"
  on public.portfolios for select to authenticated
  using (
    (candidate_id is not null and exists (
      select 1
      from public.candidates candidate
      where candidate.id = portfolios.candidate_id
        and candidate.current_organization_id is not null
        and public.has_organization_role(
          candidate.current_organization_id,
          array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
        )
    ))
    or (
      owner_organization_id is not null
      and public.has_organization_role(
        owner_organization_id,
        array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
      )
    )
  );
create policy "Organization operators can create candidate portfolios"
  on public.portfolios for insert to authenticated
  with check (
    (candidate_id is not null and public.owns_candidate(candidate_id))
    or (
      owner_organization_id is not null
      and public.has_organization_role(
        owner_organization_id,
        array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
      )
    )
  );
create policy "Organization operators can update candidate portfolios"
  on public.portfolios for update to authenticated
  using (public.can_manage_portfolio(id))
  with check (
    (candidate_id is not null and public.owns_candidate(candidate_id))
    or (
      owner_organization_id is not null
      and public.has_organization_role(
        owner_organization_id,
        array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
      )
    )
  );
create policy "Organization operators can delete candidate portfolios"
  on public.portfolios for delete to authenticated
  using (public.can_manage_portfolio(id));

drop policy if exists "Organization members can manage matchmaker profile" on public.matchmaker_profiles;
create policy "Organization members can read matchmaker profile"
  on public.matchmaker_profiles for select to authenticated
  using (public.is_organization_member(organization_id));
create policy "Organization operators can create matchmaker profile"
  on public.matchmaker_profiles for insert to authenticated
  with check (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'broker_agent']::public.organization_member_role[]
  ));
create policy "Organization operators can update matchmaker profile"
  on public.matchmaker_profiles for update to authenticated
  using (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'broker_agent']::public.organization_member_role[]
  ))
  with check (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'broker_agent']::public.organization_member_role[]
  ));
create policy "Organization administrators can delete matchmaker profile"
  on public.matchmaker_profiles for delete to authenticated
  using (public.has_organization_role(
    organization_id,
    array['owner', 'admin']::public.organization_member_role[]
  ));

drop policy if exists "Broker clients visible to org members" on public.broker_clients;
create policy "Organization operators can manage broker clients"
  on public.broker_clients for all to authenticated
  using (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
  ))
  with check (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'editor', 'broker_agent']::public.organization_member_role[]
  ));

drop policy if exists "Matchmaker orgs can manage lead claims" on public.lead_claims;
create policy "Matchmaker operators can manage lead claims"
  on public.lead_claims for all to authenticated
  using (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'broker_agent']::public.organization_member_role[]
  ))
  with check (public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'broker_agent']::public.organization_member_role[]
  ));

drop policy if exists "Matchmakers can read open marketplace listings" on public.marketplace_listings;
create policy "Matchmaker operators can read open marketplace listings"
  on public.marketplace_listings for select to authenticated
  using (
    status = 'open'
    and exists (
      select 1
      from public.organization_members member_record
      join public.organizations organization_record
        on organization_record.id = member_record.organization_id
      where member_record.user_id = auth.uid()
        and member_record.status = 'active'
        and member_record.role in ('owner', 'admin', 'broker_agent')
        and organization_record.type = 'matchmaker_agency'
    )
  );

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users and billing administrators can read subscriptions"
  on public.subscriptions for select to authenticated
  using (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.has_organization_role(
        organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      )
    )
  );

drop policy if exists "Users can read own entitlements" on public.entitlements;
create policy "Users and billing administrators can read entitlements"
  on public.entitlements for select to authenticated
  using (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.has_organization_role(
        organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      )
    )
  );

drop policy if exists "Users can read own purchases" on public.purchases;
create policy "Users and billing administrators can read purchases"
  on public.purchases for select to authenticated
  using (
    user_id = auth.uid()
    or (
      organization_id is not null
      and public.has_organization_role(
        organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      )
    )
    or (candidate_id is not null and public.owns_candidate(candidate_id))
  );

-- Account deletion is intentionally asynchronous. The request immediately
-- revokes public and approved access; isolated maintenance tooling removes
-- Storage objects before deleting the Auth user.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'canceled')),
  requested_at timestamptz not null default pg_catalog.now(),
  scheduled_for timestamptz not null default (pg_catalog.now() + interval '24 hours'),
  claimed_at timestamptz,
  completed_at timestamptz,
  retention_until timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.account_deletion_requests enable row level security;
revoke all on table public.account_deletion_requests from public, anon, authenticated;
grant select on table public.account_deletion_requests to authenticated;
create policy "Users can read own deletion request"
  on public.account_deletion_requests for select to authenticated
  using (user_id = auth.uid());

create index if not exists idx_account_deletion_requests_due
  on public.account_deletion_requests(status, scheduled_for)
  where status in ('pending', 'failed');

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  deletion_record public.account_deletion_requests%rowtype;
  blocked_organizations integer;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select pg_catalog.count(*)::integer into blocked_organizations
  from public.organization_members owner_membership
  where owner_membership.user_id = actor_id
    and owner_membership.role = 'owner'
    and owner_membership.status = 'active'
    and exists (
      select 1 from public.organization_members other_member
      where other_member.organization_id = owner_membership.organization_id
        and other_member.user_id <> actor_id
        and other_member.status = 'active'
    )
    and not exists (
      select 1 from public.organization_members other_owner
      where other_owner.organization_id = owner_membership.organization_id
        and other_owner.user_id <> actor_id
        and other_owner.role = 'owner'
        and other_owner.status = 'active'
    );

  if blocked_organizations > 0 then
    return pg_catalog.jsonb_build_object(
      'status', 'ownership_transfer_required',
      'organizationCount', blocked_organizations
    );
  end if;

  insert into public.account_deletion_requests (
    user_id, subject_hash, status, requested_at, scheduled_for,
    claimed_at, completed_at, retention_until, attempts, last_error_code
  ) values (
    actor_id,
    pg_catalog.encode(extensions.digest(actor_id::text, 'sha256'), 'hex'),
    'pending', pg_catalog.now(), pg_catalog.now() + interval '24 hours',
    null, null, null, 0, null
  )
  on conflict (user_id) do update set
    status = 'pending',
    requested_at = pg_catalog.now(),
    scheduled_for = pg_catalog.now() + interval '24 hours',
    claimed_at = null,
    completed_at = null,
    retention_until = null,
    attempts = 0,
    last_error_code = null,
    updated_at = pg_catalog.now()
  returning * into deletion_record;

  update public.portfolios
  set is_published = false, published_at = null
  where user_id = actor_id;

  update public.public_portfolio_snapshots snapshot
  set is_active = false, updated_at = pg_catalog.now()
  where exists (
    select 1 from public.portfolios portfolio
    where portfolio.id = snapshot.portfolio_id
      and portfolio.user_id = actor_id
  );

  update public.reveal_grants grant_record
  set revoked_at = coalesce(grant_record.revoked_at, pg_catalog.now()),
      revocation_reason = coalesce(grant_record.revocation_reason, 'account_deletion_requested')
  where grant_record.revoked_at is null
    and exists (
      select 1 from public.portfolios portfolio
      where portfolio.id = grant_record.portfolio_id
        and portfolio.user_id = actor_id
    );

  update public.interest_requests request_record
  set status = 'closed', updated_at = pg_catalog.now()
  where request_record.status in ('new', 'pending_review', 'approved', 'revealed')
    and exists (
      select 1 from public.portfolios portfolio
      where portfolio.id = request_record.portfolio_id
        and portfolio.user_id = actor_id
    );

  delete from auth.sessions session_record
  where session_record.user_id = actor_id;

  return pg_catalog.jsonb_build_object(
    'status', deletion_record.status,
    'scheduledFor', deletion_record.scheduled_for
  );
end;
$$;

create or replace function public.cancel_account_deletion()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_deletion_requests
  set status = 'canceled', updated_at = pg_catalog.now()
  where user_id = auth.uid()
    and status in ('pending', 'failed');
  if not found then return 'not_cancelable'; end if;
  return 'canceled';
end;
$$;

revoke all on function public.request_account_deletion() from public, anon, authenticated;
revoke all on function public.cancel_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

create or replace function public.claim_account_deletion_batch(p_limit integer default 10)
returns table(request_id uuid, user_id uuid)
language sql
volatile
security definer
set search_path = ''
as $$
  update public.account_deletion_requests deletion_request
  set status = 'processing',
      claimed_at = pg_catalog.now(),
      attempts = deletion_request.attempts + 1,
      updated_at = pg_catalog.now()
  where deletion_request.id in (
    select due_request.id
    from public.account_deletion_requests due_request
    where due_request.status in ('pending', 'failed')
      and due_request.scheduled_for <= pg_catalog.now()
      and due_request.user_id is not null
    order by due_request.scheduled_for
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  returning deletion_request.id, deletion_request.user_id;
$$;

revoke all on function public.claim_account_deletion_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_account_deletion_batch(integer) to service_role;

-- Storage removal happens through the Storage API before this command. This
-- transaction then removes or anonymizes subject-owned records that use
-- SET NULL foreign keys and therefore would otherwise survive Auth deletion.
create or replace function public.prepare_account_deletion(
  p_request_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_candidates integer := 0;
  deleted_organizations integer := 0;
  anonymized_requests integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.account_deletion_requests deletion_request
    where deletion_request.id = p_request_id
      and deletion_request.user_id = p_user_id
      and deletion_request.status = 'processing'
  ) then
    raise exception 'deletion request is not processing' using errcode = '22023';
  end if;

  update public.interest_requests request_record
  set viewer_name = null,
      viewer_phone = null,
      viewer_email = null,
      viewer_family_context = null,
      message = null,
      requester_user_id = null,
      prospect_key_hash = null,
      metadata = '{}'::jsonb,
      updated_at = pg_catalog.now()
  where request_record.requester_user_id = p_user_id;
  get diagnostics anonymized_requests = row_count;

  delete from public.candidates candidate
  where candidate.current_organization_id is null
    and (
      candidate.primary_owner_user_id = p_user_id
      or candidate.created_by = p_user_id
    );
  get diagnostics deleted_candidates = row_count;

  delete from public.organizations organization_record
  where exists (
    select 1
    from public.organization_members actor_membership
    where actor_membership.organization_id = organization_record.id
      and actor_membership.user_id = p_user_id
      and actor_membership.role = 'owner'
      and actor_membership.status = 'active'
  )
  and not exists (
    select 1
    from public.organization_members other_member
    where other_member.organization_id = organization_record.id
      and other_member.user_id <> p_user_id
      and other_member.status = 'active'
  );
  get diagnostics deleted_organizations = row_count;

  return pg_catalog.jsonb_build_object(
    'candidatesDeleted', deleted_candidates,
    'organizationsDeleted', deleted_organizations,
    'requestsAnonymized', anonymized_requests
  );
end;
$$;

revoke all on function public.prepare_account_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid, uuid) to service_role;

-- A user export includes the requesting user's own records and direct-owned
-- portfolio/candidate data, but never another requester's submitted PII.
create or replace function public.export_my_account_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then null else pg_catalog.jsonb_build_object(
    'exportedAt', pg_catalog.now(),
    'profile', (
      select pg_catalog.to_jsonb(profile)
      from public.user_profiles profile
      where profile.user_id = auth.uid()
    ),
    'portfolios', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(portfolio) order by portfolio.created_at)
      from public.portfolios portfolio
      where portfolio.user_id = auth.uid()
    ), '[]'::jsonb),
    'candidates', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(candidate) order by candidate.created_at)
      from public.candidates candidate
      where candidate.primary_owner_user_id = auth.uid()
        or candidate.created_by = auth.uid()
    ), '[]'::jsonb),
    'mediaInventory', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(media) order by media.sort_order)
      from public.portfolio_media media
      join public.portfolios portfolio on portfolio.id = media.portfolio_id
      where portfolio.user_id = auth.uid()
    ), '[]'::jsonb),
    'horoscopeInventory', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(horoscope) order by horoscope.created_at)
      from public.portfolio_horoscopes horoscope
      join public.portfolios portfolio on portfolio.id = horoscope.portfolio_id
      where portfolio.user_id = auth.uid()
    ), '[]'::jsonb),
    'organizationMemberships', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'organizationId', organization_record.id,
        'name', organization_record.name,
        'type', organization_record.type,
        'role', member_record.role,
        'status', member_record.status
      ) order by organization_record.created_at)
      from public.organization_members member_record
      join public.organizations organization_record
        on organization_record.id = member_record.organization_id
      where member_record.user_id = auth.uid()
    ), '[]'::jsonb),
    'interestRequestsSubmitted', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(request_record) order by request_record.created_at)
      from public.interest_requests request_record
      where request_record.requester_user_id = auth.uid()
    ), '[]'::jsonb),
    'accessHistory', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(event_record) order by event_record.created_at)
      from public.access_audit_events event_record
      where event_record.actor_user_id = auth.uid()
        or event_record.subject_user_id = auth.uid()
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.export_my_account_data() from public, anon, authenticated;
grant execute on function public.export_my_account_data() to authenticated;

-- Fixed data-retention policy. Financial records and backups remain governed by
-- provider/legal policy and are not removed by this application routine.
create table if not exists app_private.data_retention_policies (
  data_class text primary key,
  retention_days integer not null check (retention_days > 0),
  action text not null check (action in ('delete', 'anonymize', 'provider_managed')),
  rationale text not null
);

insert into app_private.data_retention_policies (data_class, retention_days, action, rationale)
values
  ('api_rate_limits', 2, 'delete', 'Short-lived abuse-control counters'),
  ('viewer_sessions', 90, 'delete', 'Anonymous session analytics'),
  ('portfolio_analytics', 395, 'delete', 'Owner-facing annual trend window'),
  ('closed_interest_request_pii', 180, 'anonymize', 'Remove requester contact and family details'),
  ('access_audit_events', 730, 'delete', 'Security and dispute investigation window'),
  ('completed_deletion_receipts', 30, 'delete', 'Short operational retry and evidence window'),
  ('database_backups', 30, 'provider_managed', 'Hosting-provider backup retention target')
on conflict (data_class) do update set
  retention_days = excluded.retention_days,
  action = excluded.action,
  rationale = excluded.rationale;

revoke all on table app_private.data_retention_policies from public, anon, authenticated;

create or replace function public.run_data_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_rate_limits integer := 0;
  deleted_sessions integer := 0;
  deleted_views integer := 0;
  deleted_events integer := 0;
  deleted_access_audits integer := 0;
  anonymized_interest integer := 0;
  deleted_receipts integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  delete from app_private.api_rate_limits
  where updated_at < pg_catalog.now() - interval '2 days';
  get diagnostics deleted_rate_limits = row_count;

  delete from public.viewer_sessions
  where started_at < pg_catalog.now() - interval '90 days';
  get diagnostics deleted_sessions = row_count;

  delete from public.portfolio_views
  where viewed_at < pg_catalog.now() - interval '395 days';
  get diagnostics deleted_views = row_count;

  delete from public.portfolio_events
  where created_at < pg_catalog.now() - interval '395 days';
  get diagnostics deleted_events = row_count;

  delete from public.access_audit_events
  where created_at < pg_catalog.now() - interval '730 days';
  get diagnostics deleted_access_audits = row_count;

  update public.interest_requests
  set viewer_name = null,
      viewer_phone = null,
      viewer_email = null,
      viewer_family_context = null,
      message = null,
      requester_user_id = null,
      prospect_key_hash = null,
      metadata = '{}'::jsonb,
      updated_at = pg_catalog.now()
  where status in ('rejected', 'closed')
    and updated_at < pg_catalog.now() - interval '180 days'
    and (
      viewer_name is not null or viewer_phone is not null or viewer_email is not null
      or viewer_family_context is not null or message is not null or requester_user_id is not null
    );
  get diagnostics anonymized_interest = row_count;

  delete from public.account_deletion_requests
  where (
    status = 'completed'
    and retention_until < pg_catalog.now()
  ) or (
    user_id is null
    and updated_at < pg_catalog.now() - interval '30 days'
  );
  get diagnostics deleted_receipts = row_count;

  return pg_catalog.jsonb_build_object(
    'rateLimitsDeleted', deleted_rate_limits,
    'viewerSessionsDeleted', deleted_sessions,
    'portfolioViewsDeleted', deleted_views,
    'portfolioEventsDeleted', deleted_events,
    'accessAuditEventsDeleted', deleted_access_audits,
    'interestRequestsAnonymized', anonymized_interest,
    'deletionReceiptsDeleted', deleted_receipts
  );
end;
$$;

revoke all on function public.run_data_retention() from public, anon, authenticated;
grant execute on function public.run_data_retention() to service_role;

-- Audit records remain immutable to application roles. The retention worker
-- may delete only records beyond the fixed security-investigation window.
create or replace function app_private.prevent_access_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    and old.created_at < pg_catalog.now() - interval '730 days' then
    return old;
  end if;
  raise exception 'access audit events are immutable' using errcode = '55000';
end;
$$;

revoke all on function app_private.prevent_access_audit_mutation() from public;

-- Add Phase 4 actions without allowing callers to choose their own quotas.
create or replace function public.consume_api_rate_limit(
  p_action text,
  p_subject_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_limit integer;
  window_seconds integer;
  effective_subject text;
  limit_record app_private.api_rate_limits%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  select configured.limit_value, configured.window_value
    into action_limit, window_seconds
  from (values
    ('auth_google', 10, 900), ('auth_email', 5, 900),
    ('interest_submit', 5, 3600), ('interest_decision', 30, 60),
    ('grant_manage', 30, 60), ('dashboard_save', 30, 300),
    ('photo_upload', 12, 3600), ('photo_mutation', 30, 300),
    ('horoscope_upload', 6, 3600), ('horoscope_delete', 10, 300),
    ('portfolio_publish', 6, 3600), ('portfolio_renew', 6, 3600),
    ('portfolio_rotate', 6, 3600), ('portfolio_unpublish', 6, 3600),
    ('horoscope_view', 30, 300), ('location_search', 120, 60),
    ('account_export', 3, 3600), ('account_delete', 3, 86400),
    ('session_manage', 10, 3600)
  ) as configured(action_name, limit_value, window_value)
  where configured.action_name = p_action;

  if action_limit is null then
    raise exception 'unsupported rate limit action' using errcode = '22023';
  end if;
  if auth.uid() is not null then
    effective_subject := 'user:' || auth.uid()::text;
  elsif p_subject_hash is not null and p_subject_hash ~ '^[a-f0-9]{64}$' then
    effective_subject := 'anonymous:' || p_subject_hash;
  else
    return '{"allowed":false,"retryAfter":60}'::jsonb;
  end if;

  insert into app_private.api_rate_limits (
    action, subject_key, window_started_at, request_count, updated_at
  ) values (p_action, effective_subject, v_now, 1, v_now)
  on conflict (action, subject_key) do update set
    window_started_at = case
      when app_private.api_rate_limits.window_started_at <= v_now - pg_catalog.make_interval(secs => window_seconds)
      then v_now else app_private.api_rate_limits.window_started_at end,
    request_count = case
      when app_private.api_rate_limits.window_started_at <= v_now - pg_catalog.make_interval(secs => window_seconds)
      then 1 else app_private.api_rate_limits.request_count + 1 end,
    updated_at = v_now
  returning * into limit_record;

  return pg_catalog.jsonb_build_object(
    'allowed', limit_record.request_count <= action_limit,
    'retryAfter', case when limit_record.request_count <= action_limit then 0 else greatest(
      1,
      pg_catalog.ceil(extract(epoch from (
        limit_record.window_started_at + pg_catalog.make_interval(secs => window_seconds) - v_now
      )))::integer
    )
    end
  );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text) to anon, authenticated;
