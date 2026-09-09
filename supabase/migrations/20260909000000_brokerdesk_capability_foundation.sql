-- BrokerDesk capability foundation. Agency access is resolved from a live
-- session, an active membership, the current BrokerDesk entitlement, an
-- explicit role capability/scope, and (for customer-scoped work) assignment
-- plus mandate state. No agency access to customer-owned candidate or
-- portfolio tables is introduced here.

do $$
begin
  create type app_private.brokerdesk_role_preset as enum (
    'owner', 'admin', 'advisor', 'coordinator', 'viewer'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.brokerdesk_capability as enum (
    'customers.read',
    'customers.invite',
    'customers.edit_relationship',
    'portfolio.review',
    'portfolio.edit_as_delegate',
    'introductions.create',
    'introductions.send',
    'introductions.record_response',
    'introductions.close',
    'tasks.manage',
    'renewals.manage',
    'team.invite',
    'team.assign',
    'settings.manage',
    'verification.manage'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.brokerdesk_resource_scope as enum (
    'organization', 'assigned_customers', 'assigned_team', 'explicit_resource'
  );
exception when duplicate_object then null;
end $$;

alter table public.organizations
  add column if not exists workspace_ref text;

update public.organizations
set workspace_ref = app_private.generate_public_reference('wrk')
where workspace_ref is null;

alter table public.organizations
  alter column workspace_ref set not null;

alter table public.broker_clients
  add column if not exists relationship_ref text;

update public.broker_clients
set relationship_ref = app_private.generate_public_reference('bcr')
where relationship_ref is null;

alter table public.broker_clients
  alter column relationship_ref set not null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'organizations_workspace_ref_key'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_workspace_ref_key unique (workspace_ref);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'organizations_workspace_ref_format'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_workspace_ref_format
      check (workspace_ref ~ '^wrk_[0-9a-f]{32}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'broker_clients_relationship_ref_key'
      and conrelid = 'public.broker_clients'::regclass
  ) then
    alter table public.broker_clients
      add constraint broker_clients_relationship_ref_key unique (relationship_ref);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'broker_clients_relationship_ref_format'
      and conrelid = 'public.broker_clients'::regclass
  ) then
    alter table public.broker_clients
      add constraint broker_clients_relationship_ref_format
      check (relationship_ref ~ '^bcr_[0-9a-f]{32}$');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'organization_members_organization_id_id_key'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_id_key
      unique (organization_id, id);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'broker_clients_organization_id_id_key'
      and conrelid = 'public.broker_clients'::regclass
  ) then
    alter table public.broker_clients
      add constraint broker_clients_organization_id_id_key
      unique (organization_id, id);
  end if;
end $$;

create or replace function app_private.assign_organization_workspace_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.workspace_ref := app_private.generate_public_reference('wrk');
  elsif new.workspace_ref is distinct from old.workspace_ref then
    raise exception 'workspace reference is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function app_private.assign_broker_client_relationship_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.relationship_ref := app_private.generate_public_reference('bcr');
  elsif new.relationship_ref is distinct from old.relationship_ref then
    raise exception 'relationship reference is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function app_private.assign_organization_workspace_ref() from public, anon, authenticated;
revoke all on function app_private.assign_broker_client_relationship_ref() from public, anon, authenticated;

drop trigger if exists assign_organization_workspace_ref on public.organizations;
create trigger assign_organization_workspace_ref
  before insert or update of workspace_ref on public.organizations
  for each row execute function app_private.assign_organization_workspace_ref();

drop trigger if exists assign_broker_client_relationship_ref on public.broker_clients;
create trigger assign_broker_client_relationship_ref
  before insert or update of relationship_ref on public.broker_clients
  for each row execute function app_private.assign_broker_client_relationship_ref();

create table if not exists app_private.brokerdesk_role_capabilities (
  role_preset app_private.brokerdesk_role_preset not null,
  capability app_private.brokerdesk_capability not null,
  resource_scope app_private.brokerdesk_resource_scope not null,
  primary key (role_preset, capability)
);

