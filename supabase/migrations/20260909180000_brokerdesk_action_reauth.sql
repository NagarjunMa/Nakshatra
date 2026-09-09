-- Privileged BrokerDesk commands require a fresh, same-user session and an
-- action-scoped one-time proof. This migration creates the inert proof
-- perimeter; later command RPCs must consume it inside their own transaction.
create table app_private.brokerdesk_action_reauth_challenges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in (
    'team_invite', 'team_access_replace', 'team_suspend', 'verification_manage'
  )),
  initiating_session_id uuid not null,
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  verified_session_id uuid,
  verified_at timestamptz,
  proof_hash text check (proof_hash is null or proof_hash ~ '^[a-f0-9]{64}$'),
  proof_expires_at timestamptz,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  check (expires_at > created_at),
  check (
    (verified_session_id is null and verified_at is null and proof_hash is null and proof_expires_at is null)
    or (verified_session_id is not null and verified_at is not null and proof_hash is not null and proof_expires_at is not null)
  ),
  check (proof_expires_at is null or proof_expires_at <= expires_at),
  check (consumed_at is null or verified_at is not null),
  check (invalidated_at is null or consumed_at is null)
);

alter table app_private.brokerdesk_action_reauth_challenges enable row level security;
revoke all on table app_private.brokerdesk_action_reauth_challenges from public, anon, authenticated;

create unique index brokerdesk_action_reauth_one_active_challenge
  on app_private.brokerdesk_action_reauth_challenges (user_id, organization_id, purpose)
  where consumed_at is null and invalidated_at is null;

create index brokerdesk_action_reauth_cleanup_index
  on app_private.brokerdesk_action_reauth_challenges (expires_at)
  where consumed_at is not null or invalidated_at is not null;

-- Returns the workspace only for a currently active owner/admin whose preset
-- contains the capability required by this exact privileged action. BrokerDesk
-- entitlement is intentionally not consulted here: owners must be able to
-- complete representative verification and stage a team during onboarding.
-- Every consuming command still owns its stricter workspace-state policy.
create or replace function app_private.brokerdesk_privileged_action_organization_id(
  p_actor_user_id uuid,
  p_workspace_ref text,
  p_purpose text
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_record.id
  from public.organizations organization_record
  join public.organization_members member_record
    on member_record.organization_id = organization_record.id
   and member_record.user_id = p_actor_user_id
   and member_record.status = 'active'
  join app_private.organization_member_access member_access
    on member_access.organization_id = organization_record.id
   and member_access.member_id = member_record.id
   and member_access.role_preset::text in ('owner', 'admin')
   and member_access.starts_at <= pg_catalog.now()
   and (member_access.ends_at is null or member_access.ends_at > pg_catalog.now())
   and member_access.revoked_at is null
  join app_private.brokerdesk_role_capabilities role_capability
    on role_capability.role_preset = member_access.role_preset
   and role_capability.capability::text = case p_purpose
     when 'team_invite' then 'team.invite'
     when 'team_access_replace' then 'team.assign'
     when 'team_suspend' then 'team.assign'
     when 'verification_manage' then 'verification.manage'
     else '__invalid__'
   end
  where organization_record.workspace_ref = p_workspace_ref
    and organization_record.type = 'matchmaker_agency'
    and organization_record.status in ('onboarding', 'active')
  limit 1;
$$;

create or replace function public.start_brokerdesk_action_reauth(
  p_workspace_ref text,
  p_purpose text,
  p_initiating_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_session_id text := coalesce(auth.jwt() ->> 'session_id', '');
  workspace_id uuid;
  challenge_id uuid;
  challenge_expires_at timestamptz;
begin
  perform app_private.require_current_session();

  if actor_id is null or current_session_id <> p_initiating_session_id::text
    or p_purpose not in ('team_invite', 'team_access_replace', 'team_suspend', 'verification_manage') then
    raise exception 'workspace unavailable' using errcode = '42501';
  end if;

  workspace_id := app_private.brokerdesk_privileged_action_organization_id(
    actor_id, p_workspace_ref, p_purpose
  );
  if workspace_id is null then
    raise exception 'workspace unavailable' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor_id::text || ':' || workspace_id::text || ':' || p_purpose, 0
  ));

  delete from app_private.brokerdesk_action_reauth_challenges
  where expires_at < pg_catalog.now() - interval '7 days'
    and (consumed_at is not null or invalidated_at is not null or expires_at < pg_catalog.now());

  update app_private.brokerdesk_action_reauth_challenges
  set invalidated_at = pg_catalog.now()
  where user_id = actor_id
    and organization_id = workspace_id
    and purpose = p_purpose
    and consumed_at is null
    and invalidated_at is null;

  insert into app_private.brokerdesk_action_reauth_challenges (
    organization_id, user_id, purpose, initiating_session_id, expires_at
  ) values (
    workspace_id, actor_id, p_purpose, p_initiating_session_id,
    pg_catalog.now() + interval '10 minutes'
  ) returning id, expires_at into challenge_id, challenge_expires_at;

  return pg_catalog.jsonb_build_object(
    'status', 'started',
    'challengeId', challenge_id,
    'workspaceRef', p_workspace_ref,
    'purpose', p_purpose,
    'expiresAt', challenge_expires_at
  );
