-- BrokerDesk customer intake is deliberately separate from the customer-owned
-- candidate and portfolio. A manual invitation stores only audience hashes and
-- a masked hint. It becomes an agency relationship only after the intended,
-- verified account explicitly consents and owns a canonical candidate.

alter table public.broker_clients
  add column if not exists relationship_source text not null default 'legacy',
  add column if not exists invited_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists consented_at timestamptz,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists row_version bigint not null default 1;

update public.broker_clients
set starts_at = coalesce(starts_at, created_at)
where starts_at is null;

alter table public.broker_clients
  alter column starts_at set not null;

alter table public.broker_clients
  drop constraint if exists broker_clients_relationship_status_check,
  add constraint broker_clients_relationship_status_check check (relationship_status in (
    'invited', 'intake_pending', 'claim_pending', 'active', 'paused', 'expired', 'terminated'
  )),
  add constraint broker_clients_relationship_source_check check (relationship_source in (
    'legacy', 'customer_invitation', 'customer_import'
  )),
  add constraint broker_clients_term_check check (ends_at is null or ends_at > starts_at),
  add constraint broker_clients_row_version_check check (row_version > 0),
  add constraint broker_clients_consent_order_check check (
    consented_at is null or (claimed_at is not null and consented_at >= claimed_at)
  );