create table if not exists app_private.organization_member_access (
  organization_id uuid not null,
  member_id uuid not null,
  role_preset app_private.brokerdesk_role_preset not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id),
  foreign key (organization_id, member_id)
    references public.organization_members(organization_id, id) on delete cascade,
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists app_private.broker_client_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  broker_client_id uuid not null,
  member_id uuid not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, broker_client_id)
    references public.broker_clients(organization_id, id) on delete cascade,
  foreign key (organization_id, member_id)
    references public.organization_members(organization_id, id) on delete cascade,
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists app_private.broker_client_mandates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  broker_client_id uuid not null,
  purpose text not null,
  permitted_capabilities app_private.brokerdesk_capability[] not null,
  evidence_reference text not null,
  customer_approved_by uuid not null references auth.users(id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, broker_client_id)
    references public.broker_clients(organization_id, id) on delete cascade,
  check (pg_catalog.length(pg_catalog.btrim(purpose)) between 1 and 120),
  check (pg_catalog.length(pg_catalog.btrim(evidence_reference)) between 1 and 255),
  check (pg_catalog.cardinality(permitted_capabilities) > 0),
  check (ends_at > starts_at)
);

create unique index if not exists broker_client_assignments_current_member_idx
  on app_private.broker_client_assignments (organization_id, broker_client_id, member_id)
  where revoked_at is null and ends_at is null;

create index if not exists broker_client_assignments_member_active_idx
  on app_private.broker_client_assignments (organization_id, member_id, broker_client_id, starts_at, ends_at)
  where revoked_at is null;

create index if not exists broker_client_mandates_relationship_active_idx
  on app_private.broker_client_mandates (organization_id, broker_client_id, starts_at, ends_at)
  where revoked_at is null;

create index if not exists entitlements_organization_feature_latest_idx
  on public.entitlements (organization_id, feature_key, created_at desc, id desc)
  where organization_id is not null;

insert into app_private.brokerdesk_role_capabilities (role_preset, capability, resource_scope)
select role_preset::app_private.brokerdesk_role_preset,
       capability::app_private.brokerdesk_capability,
       resource_scope::app_private.brokerdesk_resource_scope
from (
  values
    ('owner', 'customers.read', 'organization'),
    ('owner', 'customers.invite', 'organization'),
    ('owner', 'customers.edit_relationship', 'organization'),
    ('owner', 'portfolio.review', 'organization'),
    ('owner', 'portfolio.edit_as_delegate', 'organization'),
    ('owner', 'introductions.create', 'organization'),
    ('owner', 'introductions.send', 'organization'),
    ('owner', 'introductions.record_response', 'organization'),
    ('owner', 'introductions.close', 'organization'),
    ('owner', 'tasks.manage', 'organization'),
    ('owner', 'renewals.manage', 'organization'),
    ('owner', 'team.invite', 'organization'),
    ('owner', 'team.assign', 'organization'),
    ('owner', 'settings.manage', 'organization'),
    ('owner', 'verification.manage', 'organization'),
    ('admin', 'customers.read', 'organization'),
    ('admin', 'customers.invite', 'organization'),
    ('admin', 'customers.edit_relationship', 'organization'),
    ('admin', 'portfolio.review', 'organization'),
    ('admin', 'portfolio.edit_as_delegate', 'organization'),
    ('admin', 'introductions.create', 'organization'),
    ('admin', 'introductions.send', 'organization'),
    ('admin', 'introductions.record_response', 'organization'),
    ('admin', 'introductions.close', 'organization'),
    ('admin', 'tasks.manage', 'organization'),
    ('admin', 'renewals.manage', 'organization'),
    ('admin', 'team.invite', 'organization'),
    ('admin', 'team.assign', 'organization'),
    ('admin', 'settings.manage', 'organization'),
    ('admin', 'verification.manage', 'organization'),
    ('advisor', 'customers.read', 'assigned_customers'),
    ('advisor', 'customers.invite', 'assigned_customers'),
    ('advisor', 'customers.edit_relationship', 'assigned_customers'),
    ('advisor', 'portfolio.review', 'assigned_customers'),
    ('advisor', 'portfolio.edit_as_delegate', 'assigned_customers'),
    ('advisor', 'introductions.create', 'assigned_customers'),
    ('advisor', 'introductions.send', 'assigned_customers'),
    ('advisor', 'introductions.record_response', 'assigned_customers'),
    ('advisor', 'introductions.close', 'assigned_customers'),
    ('advisor', 'tasks.manage', 'assigned_customers'),
    ('advisor', 'renewals.manage', 'assigned_customers'),
    ('coordinator', 'customers.read', 'assigned_customers'),
    ('coordinator', 'customers.edit_relationship', 'assigned_customers'),
    ('coordinator', 'portfolio.review', 'assigned_customers'),
    ('coordinator', 'introductions.record_response', 'assigned_customers'),
    ('coordinator', 'tasks.manage', 'assigned_customers'),
    ('coordinator', 'renewals.manage', 'assigned_customers'),
    ('viewer', 'customers.read', 'assigned_customers'),
    ('viewer', 'portfolio.review', 'assigned_customers')
) as preset(role_preset, capability, resource_scope)
on conflict (role_preset, capability) do update
set resource_scope = excluded.resource_scope;

