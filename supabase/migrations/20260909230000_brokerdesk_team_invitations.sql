-- Team invitations are audience-bound, single-use capabilities. Only hashes
-- are stored; link credentials are exchanged from a URL fragment by the app.
create table app_private.brokerdesk_team_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  invitation_ref text not null unique default app_private.generate_public_reference('inv'),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  email_hint text not null check (length(email_hint) between 5 and 254),
  role_preset app_private.brokerdesk_role_preset not null check (role_preset <> 'owner'),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  check (invitation_ref ~ '^inv_[0-9a-f]{32}$'),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_by is not null),
  check (consumed_at is null or revoked_at is null)
);

alter table app_private.brokerdesk_team_invitations enable row level security;
revoke all on table app_private.brokerdesk_team_invitations from public, anon, authenticated;
create index brokerdesk_team_invitation_org_active_idx
  on app_private.brokerdesk_team_invitations (organization_id, created_at desc)
  where consumed_at is null and revoked_at is null;
create unique index brokerdesk_team_invitation_one_active_email_idx
  on app_private.brokerdesk_team_invitations (organization_id, email_hash)
  where consumed_at is null and revoked_at is null;
create index brokerdesk_team_invitation_expiry_idx
  on app_private.brokerdesk_team_invitations (expires_at)
  where consumed_at is null and revoked_at is null;