create table app_private.broker_client_intakes (
  id uuid primary key default extensions.gen_random_uuid(),
  invitation_ref text not null unique default app_private.generate_public_reference('inv'),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  email_hint text not null check (pg_catalog.length(email_hint) between 5 and 254),
  token_hash text unique check (token_hash is null or token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  consented_at timestamptz,
  consent_version text not null default 'broker-representation-v1',
  relationship_id uuid,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (invitation_ref ~ '^inv_[0-9a-f]{32}$'),
  check (expires_at > invited_at),
  check ((claimed_at is null and claimed_by is null and consented_at is null)
    or (claimed_at is not null and claimed_by is not null and consented_at is not null)),
  check ((relationship_id is null and activated_at is null)
    or (relationship_id is not null and activated_at is not null)),
  check (activated_at is null or consented_at is not null),
  check (consent_version = 'broker-representation-v1'),
  foreign key (organization_id, relationship_id)
    references public.broker_clients(organization_id, id) on delete restrict
);

alter table app_private.broker_client_intakes enable row level security;
revoke all on table app_private.broker_client_intakes from public, anon, authenticated;

create unique index broker_client_intakes_active_email_idx
  on app_private.broker_client_intakes (organization_id, email_hash)
  where token_hash is not null and claimed_at is null and revoked_at is null;
create index broker_client_intakes_claimed_user_idx
  on app_private.broker_client_intakes (claimed_by, claimed_at desc)
  where claimed_at is not null and revoked_at is null;
create index broker_client_intakes_org_status_idx
  on app_private.broker_client_intakes (organization_id, created_at desc);
create index broker_client_intakes_expiry_idx
  on app_private.broker_client_intakes (expires_at)
  where claimed_at is null and revoked_at is null;

create or replace function app_private.activate_broker_client_intake(
  p_intake_id uuid,
  p_actor_user_id uuid,
  p_candidate_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake app_private.broker_client_intakes%rowtype;
  relationship public.broker_clients%rowtype;
  mandate_end timestamptz;
begin
  select * into intake from app_private.broker_client_intakes
  where id = p_intake_id for update;

  if not found or intake.claimed_by is distinct from p_actor_user_id
    or intake.claimed_at is null or intake.consented_at is null
    or intake.revoked_at is not null
    or intake.consented_at + interval '1 year' <= pg_catalog.now()
    or not exists (
      select 1 from public.organizations organization
      where organization.id = intake.organization_id
        and organization.type = 'matchmaker_agency'
        and organization.status = 'active'
        and app_private.brokerdesk_entitlement_enabled(organization.id)
    ) then
    return null;
  end if;
  if not exists (
    select 1 from public.candidates candidate
    where candidate.id = p_candidate_id
      and candidate.primary_owner_user_id = p_actor_user_id
  ) then
    return null;
  end if;

  mandate_end := intake.consented_at + interval '1 year';
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    intake.organization_id::text || ':customer:' || p_candidate_id::text, 0
  ));

  select * into relationship from public.broker_clients
  where organization_id = intake.organization_id and candidate_id = p_candidate_id
  for update;

  if not found then
    insert into public.broker_clients (
      organization_id, candidate_id, relationship_status, relationship_source,
      introduced_by, invited_at, claimed_at, consented_at, starts_at, ends_at
    ) values (
      intake.organization_id, p_candidate_id, 'active', 'customer_invitation',
      intake.invited_by, intake.invited_at, intake.claimed_at, intake.consented_at,
      intake.consented_at, mandate_end
    ) returning * into relationship;
  else
    update public.broker_clients
    set relationship_status = 'active', relationship_source = 'customer_invitation',
        introduced_by = intake.invited_by, invited_at = intake.invited_at,
        claimed_at = intake.claimed_at, consented_at = intake.consented_at,
        starts_at = intake.consented_at, ends_at = mandate_end,
        row_version = row_version + 1, updated_at = pg_catalog.now()
    where id = relationship.id returning * into relationship;
  end if;

  update app_private.broker_client_mandates
  set revoked_at = pg_catalog.now(), revoked_by = p_actor_user_id, updated_at = pg_catalog.now()
  where organization_id = intake.organization_id
    and broker_client_id = relationship.id
    and revoked_at is null;

  insert into app_private.broker_client_mandates (
    organization_id, broker_client_id, purpose, permitted_capabilities,
    evidence_reference, customer_approved_by, starts_at, ends_at
  ) values (
    intake.organization_id, relationship.id,
    'Matrimonial matchmaking representation',
    array[
      'customers.read', 'customers.edit_relationship', 'portfolio.review',
      'introductions.create', 'introductions.send',
      'introductions.record_response', 'introductions.close',
      'tasks.manage', 'renewals.manage'
    ]::app_private.brokerdesk_capability[],
    intake.invitation_ref || ':' || intake.consent_version,
    p_actor_user_id, intake.consented_at, mandate_end
  );

  update app_private.broker_client_intakes
  set relationship_id = relationship.id, activated_at = pg_catalog.now(),
      token_hash = null, updated_at = pg_catalog.now()
  where id = intake.id;

  insert into app_private.brokerdesk_audit_events
    (organization_id, actor_user_id, event_name, resource_type, outcome, safe_details)
  values (
    intake.organization_id, p_actor_user_id, 'customer.relationship.activated',
    'broker_client', 'succeeded',
    pg_catalog.jsonb_build_object(
      'invitationRef', intake.invitation_ref,
      'relationshipRef', relationship.relationship_ref
    )
  );
  return relationship.id;
end;
$$;