create or replace function app_private.sync_brokerdesk_member_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapped_preset app_private.brokerdesk_role_preset;
begin
  if not exists (
    select 1
    from public.organizations organization_record
    where organization_record.id = new.organization_id
      and organization_record.type = 'matchmaker_agency'
  ) then
    delete from app_private.organization_member_access
    where member_id = new.id;
    return new;
  end if;

  mapped_preset := case new.role
    when 'owner' then 'owner'::app_private.brokerdesk_role_preset
    when 'admin' then 'admin'::app_private.brokerdesk_role_preset
    when 'broker_agent' then 'advisor'::app_private.brokerdesk_role_preset
    when 'editor' then 'coordinator'::app_private.brokerdesk_role_preset
    else 'viewer'::app_private.brokerdesk_role_preset
  end;

  insert into app_private.organization_member_access (
    organization_id, member_id, role_preset, starts_at, ends_at,
    revoked_at, granted_by, updated_at
  ) values (
    new.organization_id, new.id, mapped_preset, now(), null,
    null, coalesce(new.invited_by, new.user_id), now()
  )
  on conflict (member_id) do update
  set organization_id = excluded.organization_id,
      role_preset = excluded.role_preset,
      starts_at = case
        when app_private.organization_member_access.role_preset is distinct from excluded.role_preset
          then now()
        else app_private.organization_member_access.starts_at
      end,
      ends_at = null,
      revoked_at = null,
      granted_by = excluded.granted_by,
      updated_at = now();

  return new;
end;
$$;

revoke all on function app_private.sync_brokerdesk_member_access() from public, anon, authenticated;

drop trigger if exists sync_brokerdesk_member_access on public.organization_members;
create trigger sync_brokerdesk_member_access
  after insert or update of organization_id, role on public.organization_members
  for each row execute function app_private.sync_brokerdesk_member_access();

insert into app_private.organization_member_access (
  organization_id, member_id, role_preset, starts_at, granted_by
)
select member_record.organization_id,
       member_record.id,
       case member_record.role
         when 'owner' then 'owner'::app_private.brokerdesk_role_preset
         when 'admin' then 'admin'::app_private.brokerdesk_role_preset
         when 'broker_agent' then 'advisor'::app_private.brokerdesk_role_preset
         when 'editor' then 'coordinator'::app_private.brokerdesk_role_preset
         else 'viewer'::app_private.brokerdesk_role_preset
       end,
       member_record.created_at,
       coalesce(member_record.invited_by, member_record.user_id)