end;
$$;

create or replace function public.complete_brokerdesk_action_reauth(
  p_challenge_id uuid,
  p_proof_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_session_id text := coalesce(auth.jwt() ->> 'session_id', '');
  challenge app_private.brokerdesk_action_reauth_challenges%rowtype;
  workspace_ref text;
  authorized_workspace_id uuid;
  session_created_at timestamptz;
begin
  perform app_private.require_current_session();

  if actor_id is null or current_session_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    or coalesce(p_proof_hash, '') !~ '^[a-f0-9]{64}$' then
    return 'invalid';
  end if;

  select * into challenge
  from app_private.brokerdesk_action_reauth_challenges
  where id = p_challenge_id
  for update;

  if not found or challenge.user_id <> actor_id or challenge.consumed_at is not null
    or challenge.invalidated_at is not null then
    return 'invalid';
  end if;

  if challenge.expires_at <= pg_catalog.now() then
    update app_private.brokerdesk_action_reauth_challenges
    set invalidated_at = pg_catalog.now()
    where id = challenge.id;
    return 'expired';
  end if;

  select organization_record.workspace_ref into workspace_ref
  from public.organizations organization_record
  where organization_record.id = challenge.organization_id;
  authorized_workspace_id := app_private.brokerdesk_privileged_action_organization_id(
    actor_id, workspace_ref, challenge.purpose
  );
  if authorized_workspace_id is null or authorized_workspace_id <> challenge.organization_id then
    update app_private.brokerdesk_action_reauth_challenges
    set invalidated_at = pg_catalog.now()
    where id = challenge.id;
    return 'not_authorized';
  end if;

  if current_session_id = challenge.initiating_session_id::text then
    return 'not_fresh';
  end if;

  select session_record.created_at into session_created_at
  from auth.sessions session_record
  where session_record.id::text = current_session_id
    and session_record.user_id = actor_id;

  if session_created_at is null then
    return 'invalid';
  end if;
  if session_created_at <= challenge.created_at then
    return 'not_fresh';
  end if;

  update app_private.brokerdesk_action_reauth_challenges
  set verified_session_id = current_session_id::uuid,
      verified_at = pg_catalog.now(),
      proof_hash = p_proof_hash,
      proof_expires_at = least(expires_at, pg_catalog.now() + interval '10 minutes')
  where id = challenge.id;

  return 'verified';
end;
$$;

-- This function is intentionally private and ungranted. A future command RPC
-- calls it with its internally resolved organization and exact purpose, then
-- performs the privileged mutation and audit write in the same transaction.
create or replace function app_private.consume_brokerdesk_action_reauth(
  p_organization_id uuid,
  p_purpose text,
  p_proof_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_session_id text := coalesce(auth.jwt() ->> 'session_id', '');
  challenge app_private.brokerdesk_action_reauth_challenges%rowtype;
  workspace_ref text;
begin
  perform app_private.require_current_session();

  if actor_id is null or coalesce(p_proof_hash, '') !~ '^[a-f0-9]{64}$'
    or p_purpose not in ('team_invite', 'team_access_replace', 'team_suspend', 'verification_manage') then
    return 'proof_invalid';
  end if;

  select * into challenge
  from app_private.brokerdesk_action_reauth_challenges
  where user_id = actor_id
    and organization_id = p_organization_id
    and purpose = p_purpose
    and proof_hash = p_proof_hash
  for update;

  if not found or challenge.consumed_at is not null or challenge.invalidated_at is not null
    or challenge.verified_session_id is null or challenge.proof_expires_at is null
    or challenge.verified_session_id::text <> current_session_id then
    return 'proof_invalid';
  end if;

  if challenge.proof_expires_at <= pg_catalog.now() or challenge.expires_at <= pg_catalog.now() then
    update app_private.brokerdesk_action_reauth_challenges
    set invalidated_at = pg_catalog.now()
    where id = challenge.id;
    return 'proof_expired';
  end if;

  select organization_record.workspace_ref into workspace_ref
  from public.organizations organization_record
  where organization_record.id = p_organization_id;
  if app_private.brokerdesk_privileged_action_organization_id(
    actor_id, workspace_ref, p_purpose
  ) is distinct from p_organization_id then
    update app_private.brokerdesk_action_reauth_challenges
    set invalidated_at = pg_catalog.now()
    where id = challenge.id;
    return 'not_authorized';
  end if;

  update app_private.brokerdesk_action_reauth_challenges
  set consumed_at = pg_catalog.now()
  where id = challenge.id;
  return 'consumed';
end;
$$;

revoke all on function app_private.brokerdesk_privileged_action_organization_id(uuid,text,text) from public, anon, authenticated;
revoke all on function app_private.consume_brokerdesk_action_reauth(uuid,text,text) from public, anon, authenticated;
revoke all on function public.start_brokerdesk_action_reauth(text,text,uuid) from public, anon, authenticated;
revoke all on function public.complete_brokerdesk_action_reauth(uuid,text) from public, anon, authenticated;
grant execute on function public.start_brokerdesk_action_reauth(text,text,uuid) to authenticated;
grant execute on function public.complete_brokerdesk_action_reauth(uuid,text) to authenticated;

comment on table app_private.brokerdesk_action_reauth_challenges is
  'Short-lived actor, workspace and action-bound BrokerDesk reauthentication state. Raw proofs are never persisted.';
comment on function app_private.consume_brokerdesk_action_reauth(uuid,text,text) is
  'Private one-time proof consumer for use only inside audited privileged BrokerDesk command transactions.';

-- Privileged reauthentication has a tight independent quota. The route passes
-- only a compile-time allowlisted action name; callers cannot select policy.
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
    ('account_delete_reauth', 3, 3600), ('session_manage', 10, 3600),
    ('identity_verification_invitation', 5, 3600),
    ('identity_verification_start', 5, 3600),
    ('identity_verification_status', 30, 300),
    ('identity_verification_retry', 5, 3600),
    ('brokerdesk_bootstrap', 60, 60),
    ('brokerdesk_workspace_create', 3, 3600),
    ('brokerdesk_onboarding_read', 60, 60),
    ('brokerdesk_onboarding_write', 30, 300),
    ('brokerdesk_privileged_reauth', 5, 3600)
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
      1, pg_catalog.ceil(extract(epoch from (
        limit_record.window_started_at + pg_catalog.make_interval(secs => window_seconds) - v_now
      )))::integer
    ) end
  );
end;
$$;

revoke all on function public.consume_api_rate_limit(text,text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,text) to anon, authenticated;