create or replace function app_private.activate_claimed_intakes_for_portfolio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare intake_record record;
begin
  if new.candidate_id is null or new.user_id is null
    or new.candidate_id is not distinct from old.candidate_id then
    return new;
  end if;
  for intake_record in
    select intake.id from app_private.broker_client_intakes intake
    where intake.claimed_by = new.user_id and intake.claimed_at is not null
      and intake.consented_at is not null and intake.relationship_id is null
      and intake.revoked_at is null
  loop
    perform app_private.activate_broker_client_intake(
      intake_record.id, new.user_id, new.candidate_id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists activate_claimed_intakes_for_portfolio on public.portfolios;
create trigger activate_claimed_intakes_for_portfolio
  after update of candidate_id on public.portfolios
  for each row execute function app_private.activate_claimed_intakes_for_portfolio();

create or replace function public.create_brokerdesk_customer_invitation(
  p_workspace_ref text,
  p_email_hash text,
  p_email_hint text,
  p_token_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  organization_record public.organizations%rowtype;
  request_hash text;
  existing app_private.brokerdesk_command_idempotency%rowtype;
  intake app_private.broker_client_intakes%rowtype;
  result jsonb;
begin
  perform app_private.require_current_session();
  if actor_id is null or p_workspace_ref !~ '^wrk_[0-9a-f]{32}$'
    or p_email_hash !~ '^[a-f0-9]{64}$'
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or pg_catalog.length(coalesce(p_email_hint, '')) not between 5 and 254
    or p_idempotency_key !~ '^[A-Za-z0-9_.:-]{16,128}$' then
    raise exception 'customer invitation unavailable' using errcode = '22023';
  end if;

  select organization.* into organization_record
  from public.organizations organization
  where organization.workspace_ref = p_workspace_ref
    and organization.type = 'matchmaker_agency'
    and organization.status = 'active';
  if not found or not app_private.brokerdesk_entitlement_enabled(organization_record.id)
    or not app_private.member_has_brokerdesk_capability(
      actor_id, p_workspace_ref, 'customers.invite', null
    ) then
    raise exception 'customer invitation unavailable' using errcode = '42501';
  end if;

  request_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object(
      'workspaceRef', p_workspace_ref, 'emailHash', p_email_hash,
      'emailHint', p_email_hint, 'tokenHash', p_token_hash
    )::text, 'UTF8'
  ), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor_id::text || ':customer-invite:' || p_idempotency_key, 0
  ));
  select * into existing from app_private.brokerdesk_command_idempotency
  where actor_user_id = actor_id
    and command_name = 'create_customer_invitation'
    and idempotency_key = p_idempotency_key
    and expires_at > pg_catalog.now();
  if found then
    if existing.request_hash <> request_hash then
      raise exception 'idempotency key was already used for a different request' using errcode = '22023';
    end if;
    return existing.safe_result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    organization_record.id::text || ':customer-invite-email:' || p_email_hash, 0
  ));
  if (select count(*) from app_private.broker_client_intakes candidate_intake
      where candidate_intake.organization_id = organization_record.id
        and candidate_intake.created_at > pg_catalog.now() - interval '24 hours') >= 500 then
    raise exception 'workspace customer invitation quota exceeded' using errcode = '42501';
  end if;

  update app_private.broker_client_intakes
  set revoked_at = pg_catalog.now(), token_hash = null, updated_at = pg_catalog.now()
  where organization_id = organization_record.id and email_hash = p_email_hash
    and claimed_at is null and revoked_at is null;

  insert into app_private.broker_client_intakes (
    organization_id, email_hash, email_hint, token_hash, invited_by, expires_at
  ) values (
    organization_record.id, p_email_hash, p_email_hint, p_token_hash,
    actor_id, pg_catalog.now() + interval '7 days'
  ) returning * into intake;

  result := pg_catalog.jsonb_build_object(
    'status', 'created', 'invitationRef', intake.invitation_ref,
    'workspaceRef', p_workspace_ref, 'emailHint', intake.email_hint,
    'expiresAt', intake.expires_at
  );
  insert into app_private.brokerdesk_audit_events
    (organization_id, actor_user_id, event_name, resource_type, outcome, safe_details)
  values (
    organization_record.id, actor_id, 'customer.invitation.created',
    'customer_invitation', 'succeeded',
    pg_catalog.jsonb_build_object(
      'invitationRef', intake.invitation_ref, 'emailHint', intake.email_hint
    )
  );
  insert into app_private.brokerdesk_command_idempotency
    (actor_user_id, command_name, idempotency_key, request_hash, organization_id, safe_result)
  values (
    actor_id, 'create_customer_invitation', p_idempotency_key, request_hash,
    organization_record.id, result
  );
  return result;
end;
$$;

create or replace function public.claim_brokerdesk_customer_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email_hash text;
  intake app_private.broker_client_intakes%rowtype;
  organization_record public.organizations%rowtype;
  candidate_id uuid;
  relationship_id uuid;
  relationship_ref text;
