-- A fresh first-factor sign-in is necessary but insufficient for privileged
-- BrokerDesk commands. Completion and consumption both require Supabase AAL2.
alter table app_private.brokerdesk_action_reauth_challenges
  add column verified_aal text check (verified_aal is null or verified_aal = 'aal2');

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
  current_aal text := coalesce(auth.jwt() ->> 'aal', '');
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
  if current_aal <> 'aal2' then
    return 'mfa_required';
  end if;

  update app_private.brokerdesk_action_reauth_challenges
  set verified_session_id = current_session_id::uuid,
      verified_at = pg_catalog.now(),
      verified_aal = 'aal2',
      proof_hash = p_proof_hash,
      proof_expires_at = least(expires_at, pg_catalog.now() + interval '10 minutes')
  where id = challenge.id;

  return 'verified';
end;
$$;

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
  current_aal text := coalesce(auth.jwt() ->> 'aal', '');
  challenge app_private.brokerdesk_action_reauth_challenges%rowtype;
  workspace_ref text;
begin
  perform app_private.require_current_session();

  if current_aal <> 'aal2' then
    return 'mfa_required';
  end if;
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
    or challenge.verified_aal <> 'aal2'
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

revoke all on function app_private.consume_brokerdesk_action_reauth(uuid,text,text) from public, anon, authenticated;
revoke all on function public.complete_brokerdesk_action_reauth(uuid,text) from public, anon, authenticated;
grant execute on function public.complete_brokerdesk_action_reauth(uuid,text) to authenticated;

comment on column app_private.brokerdesk_action_reauth_challenges.verified_aal is
  'Assurance level verified by PostgreSQL when issuing the one-time action proof.';

-- Keep the full allowlist explicit so unknown action names fail closed.
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
    ('brokerdesk_privileged_reauth', 5, 3600),
    ('brokerdesk_mfa_complete', 10, 900),
    ('brokerdesk_team_read', 60, 60)
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