create or replace function public.create_brokerdesk_team_invitation(
  p_workspace_ref text,
  p_role_preset text,
  p_email_hash text,
  p_email_hint text,
  p_token_hash text,
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
  v_organization_id uuid;
  actor_preset text;
  request_hash text;
  existing app_private.brokerdesk_command_idempotency%rowtype;
  invitation app_private.brokerdesk_team_invitations%rowtype;
  result jsonb;
begin
  perform app_private.require_current_session();
  if current_aal <> 'aal2' then
    raise exception 'team invitation unavailable' using errcode = '42501';
  end if;
  if actor_id is null or p_workspace_ref !~ '^wrk_[0-9a-f]{32}$'
    or p_role_preset not in ('admin','advisor','coordinator','viewer')
    or p_email_hash !~ '^[a-f0-9]{64}$' or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_proof_hash !~ '^[a-f0-9]{64}$'
    or length(coalesce(p_email_hint,'')) not between 5 and 254
    or p_idempotency_key !~ '^[A-Za-z0-9_.:-]{16,128}$' then
    raise exception 'invalid team invitation' using errcode = '22023';
  end if;

  -- Authorization is intentionally checked before the idempotent return. A
  -- consumed proof may make an identical retry safe, but suspension, demotion,
  -- or an AAL downgrade must take effect immediately.
  v_organization_id := app_private.brokerdesk_privileged_action_organization_id(
    actor_id, p_workspace_ref, 'team_invite'
  );
  if v_organization_id is null then
    raise exception 'team invitation unavailable' using errcode = '42501';
  end if;
  select member_access.role_preset::text into actor_preset
  from public.organization_members member_record
  join app_private.organization_member_access member_access on member_access.member_id = member_record.id
  where member_record.organization_id = v_organization_id and member_record.user_id = actor_id
    and member_record.status = 'active' and member_access.revoked_at is null
    and member_access.starts_at <= pg_catalog.now()
    and (member_access.ends_at is null or member_access.ends_at > pg_catalog.now());
  if actor_preset = 'admin' and p_role_preset = 'admin' then
    raise exception 'team invitation unavailable' using errcode = '42501';
  end if;
  if p_email_hash = pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.lower(pg_catalog.btrim((select email from auth.users where id = actor_id))), 'UTF8'
  ), 'sha256'), 'hex') then
    raise exception 'cannot invite current account' using errcode = '22023';
  end if;

  request_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object(
      'workspaceRef',p_workspace_ref,'rolePreset',p_role_preset,
      'emailHash',p_email_hash,'emailHint',p_email_hint,'tokenHash',p_token_hash
    )::text, 'UTF8'
  ), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor_id::text || ':team-invite:' || p_idempotency_key, 0
  ));
  select * into existing from app_private.brokerdesk_command_idempotency
  where actor_user_id = actor_id and command_name = 'create_team_invitation'
    and idempotency_key = p_idempotency_key and expires_at > pg_catalog.now();
  if found then
    if existing.request_hash <> request_hash then
      raise exception 'idempotency key was already used for a different request' using errcode = '22023';
    end if;
    return existing.safe_result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_organization_id::text || ':team-invite-email:' || p_email_hash, 0
  ));
  if (select count(*) from app_private.brokerdesk_team_invitations
      where brokerdesk_team_invitations.organization_id = v_organization_id
        and created_at > pg_catalog.now() - interval '24 hours') >= 500 then
    raise exception 'workspace invitation quota exceeded' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.organization_members member_record
    join auth.users user_record on user_record.id = member_record.user_id
    where member_record.organization_id = v_organization_id
      and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        pg_catalog.lower(pg_catalog.btrim(user_record.email)), 'UTF8'
      ), 'sha256'), 'hex') = p_email_hash
  ) then
    raise exception 'account is already a team member' using errcode = '22023';
  end if;

  if app_private.consume_brokerdesk_action_reauth(v_organization_id, 'team_invite', p_proof_hash) <> 'consumed' then
    raise exception 'team invitation unavailable' using errcode = '42501';
  end if;

  update app_private.brokerdesk_team_invitations
  set revoked_at = pg_catalog.now()
  where brokerdesk_team_invitations.organization_id = v_organization_id and email_hash = p_email_hash
    and consumed_at is null and revoked_at is null;

  insert into app_private.brokerdesk_team_invitations (
    organization_id,email_hash,email_hint,role_preset,token_hash,invited_by,expires_at
  ) values (
    v_organization_id,p_email_hash,p_email_hint,p_role_preset::app_private.brokerdesk_role_preset,
    p_token_hash,actor_id,pg_catalog.now() + interval '7 days'
  ) returning * into invitation;

  result := pg_catalog.jsonb_build_object(
    'status','created','invitationRef',invitation.invitation_ref,'workspaceRef',p_workspace_ref,
    'emailHint',invitation.email_hint,'rolePreset',invitation.role_preset::text,'expiresAt',invitation.expires_at
  );
  insert into app_private.brokerdesk_audit_events
    (organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
  values (v_organization_id,actor_id,'team.invitation.created','team_invitation','succeeded',
    pg_catalog.jsonb_build_object('invitationRef',invitation.invitation_ref,'rolePreset',invitation.role_preset::text,'emailHint',invitation.email_hint));
  insert into app_private.brokerdesk_command_idempotency
    (actor_user_id,command_name,idempotency_key,request_hash,organization_id,safe_result)
  values (actor_id,'create_team_invitation',p_idempotency_key,request_hash,v_organization_id,result);
  return result;
end;
$$;

create or replace function public.accept_brokerdesk_team_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email_hash text;
  invitation app_private.brokerdesk_team_invitations%rowtype;
  workspace public.organizations%rowtype;
  member public.organization_members%rowtype;
  legacy_role public.organization_member_role;
begin
  perform app_private.require_current_session();
  if actor_id is null or p_token_hash !~ '^[a-f0-9]{64}$' then return '{"available":false}'::jsonb; end if;
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.lower(pg_catalog.btrim(user_record.email)), 'UTF8'
  ), 'sha256'), 'hex') into actor_email_hash
  from auth.users user_record where user_record.id = actor_id and user_record.email_confirmed_at is not null;
  if actor_email_hash is null then return '{"available":false}'::jsonb; end if;

  select * into invitation from app_private.brokerdesk_team_invitations
  where token_hash = p_token_hash for update;
  if not found or invitation.email_hash <> actor_email_hash or invitation.consumed_at is not null
    or invitation.revoked_at is not null or invitation.expires_at <= pg_catalog.now() then
    return '{"available":false}'::jsonb;
  end if;
  select * into workspace from public.organizations where id = invitation.organization_id
    and type = 'matchmaker_agency' and status in ('onboarding','active');
  if not found or exists (select 1 from public.organization_members where organization_id = workspace.id and user_id = actor_id) then
    return '{"available":false}'::jsonb;
  end if;

  legacy_role := case invitation.role_preset
    when 'admin' then 'admin'::public.organization_member_role
    when 'advisor' then 'broker_agent'::public.organization_member_role
    when 'coordinator' then 'editor'::public.organization_member_role
    else 'viewer'::public.organization_member_role end;
  insert into public.organization_members (organization_id,user_id,role,status,invited_by)
  values (workspace.id,actor_id,legacy_role,'active',invitation.invited_by)
  returning * into member;
  update app_private.brokerdesk_team_invitations
  set consumed_at = pg_catalog.now(), consumed_by = actor_id where id = invitation.id;
  insert into app_private.brokerdesk_audit_events
    (organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
  values (workspace.id,actor_id,'team.invitation.accepted','team_member','succeeded',
    pg_catalog.jsonb_build_object('invitationRef',invitation.invitation_ref,'memberRef',member.member_ref,'rolePreset',invitation.role_preset::text));
  return pg_catalog.jsonb_build_object(
    'available',true,'workspaceRef',workspace.workspace_ref,'workspaceName',workspace.name,
    'rolePreset',invitation.role_preset::text,'memberRef',member.member_ref
  );
end;
$$;

revoke all on function public.create_brokerdesk_team_invitation(text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.accept_brokerdesk_team_invitation(text) from public, anon, authenticated;
grant execute on function public.create_brokerdesk_team_invitation(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.accept_brokerdesk_team_invitation(text) to authenticated;

comment on table app_private.brokerdesk_team_invitations is
  'Private, email-audience-bound, hashed, expiring and single-use BrokerDesk employee invitations.';

create or replace function public.consume_api_rate_limit(p_action text, p_subject_hash text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  action_limit integer; window_seconds integer; effective_subject text;
  limit_record app_private.api_rate_limits%rowtype; v_now timestamptz := pg_catalog.now();
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
    ('brokerdesk_team_invitation_exchange',20,3600),('brokerdesk_team_invitation_accept',10,3600)
  ) as configured(action_name,limit_value,window_value) where configured.action_name = p_action;
  if action_limit is null then raise exception 'unsupported rate limit action' using errcode = '22023'; end if;
  if auth.uid() is not null then effective_subject := 'user:' || auth.uid()::text;
  elsif p_subject_hash is not null and p_subject_hash ~ '^[a-f0-9]{64}$' then effective_subject := 'anonymous:' || p_subject_hash;
  else return '{"allowed":false,"retryAfter":60}'::jsonb; end if;
  insert into app_private.api_rate_limits(action,subject_key,window_started_at,request_count,updated_at)
  values(p_action,effective_subject,v_now,1,v_now)
  on conflict(action,subject_key) do update set
    window_started_at = case when app_private.api_rate_limits.window_started_at <= v_now-pg_catalog.make_interval(secs=>window_seconds) then v_now else app_private.api_rate_limits.window_started_at end,
    request_count = case when app_private.api_rate_limits.window_started_at <= v_now-pg_catalog.make_interval(secs=>window_seconds) then 1 else app_private.api_rate_limits.request_count+1 end,
    updated_at=v_now returning * into limit_record;
  return pg_catalog.jsonb_build_object('allowed',limit_record.request_count<=action_limit,'retryAfter',
    case when limit_record.request_count<=action_limit then 0 else greatest(1,pg_catalog.ceil(extract(epoch from(
      limit_record.window_started_at+pg_catalog.make_interval(secs=>window_seconds)-v_now)))::integer) end);
end; $$;
revoke all on function public.consume_api_rate_limit(text,text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,text) to anon, authenticated;