begin
  perform app_private.require_current_session();
  if actor_id is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return '{"available":false}'::jsonb;
  end if;
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.lower(pg_catalog.btrim(user_record.email)), 'UTF8'
  ), 'sha256'), 'hex') into actor_email_hash
  from auth.users user_record
  where user_record.id = actor_id and user_record.email_confirmed_at is not null;
  if actor_email_hash is null then return '{"available":false}'::jsonb; end if;

  select * into intake from app_private.broker_client_intakes
  where token_hash = p_token_hash for update;
  if not found or intake.email_hash <> actor_email_hash
    or intake.claimed_at is not null or intake.revoked_at is not null
    or intake.expires_at <= pg_catalog.now() then
    return '{"available":false}'::jsonb;
  end if;
  select organization.* into organization_record
  from public.organizations organization
  where organization.id = intake.organization_id
    and organization.type = 'matchmaker_agency'
    and organization.status = 'active';
  if not found or not app_private.brokerdesk_entitlement_enabled(organization_record.id) then
    return '{"available":false}'::jsonb;
  end if;

  update app_private.broker_client_intakes
  set claimed_by = actor_id, claimed_at = pg_catalog.now(),
      consented_at = pg_catalog.now(), token_hash = null, updated_at = pg_catalog.now()
  where id = intake.id returning * into intake;

  select portfolio.candidate_id into candidate_id
  from public.portfolios portfolio
  where portfolio.user_id = actor_id and portfolio.candidate_id is not null
  limit 1;

  insert into app_private.brokerdesk_audit_events
    (organization_id, actor_user_id, event_name, resource_type, outcome, safe_details)
  values (
    organization_record.id, actor_id, 'customer.invitation.claimed',
    'customer_invitation', 'succeeded',
    pg_catalog.jsonb_build_object(
      'invitationRef', intake.invitation_ref,
      'portfolioRequired', candidate_id is null
    )
  );

  if candidate_id is not null then
    relationship_id := app_private.activate_broker_client_intake(
      intake.id, actor_id, candidate_id
    );
    select broker_client.relationship_ref into relationship_ref
    from public.broker_clients broker_client where broker_client.id = relationship_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'status', case when relationship_id is null then 'portfolio_required' else 'active' end,
    'invitationRef', intake.invitation_ref,
    'workspaceName', organization_record.name,
    'relationshipRef', relationship_ref,
    'relationshipEndsAt', intake.consented_at + interval '1 year'
  );
end;
$$;

