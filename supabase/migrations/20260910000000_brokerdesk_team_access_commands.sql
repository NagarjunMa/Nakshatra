-- Role replacement and suspension are explicit, purpose-bound commands. They
-- resolve opaque references inside one agency and never expose generic member CRUD.

create or replace function public.replace_brokerdesk_team_member_access(
  p_workspace_ref text,
  p_member_ref text,
  p_role_preset text,
  p_proof_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_aal text := coalesce(auth.jwt() ->> 'aal', '');
  workspace_id uuid;
  actor_preset text;
  target public.organization_members%rowtype;
  target_preset text;
  legacy_role public.organization_member_role;
  request_hash text;
  existing app_private.brokerdesk_command_idempotency%rowtype;
  assignment_count integer;
  result jsonb;
begin
  perform app_private.require_current_session();
  if current_aal <> 'aal2' then
    raise exception 'team access change unavailable' using errcode = '42501';
  end if;
  if actor_id is null or p_workspace_ref !~ '^wrk_[0-9a-f]{32}$'
    or p_member_ref !~ '^mbr_[0-9a-f]{32}$'
    or p_role_preset not in ('admin','advisor','coordinator','viewer')
    or p_proof_hash !~ '^[a-f0-9]{64}$'
    or p_idempotency_key !~ '^[A-Za-z0-9_.:-]{16,128}$' then
    raise exception 'invalid team access change' using errcode = '22023';
  end if;

  workspace_id := app_private.brokerdesk_privileged_action_organization_id(
    actor_id, p_workspace_ref, 'team_access_replace'
  );
  if workspace_id is null then
    raise exception 'team access change unavailable' using errcode = '42501';
  end if;
  select access.role_preset::text into actor_preset
  from public.organization_members member
  join app_private.organization_member_access access on access.member_id = member.id
  where member.organization_id = workspace_id and member.user_id = actor_id
    and member.status = 'active' and access.revoked_at is null;
  select target_record, access.role_preset::text into target, target_preset
  from public.organization_members target_record
  join app_private.organization_member_access access on access.member_id = target_record.id
  where target_record.organization_id = workspace_id and target_record.member_ref = p_member_ref
    and access.organization_id = workspace_id and access.starts_at <= pg_catalog.now()
    and (access.ends_at is null or access.ends_at > pg_catalog.now()) and access.revoked_at is null;
  if not found or target.user_id = actor_id or target_preset = 'owner'
    or (actor_preset = 'admin' and (target_preset = 'admin' or p_role_preset = 'admin')) then
    raise exception 'team access change unavailable' using errcode = '42501';
  end if;

  request_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object(
      'workspaceRef',p_workspace_ref,'memberRef',p_member_ref,'rolePreset',p_role_preset
    )::text, 'UTF8'
  ), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor_id::text || ':team-access-replace:' || p_idempotency_key, 0
  ));
  select * into existing from app_private.brokerdesk_command_idempotency
  where actor_user_id = actor_id and command_name = 'replace_team_member_access'
    and idempotency_key = p_idempotency_key and expires_at > pg_catalog.now();
  if found then
    if existing.request_hash <> request_hash then
      raise exception 'idempotency key was already used for a different request' using errcode = '22023';
    end if;
    return existing.safe_result;
  end if;
  if target.status <> 'active' then
    raise exception 'team access change unavailable' using errcode = '42501';
  end if;
  if app_private.consume_brokerdesk_action_reauth(workspace_id, 'team_access_replace', p_proof_hash) <> 'consumed' then
    raise exception 'team access change unavailable' using errcode = '42501';
  end if;

  legacy_role := case p_role_preset
    when 'admin' then 'admin'::public.organization_member_role
    when 'advisor' then 'broker_agent'::public.organization_member_role
    when 'coordinator' then 'editor'::public.organization_member_role
    else 'viewer'::public.organization_member_role end;
  update public.organization_members
  set role = legacy_role, updated_at = pg_catalog.now()
  where id = target.id;
  update app_private.organization_member_access
  set granted_by = actor_id, updated_at = pg_catalog.now()
  where member_id = target.id;
  select count(*)::integer into assignment_count
  from app_private.broker_client_assignments assignment
  where assignment.organization_id = workspace_id and assignment.member_id = target.id
    and assignment.starts_at <= pg_catalog.now()
    and (assignment.ends_at is null or assignment.ends_at > pg_catalog.now())
    and assignment.revoked_at is null;

  result := pg_catalog.jsonb_build_object(
    'status','updated','workspaceRef',p_workspace_ref,'memberRef',p_member_ref,
    'rolePreset',p_role_preset,'customerAccess',case when p_role_preset = 'admin'
      then 'all_customers' when assignment_count > 0 then 'assigned_customers' else 'none' end,
    'assignedCustomerCount',assignment_count
  );
  insert into app_private.brokerdesk_audit_events
    (organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
  values (workspace_id,actor_id,'team.member.access_replaced','team_member','succeeded',
    pg_catalog.jsonb_build_object('memberRef',p_member_ref,'previousRolePreset',target_preset,'rolePreset',p_role_preset));
  insert into app_private.brokerdesk_command_idempotency
    (actor_user_id,command_name,idempotency_key,request_hash,organization_id,safe_result)
  values (actor_id,'replace_team_member_access',p_idempotency_key,request_hash,workspace_id,result);
  return result;
end;
$$;

create or replace function public.suspend_brokerdesk_team_member(
  p_workspace_ref text,
  p_member_ref text,
  p_proof_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_aal text := coalesce(auth.jwt() ->> 'aal', '');
  workspace_id uuid;
  actor_preset text;
  target public.organization_members%rowtype;
  target_preset text;
  request_hash text;
  existing app_private.brokerdesk_command_idempotency%rowtype;
  result jsonb;
begin
  perform app_private.require_current_session();
  if current_aal <> 'aal2' then
    raise exception 'team suspension unavailable' using errcode = '42501';
  end if;
  if actor_id is null or p_workspace_ref !~ '^wrk_[0-9a-f]{32}$'
    or p_member_ref !~ '^mbr_[0-9a-f]{32}$' or p_proof_hash !~ '^[a-f0-9]{64}$'
    or p_idempotency_key !~ '^[A-Za-z0-9_.:-]{16,128}$' then
    raise exception 'invalid team suspension' using errcode = '22023';
  end if;
  workspace_id := app_private.brokerdesk_privileged_action_organization_id(
    actor_id, p_workspace_ref, 'team_suspend'
  );
  if workspace_id is null then
    raise exception 'team suspension unavailable' using errcode = '42501';
  end if;
  select access.role_preset::text into actor_preset
  from public.organization_members member
  join app_private.organization_member_access access on access.member_id = member.id
  where member.organization_id = workspace_id and member.user_id = actor_id
    and member.status = 'active' and access.revoked_at is null;
  select target_record, access.role_preset::text into target, target_preset
  from public.organization_members target_record
  join app_private.organization_member_access access on access.member_id = target_record.id
  where target_record.organization_id = workspace_id and target_record.member_ref = p_member_ref
    and access.organization_id = workspace_id and access.starts_at <= pg_catalog.now()
    and (access.ends_at is null or access.ends_at > pg_catalog.now()) and access.revoked_at is null;
  if not found or target.user_id = actor_id or target_preset = 'owner'
    or (actor_preset = 'admin' and target_preset = 'admin') then
    raise exception 'team suspension unavailable' using errcode = '42501';
  end if;

  request_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object('workspaceRef',p_workspace_ref,'memberRef',p_member_ref)::text, 'UTF8'
  ), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor_id::text || ':team-suspend:' || p_idempotency_key, 0
  ));
  select * into existing from app_private.brokerdesk_command_idempotency
  where actor_user_id = actor_id and command_name = 'suspend_team_member'
    and idempotency_key = p_idempotency_key and expires_at > pg_catalog.now();
  if found then
    if existing.request_hash <> request_hash then
      raise exception 'idempotency key was already used for a different request' using errcode = '22023';
    end if;
    return existing.safe_result;
  end if;
  if target.status <> 'active' then
    raise exception 'team suspension unavailable' using errcode = '42501';
  end if;
  if app_private.consume_brokerdesk_action_reauth(workspace_id, 'team_suspend', p_proof_hash) <> 'consumed' then
    raise exception 'team suspension unavailable' using errcode = '42501';
  end if;

  update public.organization_members
  set status = 'suspended', updated_at = pg_catalog.now()
  where id = target.id;
  update app_private.brokerdesk_action_reauth_challenges
  set invalidated_at = pg_catalog.now()
  where organization_id = workspace_id and user_id = target.user_id
    and consumed_at is null and invalidated_at is null;
  result := pg_catalog.jsonb_build_object(
    'status','suspended','workspaceRef',p_workspace_ref,'memberRef',p_member_ref
  );
  insert into app_private.brokerdesk_audit_events
    (organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
  values (workspace_id,actor_id,'team.member.suspended','team_member','succeeded',
    pg_catalog.jsonb_build_object('memberRef',p_member_ref,'previousRolePreset',target_preset));
  insert into app_private.brokerdesk_command_idempotency
    (actor_user_id,command_name,idempotency_key,request_hash,organization_id,safe_result)
  values (actor_id,'suspend_team_member',p_idempotency_key,request_hash,workspace_id,result);
  return result;
end;
$$;

revoke all on function public.replace_brokerdesk_team_member_access(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.suspend_brokerdesk_team_member(text,text,text,text) from public, anon, authenticated;
grant execute on function public.replace_brokerdesk_team_member_access(text,text,text,text,text) to authenticated;
grant execute on function public.suspend_brokerdesk_team_member(text,text,text,text) to authenticated;

comment on function public.replace_brokerdesk_team_member_access(text,text,text,text,text) is
  'Atomically replaces a non-owner employee role using an AAL2 purpose-bound proof and opaque references.';
comment on function public.suspend_brokerdesk_team_member(text,text,text,text) is
  'Immediately removes one agency membership access without revoking the shared user identity or other agency sessions.';

create or replace function public.consume_api_rate_limit(p_action text, p_subject_hash text default null)
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
  select configured.limit_value, configured.window_value into action_limit, window_seconds
  from (values
    ('auth_google',10,900),('auth_email',5,900),('interest_submit',5,3600),('interest_decision',30,60),
    ('grant_manage',30,60),('dashboard_save',30,300),('photo_upload',12,3600),('photo_mutation',30,300),
    ('horoscope_upload',6,3600),('horoscope_delete',10,300),('portfolio_publish',6,3600),
    ('portfolio_renew',6,3600),('portfolio_rotate',6,3600),('portfolio_unpublish',6,3600),
    ('horoscope_view',30,300),('location_search',120,60),('account_export',3,3600),
    ('account_delete',3,86400),('account_delete_reauth',3,3600),('session_manage',10,3600),
    ('identity_verification_invitation',5,3600),('identity_verification_start',5,3600),
    ('identity_verification_status',30,300),('identity_verification_retry',5,3600),
    ('brokerdesk_bootstrap',60,60),('brokerdesk_workspace_create',3,3600),
    ('brokerdesk_onboarding_read',60,60),('brokerdesk_onboarding_write',30,300),
    ('brokerdesk_privileged_reauth',5,3600),('brokerdesk_mfa_complete',10,900),
    ('brokerdesk_team_read',60,60),('brokerdesk_team_invite',20,3600),
    ('brokerdesk_team_invitation_exchange',20,3600),('brokerdesk_team_invitation_accept',10,3600),
    ('brokerdesk_team_access_replace',30,3600),('brokerdesk_team_suspend',20,3600)
  ) as configured(action_name,limit_value,window_value)
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
  insert into app_private.api_rate_limits(action,subject_key,window_started_at,request_count,updated_at)
  values(p_action,effective_subject,v_now,1,v_now)
  on conflict(action,subject_key) do update set
    window_started_at = case when app_private.api_rate_limits.window_started_at <= v_now-pg_catalog.make_interval(secs=>window_seconds) then v_now else app_private.api_rate_limits.window_started_at end,
    request_count = case when app_private.api_rate_limits.window_started_at <= v_now-pg_catalog.make_interval(secs=>window_seconds) then 1 else app_private.api_rate_limits.request_count+1 end,
    updated_at=v_now returning * into limit_record;
  return pg_catalog.jsonb_build_object('allowed',limit_record.request_count<=action_limit,'retryAfter',
    case when limit_record.request_count<=action_limit then 0 else greatest(1,pg_catalog.ceil(extract(epoch from(
      limit_record.window_started_at+pg_catalog.make_interval(secs=>window_seconds)-v_now)))::integer) end);
end;
$$;
revoke all on function public.consume_api_rate_limit(text,text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,text) to anon, authenticated;