from public.organization_members member_record
join public.organizations organization_record
  on organization_record.id = member_record.organization_id
where organization_record.type = 'matchmaker_agency'
on conflict (member_id) do nothing;

create or replace function app_private.brokerdesk_entitlement_enabled(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select entitlement.feature_value = 'true'::jsonb
      and (entitlement.expires_at is null or entitlement.expires_at > now())
    from public.entitlements entitlement
    where entitlement.organization_id = p_organization_id
      and entitlement.feature_key = 'brokerdesk.enabled'
    order by entitlement.created_at desc, entitlement.id desc
    limit 1
  ), false);
$$;

create or replace function app_private.member_has_brokerdesk_capability(
  p_actor_user_id uuid,
  p_workspace_ref text,
  p_capability text,
  p_relationship_ref text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations organization_record
    join public.organization_members member_record
      on member_record.organization_id = organization_record.id
     and member_record.user_id = p_actor_user_id
     and member_record.status = 'active'
    join app_private.organization_member_access member_access
      on member_access.organization_id = organization_record.id
     and member_access.member_id = member_record.id
     and member_access.starts_at <= now()
     and (member_access.ends_at is null or member_access.ends_at > now())
     and member_access.revoked_at is null
    join app_private.brokerdesk_role_capabilities role_capability
      on role_capability.role_preset = member_access.role_preset
     and role_capability.capability::text = p_capability
    where organization_record.workspace_ref = p_workspace_ref
      and organization_record.type = 'matchmaker_agency'
      and organization_record.status = 'active'
      and app_private.brokerdesk_entitlement_enabled(organization_record.id)
      and (
        role_capability.resource_scope = 'organization'
        or (
          role_capability.resource_scope = 'assigned_customers'
          and p_relationship_ref is not null
          and exists (
            select 1
            from public.broker_clients relationship_record
            join app_private.broker_client_assignments assignment
              on assignment.organization_id = relationship_record.organization_id
             and assignment.broker_client_id = relationship_record.id
             and assignment.member_id = member_record.id
             and assignment.starts_at <= now()
             and (assignment.ends_at is null or assignment.ends_at > now())
             and assignment.revoked_at is null
            where relationship_record.organization_id = organization_record.id
              and relationship_record.relationship_ref = p_relationship_ref
              and relationship_record.relationship_status = 'active'
          )
        )
      )
  );
$$;

create or replace function app_private.relationship_has_active_mandate(
  p_workspace_ref text,
  p_relationship_ref text,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations organization_record
    join public.broker_clients relationship_record
      on relationship_record.organization_id = organization_record.id
     and relationship_record.relationship_ref = p_relationship_ref
     and relationship_record.relationship_status = 'active'
    join app_private.broker_client_mandates mandate
      on mandate.organization_id = organization_record.id
     and mandate.broker_client_id = relationship_record.id
     and mandate.starts_at <= now()
     and mandate.ends_at > now()
     and mandate.revoked_at is null
    where organization_record.workspace_ref = p_workspace_ref
      and organization_record.type = 'matchmaker_agency'
      and organization_record.status = 'active'
      and app_private.brokerdesk_entitlement_enabled(organization_record.id)
      and exists (
        select 1
        from pg_catalog.unnest(mandate.permitted_capabilities) permitted(capability)
        where permitted.capability::text = p_capability
      )
  );
$$;

revoke all on function app_private.brokerdesk_entitlement_enabled(uuid) from public, anon, authenticated;
revoke all on function app_private.member_has_brokerdesk_capability(uuid, text, text, text) from public, anon, authenticated;
revoke all on function app_private.relationship_has_active_mandate(text, text, text) from public, anon, authenticated;

