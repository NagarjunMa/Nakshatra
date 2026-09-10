-- BrokerDesk team reads use opaque member references and a narrow projection.
-- Direct generic membership mutations are disabled for matchmaker agencies;
-- future changes must use purpose-specific, fresh-authenticated commands.
create or replace function app_private.generate_public_reference(p_prefix text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
begin
  if p_prefix is null or p_prefix <> all(
    array['wrk', 'bcr', 'bir', 'inc', 'tsk', 'imp', 'inv', 'mbr']::text[]
  ) then
    raise exception 'unsupported public reference type' using errcode = '22023';
  end if;
  return p_prefix || '_' || pg_catalog.encode(extensions.gen_random_bytes(16), 'hex');
end;
$$;

revoke all on function app_private.generate_public_reference(text) from public, anon, authenticated;

alter table public.organization_members
  add column if not exists member_ref text;

update public.organization_members
set member_ref = app_private.generate_public_reference('mbr')
where member_ref is null;

alter table public.organization_members
  alter column member_ref set not null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'organization_members_member_ref_key'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_member_ref_key unique (member_ref);
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'organization_members_member_ref_format'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_member_ref_format
      check (member_ref ~ '^mbr_[0-9a-f]{32}$');
  end if;
end $$;

create or replace function app_private.assign_organization_member_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.member_ref := app_private.generate_public_reference('mbr');
  elsif new.member_ref is distinct from old.member_ref then
    raise exception 'member reference is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function app_private.assign_organization_member_ref() from public, anon, authenticated;

drop trigger if exists assign_organization_member_ref on public.organization_members;
create trigger assign_organization_member_ref
  before insert or update of member_ref on public.organization_members
  for each row execute function app_private.assign_organization_member_ref();

-- Preserve generic family/platform membership management while preventing the
-- broad legacy RLS policies from mutating BrokerDesk agency membership.
create or replace function public.can_manage_organization_member(
  p_organization_id uuid,
  p_target_role public.organization_member_role
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  if exists (
    select 1 from public.organizations organization_record
    where organization_record.id = p_organization_id
      and organization_record.type = 'matchmaker_agency'
  ) then
    return false;
  end if;
  return
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
end;
$$;

revoke all on function public.can_manage_organization_member(uuid, public.organization_member_role)
  from public, anon, authenticated;
grant execute on function public.can_manage_organization_member(uuid, public.organization_member_role)
  to authenticated;

create or replace function public.can_read_organization_membership(
  p_organization_id uuid,
  p_member_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  if exists (
    select 1
    from public.organizations organization_record
    where organization_record.id = p_organization_id
      and organization_record.type = 'matchmaker_agency'
  ) then
    return false;
  end if;
  return p_member_user_id = auth.uid() or public.is_organization_member(p_organization_id);
end;
$$;

revoke all on function public.can_read_organization_membership(uuid,uuid) from public, anon, authenticated;
grant execute on function public.can_read_organization_membership(uuid,uuid) to authenticated;

drop policy if exists "Organization members can read membership" on public.organization_members;
create policy "Membership reads use product-specific projections"
  on public.organization_members for select to authenticated
  using (public.can_read_organization_membership(organization_id, user_id));

create or replace function public.resolve_brokerdesk_team(p_workspace_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  workspace_id uuid;
  team_members jsonb;
begin
  perform app_private.require_current_session();
  workspace_id := app_private.brokerdesk_privileged_action_organization_id(
    actor_id, p_workspace_ref, 'team_access_replace'
  );
  if workspace_id is null then
    return '{"available":false}'::jsonb;
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'memberRef', member_record.member_ref,
        'displayName', pg_catalog.left(coalesce(
          nullif(pg_catalog.btrim(profile_record.display_name), ''),
          nullif(pg_catalog.split_part(user_record.email, '@', 1), ''),
          'Team member'
        ), 180),
        'email', user_record.email,
        'rolePreset', member_access.role_preset::text,
        'status', member_record.status::text,
        'customerAccess', case
          when member_access.role_preset::text in ('owner', 'admin') then 'all_customers'
          when exists (
            select 1 from app_private.broker_client_assignments assignment
            where assignment.organization_id = workspace_id
              and assignment.member_id = member_record.id
              and assignment.starts_at <= pg_catalog.now()
              and (assignment.ends_at is null or assignment.ends_at > pg_catalog.now())
              and assignment.revoked_at is null
          ) then 'assigned_customers'
          else 'none'
        end,
        'assignedCustomerCount', (
          select count(*)::integer
          from app_private.broker_client_assignments assignment
          where assignment.organization_id = workspace_id
            and assignment.member_id = member_record.id
            and assignment.starts_at <= pg_catalog.now()
            and (assignment.ends_at is null or assignment.ends_at > pg_catalog.now())
            and assignment.revoked_at is null
        ),
        'joinedAt', member_record.created_at,
        'isCurrentUser', member_record.user_id = actor_id
      ) order by
        case member_access.role_preset::text
          when 'owner' then 1 when 'admin' then 2 when 'advisor' then 3
          when 'coordinator' then 4 else 5
        end,
        pg_catalog.lower(coalesce(profile_record.display_name, user_record.email, '')),
        member_record.member_ref
    ),
    '[]'::jsonb
  ) into team_members
  from public.organization_members member_record
  join app_private.organization_member_access member_access
    on member_access.organization_id = member_record.organization_id
   and member_access.member_id = member_record.id
  join auth.users user_record on user_record.id = member_record.user_id
  left join public.user_profiles profile_record on profile_record.user_id = member_record.user_id
  where member_record.organization_id = workspace_id
    and member_record.status <> 'removed'
    and member_access.starts_at <= pg_catalog.now()
    and (member_access.ends_at is null or member_access.ends_at > pg_catalog.now())
    and member_access.revoked_at is null;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'workspaceRef', p_workspace_ref,
    'members', team_members
  );
end;
$$;

revoke all on function public.resolve_brokerdesk_team(text) from public, anon, authenticated;
grant execute on function public.resolve_brokerdesk_team(text) to authenticated;

comment on column public.organization_members.member_ref is
  'Opaque immutable member identifier for URLs and API projections; never an authorization grant.';
comment on function public.resolve_brokerdesk_team(text) is
  'Minimal owner/admin team projection. Missing and unauthorized workspaces return the same unavailable shape.';

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