create or replace function public.resolve_brokerdesk_customers(p_workspace_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); v_organization_id uuid;
begin
  perform app_private.require_current_session();
  select organization.id into v_organization_id from public.organizations organization
  where organization.workspace_ref = p_workspace_ref
    and organization.type = 'matchmaker_agency'
    and organization.status = 'active'
    and app_private.brokerdesk_entitlement_enabled(organization.id);
  if v_organization_id is null then return '{"available":false}'::jsonb; end if;
  if not app_private.member_has_brokerdesk_capability(actor_id, p_workspace_ref, 'customers.read', null)
    and not exists (
      select 1 from public.broker_clients relationship
      where relationship.organization_id = v_organization_id
        and app_private.member_has_brokerdesk_capability(
          actor_id, p_workspace_ref, 'customers.read', relationship.relationship_ref
        )
    ) then return '{"available":false}'::jsonb; end if;

  return pg_catalog.jsonb_build_object(
    'available', true, 'workspaceRef', p_workspace_ref,
    'customers', coalesce((
      select pg_catalog.jsonb_agg(item order by sort_at desc) from (
        select pg_catalog.jsonb_build_object(
          'kind', 'relationship', 'relationshipRef', relationship.relationship_ref,
          'displayName', case
            when portfolio.is_published and portfolio.published_data is not null then
              coalesce(nullif(pg_catalog.btrim(portfolio.published_data #>> '{personal,name}'), ''), 'Customer')
            else 'Customer' end,
          'gender', case
            when portfolio.is_published and portfolio.published_data is not null
              then portfolio.published_data #>> '{personal,gender}'
            else null end,
          'relationshipStatus', case
            when relationship.ends_at is not null and relationship.ends_at <= pg_catalog.now()
              then 'expired'
            else relationship.relationship_status end,
          'portfolioStatus', case when portfolio.is_published then 'published' else 'completing' end,
          'startsAt', relationship.starts_at, 'endsAt', relationship.ends_at
        ) as item, relationship.updated_at as sort_at
        from public.broker_clients relationship
        left join public.portfolios portfolio on portfolio.candidate_id = relationship.candidate_id
        where relationship.organization_id = v_organization_id
          and relationship.consented_at is not null
          and app_private.member_has_brokerdesk_capability(
            actor_id, p_workspace_ref, 'customers.read', relationship.relationship_ref
          )
          and app_private.relationship_has_active_mandate(
            p_workspace_ref, relationship.relationship_ref, 'customers.read'
          )
        union all
        select pg_catalog.jsonb_build_object(
          'kind', 'invitation', 'invitationRef', intake.invitation_ref,
          'emailHint', intake.email_hint,
          'invitationStatus', case
            when intake.revoked_at is not null then 'revoked'
            when intake.activated_at is not null then 'active'
            when intake.claimed_at is not null then 'portfolio_required'
            when intake.expires_at <= pg_catalog.now() then 'expired'
            else 'invited' end,
          'expiresAt', intake.expires_at
        ) as item, intake.updated_at as sort_at
        from app_private.broker_client_intakes intake
        where intake.organization_id = v_organization_id
          and app_private.member_has_brokerdesk_capability(
            actor_id, p_workspace_ref, 'customers.read', null
          )
          and intake.activated_at is null
        order by sort_at desc
        limit 200
      ) projection
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.resolve_customer_broker_relationships()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
begin
  perform app_private.require_current_session();
  return pg_catalog.jsonb_build_object('available', true, 'relationships', coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relationshipRef', relationship.relationship_ref,
      'workspaceName', organization.name,
      'relationshipStatus', case
        when relationship.ends_at is not null and relationship.ends_at <= pg_catalog.now()
          then 'expired'
        else relationship.relationship_status end,
      'startsAt', relationship.starts_at,
      'endsAt', relationship.ends_at
    ) order by relationship.updated_at desc)
    from public.broker_clients relationship
    join public.organizations organization on organization.id = relationship.organization_id
    join public.candidates candidate on candidate.id = relationship.candidate_id
    where candidate.primary_owner_user_id = actor_id
  ), '[]'::jsonb));
end;
$$;

-- Relationship rows contain internal candidate and tenant identifiers. Browser
-- access is projection-only even if a caller attempts direct PostgREST queries.
revoke select, insert, update, delete on table public.broker_clients from authenticated;
drop policy if exists "BrokerDesk capability scopes relationship reads" on public.broker_clients;

revoke all on function app_private.activate_broker_client_intake(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function app_private.activate_claimed_intakes_for_portfolio() from public, anon, authenticated;
revoke all on function public.create_brokerdesk_customer_invitation(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.claim_brokerdesk_customer_invitation(text) from public, anon, authenticated;
revoke all on function public.resolve_brokerdesk_customers(text) from public, anon, authenticated;
revoke all on function public.resolve_customer_broker_relationships() from public, anon, authenticated;
grant execute on function public.create_brokerdesk_customer_invitation(text,text,text,text,text) to authenticated;
grant execute on function public.claim_brokerdesk_customer_invitation(text) to authenticated;
grant execute on function public.resolve_brokerdesk_customers(text) to authenticated;
grant execute on function public.resolve_customer_broker_relationships() to authenticated;

comment on table app_private.broker_client_intakes is
  'Private, audience-bound BrokerDesk customer invitations. No intake becomes a candidate or shareable portfolio.';
comment on function public.claim_brokerdesk_customer_invitation(text) is
  'Claims an invitation for the exact verified email and activates only the account owner canonical candidate.';

-- Rate limits are compile-time allowlisted; callers cannot select a policy.
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
    ('brokerdesk_team_invitation_exchange',20,3600),('brokerdesk_team_invitation_accept',10,3600),
    ('brokerdesk_customer_read',60,60),('brokerdesk_customer_invite',100,3600),
    ('brokerdesk_customer_invitation_exchange',20,3600),('brokerdesk_customer_invitation_claim',10,3600),
    ('customer_broker_relationships_read',60,60)
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