create or replace function public.resolve_brokerdesk_access(p_workspace_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  access_record record;
begin
  perform app_private.require_current_session();

  select organization_record.workspace_ref,
         member_access.role_preset,
         coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'key', role_capability.capability::text,
               'scope', role_capability.resource_scope::text
             ) order by role_capability.capability::text
           ) filter (where role_capability.capability is not null),
           '[]'::jsonb
         ) as capabilities
  into access_record
  from public.organizations organization_record
  join public.organization_members member_record
    on member_record.organization_id = organization_record.id
   and member_record.user_id = auth.uid()
   and member_record.status = 'active'
  join app_private.organization_member_access member_access
    on member_access.organization_id = organization_record.id
   and member_access.member_id = member_record.id
   and member_access.starts_at <= now()
   and (member_access.ends_at is null or member_access.ends_at > now())
   and member_access.revoked_at is null
  left join app_private.brokerdesk_role_capabilities role_capability
    on role_capability.role_preset = member_access.role_preset
  where organization_record.workspace_ref = p_workspace_ref
    and organization_record.type = 'matchmaker_agency'
    and organization_record.status = 'active'
    and app_private.brokerdesk_entitlement_enabled(organization_record.id)
  group by organization_record.workspace_ref, member_access.role_preset;

  if access_record.workspace_ref is null then
    return pg_catalog.jsonb_build_object('enabled', false);
  end if;

  return pg_catalog.jsonb_build_object(
    'enabled', true,
    'workspaceRef', access_record.workspace_ref,
    'rolePreset', access_record.role_preset::text,
    'capabilities', access_record.capabilities
  );
end;
$$;

create or replace function public.has_brokerdesk_capability(
  p_workspace_ref text,
  p_capability text,
  p_relationship_ref text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.member_has_brokerdesk_capability(
    auth.uid(), p_workspace_ref, p_capability, p_relationship_ref
  );
end;
$$;

create or replace function public.can_access_brokerdesk_relationship(
  p_workspace_ref text,
  p_relationship_ref text,
  p_capability text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.member_has_brokerdesk_capability(
    auth.uid(), p_workspace_ref, p_capability, p_relationship_ref
  ) and app_private.relationship_has_active_mandate(
    p_workspace_ref, p_relationship_ref, p_capability
  );
end;
$$;

revoke all on function public.resolve_brokerdesk_access(text) from public, anon, authenticated;
revoke all on function public.has_brokerdesk_capability(text, text, text) from public, anon, authenticated;
revoke all on function public.can_access_brokerdesk_relationship(text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_brokerdesk_access(text) to authenticated;
grant execute on function public.has_brokerdesk_capability(text, text, text) to authenticated;
grant execute on function public.can_access_brokerdesk_relationship(text, text, text) to authenticated;

-- Relationship rows are no longer a broad organization CRUD surface. Owners
-- and admins retain organization scope; other presets see only assignments.
-- Mutations will use audited commands in the relationship delivery slice.
revoke insert, update, delete on table public.broker_clients from authenticated;
drop policy if exists "Broker clients visible to org members" on public.broker_clients;
drop policy if exists "Organization operators can manage broker clients" on public.broker_clients;
create policy "BrokerDesk capability scopes relationship reads"
  on public.broker_clients for select to authenticated
  using (
    public.has_brokerdesk_capability(
      (select organization_record.workspace_ref
       from public.organizations organization_record
       where organization_record.id = broker_clients.organization_id),
      'customers.read',
      relationship_ref
    )
  );

comment on column public.organizations.workspace_ref is
  'Opaque, server-generated URL reference. It identifies a workspace but never grants authorization.';
comment on column public.broker_clients.relationship_ref is
  'Opaque, server-generated URL reference. It identifies one agency relationship and never grants authorization.';
comment on function public.resolve_brokerdesk_access(text) is
  'Returns a minimal same-shape BrokerDesk access result after live-session, membership, and entitlement checks.';

revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all sequences in schema app_private from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on functions from public, anon, authenticated;
