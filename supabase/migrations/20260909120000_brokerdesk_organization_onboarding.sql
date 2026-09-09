-- BrokerDesk organization onboarding is intentionally separate from active
-- BrokerDesk access. A workspace remains private and its entitlement remains
-- disabled until a later, audited verification decision activates it.

do $$ begin
  create type app_private.brokerdesk_business_type as enum (
    'sole_proprietorship', 'partnership', 'private_limited',
    'public_limited', 'nonprofit', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_private.brokerdesk_onboarding_status as enum (
    'draft', 'ready_for_verification', 'under_review',
    'needs_attention', 'approved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_private.brokerdesk_onboarding_stage as enum (
    'business', 'representative', 'practice', 'review',
    'verification', 'complete'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_private.organization_verification_type as enum (
    'representative_identity', 'business_registration', 'business_contact'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_private.organization_verification_status as enum (
    'required', 'under_review', 'verified',
    'needs_attention', 'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_private.verification_document_class as enum (
    'business_registration', 'business_authority', 'business_address', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_private.verification_document_quarantine_status as enum (
    'awaiting_upload', 'uploaded', 'scanning', 'clean', 'rejected', 'deleted'
  );
exception when duplicate_object then null; end $$;

create table app_private.organization_business_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  legal_name text not null,
  trading_name text,
  business_type app_private.brokerdesk_business_type not null,
  registration_number text,
  registration_country text,
  primary_city text not null,
  primary_region text,
  primary_country text not null,
  representative_full_name text,
  representative_position text,
  representative_work_email text,
  representative_work_phone text,
  authority_context text,
  service_regions text[] not null default '{}',
  operating_since_year integer,
  website text,
  authority_declared_at timestamptz,
  authority_declaration_version text,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(legal_name)) between 2 and 160),
  check (trading_name is null or length(btrim(trading_name)) between 2 and 160),
  check (registration_number is null or length(registration_number) between 2 and 80),
  check (registration_country is null or registration_country ~ '^[A-Z]{2}$'),
  check (length(btrim(primary_city)) between 2 and 100),
  check (primary_region is null or length(btrim(primary_region)) between 2 and 100),
  check (primary_country ~ '^[A-Z]{2}$'),
  check (representative_work_email is null or length(representative_work_email) <= 254),
  check (cardinality(service_regions) <= 20),
  check (operating_since_year is null or operating_since_year between 1800 and 9999),
  check (website is null or website ~ '^https://')
);

create table app_private.organization_onboarding_states (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status app_private.brokerdesk_onboarding_status not null default 'draft',
  next_stage app_private.brokerdesk_onboarding_stage not null default 'business',
  row_version bigint not null default 1 check (row_version > 0),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_private.organization_verification_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  verification_type app_private.organization_verification_type not null,
  status app_private.organization_verification_status not null default 'required',
  provider text,
  provider_evidence_ref text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  attention_reason text,
  private_details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, verification_type),
  unique (organization_id, id),
  check (provider_evidence_ref is null or length(provider_evidence_ref) <= 255),
  check (attention_reason is null or length(attention_reason) <= 1000)
);

-- Metadata only. No browser policy, upload URL, or release command is exposed
-- until retention, KMS and malware-scanning controls have been approved.
create table app_private.organization_verification_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  verification_check_id uuid,
  document_class app_private.verification_document_class not null,
  storage_bucket text not null,
  storage_object_key text not null unique,
  display_name text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size between 1 and 15728640),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  issuing_country text,
  quarantine_status app_private.verification_document_quarantine_status not null default 'awaiting_upload',
  scan_provider text,
  scanned_at timestamptz,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  retain_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, verification_check_id)
    references app_private.organization_verification_checks(organization_id, id) on delete restrict,
  check (length(display_name) between 1 and 180),
  check (length(content_type) between 3 and 100),
  check (issuing_country is null or issuing_country ~ '^[A-Z]{2}$')
);

create table app_private.brokerdesk_command_idempotency (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  command_name text not null,
  idempotency_key text not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  organization_id uuid references public.organizations(id) on delete cascade,
  safe_result jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (actor_user_id, command_name, idempotency_key),
  check (length(command_name) between 1 and 80),
  check (length(idempotency_key) between 16 and 128)
);

create table app_private.brokerdesk_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  resource_type text not null,
  outcome text not null,
  safe_details jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  check (length(event_name) between 1 and 100),
  check (length(resource_type) between 1 and 80),
  check (outcome in ('succeeded', 'denied', 'failed'))
);

alter table app_private.organization_business_profiles enable row level security;
alter table app_private.organization_onboarding_states enable row level security;
alter table app_private.organization_verification_checks enable row level security;
alter table app_private.organization_verification_documents enable row level security;
alter table app_private.brokerdesk_command_idempotency enable row level security;
alter table app_private.brokerdesk_audit_events enable row level security;

create index organization_verification_checks_org_status_idx
  on app_private.organization_verification_checks (organization_id, status);
create index brokerdesk_audit_events_org_time_idx
  on app_private.brokerdesk_audit_events (organization_id, occurred_at desc);

create function app_private.prevent_brokerdesk_audit_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'BrokerDesk audit events are append-only' using errcode = '55000';
end;
$$;

create trigger prevent_brokerdesk_audit_mutation
  before update or delete on app_private.brokerdesk_audit_events
  for each row execute function app_private.prevent_brokerdesk_audit_mutation();

create function app_private.clean_brokerdesk_text(
  p_value text, p_field text, p_min integer, p_max integer, p_required boolean default false
)
returns text language plpgsql immutable set search_path = '' as $$
declare v_value text := nullif(regexp_replace(btrim(p_value), '\s+', ' ', 'g'), '');
begin
  if v_value is null then
    if p_required then
      raise exception '% is required', p_field using errcode = '22023';
    end if;
    return null;
  end if;
  if length(v_value) < p_min or length(v_value) > p_max then
    raise exception '% has an invalid length', p_field using errcode = '22023';
  end if;
  return v_value;
end;
$$;

create function app_private.normalize_brokerdesk_profile(p_profile jsonb, p_initial boolean default false)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_allowed text[] := array[
    'legalName','tradingName','businessType','registrationNumber','registrationCountry',
    'primaryCity','primaryRegion','primaryCountry','representativeFullName',
    'representativePosition','representativeWorkEmail','representativeWorkPhone',
    'authorityContext','serviceRegions','operatingSinceYear','website',
    'authorityDeclared','termsAccepted'
  ];
  v_initial_allowed text[] := array[
    'legalName','tradingName','businessType','registrationNumber','registrationCountry',
    'primaryCity','primaryRegion','primaryCountry'
  ];
  v_key text;
  v_result jsonb := '{}'::jsonb;
  v_text text;
  v_regions text[];
  v_year integer;
begin
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception 'profile must be an object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_profile) loop
    if not (v_key = any(case when p_initial then v_initial_allowed else v_allowed end)) then
      raise exception 'unsupported profile field: %', v_key using errcode = '22023';
    end if;
  end loop;

  if p_initial and not (p_profile ?& array['legalName','businessType','primaryCity','primaryCountry']) then
    raise exception 'business details are incomplete' using errcode = '22023';
  end if;

  if p_profile ? 'legalName' then
    v_result := v_result || jsonb_build_object('legalName', app_private.clean_brokerdesk_text(p_profile->>'legalName','legalName',2,160,true));
  end if;
  if p_profile ? 'tradingName' then
    v_result := v_result || jsonb_build_object('tradingName', app_private.clean_brokerdesk_text(p_profile->>'tradingName','tradingName',2,160,false));
  end if;
  if p_profile ? 'businessType' then
    begin
      v_text := (p_profile->>'businessType')::app_private.brokerdesk_business_type::text;
    exception when invalid_text_representation then
      raise exception 'businessType is invalid' using errcode = '22023';
    end;
    if v_text is null then
      raise exception 'businessType is required' using errcode = '22023';
    end if;
    v_result := v_result || jsonb_build_object('businessType', v_text);
  end if;
  if p_profile ? 'registrationNumber' then
    v_result := v_result || jsonb_build_object('registrationNumber', app_private.clean_brokerdesk_text(p_profile->>'registrationNumber','registrationNumber',2,80,false));
  end if;
  foreach v_key in array array['registrationCountry','primaryCountry'] loop
    if p_profile ? v_key then
      v_text := upper(app_private.clean_brokerdesk_text(p_profile->>v_key,v_key,2,2,v_key = 'primaryCountry'));
      if v_text is not null and v_text !~ '^[A-Z]{2}$' then
        raise exception '% must be an ISO country code', v_key using errcode = '22023';
      end if;
      v_result := v_result || jsonb_build_object(v_key, v_text);
    end if;
  end loop;
  foreach v_key in array array['primaryCity','primaryRegion','representativeFullName','representativePosition'] loop
    if p_profile ? v_key then
      v_result := v_result || jsonb_build_object(
        v_key,
        app_private.clean_brokerdesk_text(p_profile->>v_key,v_key,2,case when v_key like 'representative%' then 120 else 100 end,v_key = 'primaryCity')
      );
    end if;
  end loop;
  if p_profile ? 'representativeWorkEmail' then
    v_text := lower(app_private.clean_brokerdesk_text(p_profile->>'representativeWorkEmail','representativeWorkEmail',3,254,false));
    if v_text is not null and v_text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'representativeWorkEmail is invalid' using errcode = '22023';
    end if;
    v_result := v_result || jsonb_build_object('representativeWorkEmail', v_text);
  end if;
  if p_profile ? 'representativeWorkPhone' then
    v_text := app_private.clean_brokerdesk_text(p_profile->>'representativeWorkPhone','representativeWorkPhone',7,30,false);
    if v_text is not null and v_text !~ '^\+?[0-9 ()-]{7,30}$' then
      raise exception 'representativeWorkPhone is invalid' using errcode = '22023';
    end if;
    v_result := v_result || jsonb_build_object('representativeWorkPhone', v_text);
  end if;
  if p_profile ? 'authorityContext' then
    v_result := v_result || jsonb_build_object('authorityContext', app_private.clean_brokerdesk_text(p_profile->>'authorityContext','authorityContext',10,1000,false));
  end if;
  if p_profile ? 'website' then
    v_text := app_private.clean_brokerdesk_text(p_profile->>'website','website',8,255,false);
    if v_text is not null and v_text !~ '^https://[^[:space:]]+$' then
      raise exception 'website must use https' using errcode = '22023';
    end if;
    v_result := v_result || jsonb_build_object('website', v_text);
  end if;
  if p_profile ? 'operatingSinceYear' then
    begin v_year := (p_profile->>'operatingSinceYear')::integer;
    exception when invalid_text_representation then
      raise exception 'operatingSinceYear is invalid' using errcode = '22023';
    end;
    if v_year < 1800 or v_year > extract(year from current_date)::integer then
      raise exception 'operatingSinceYear is invalid' using errcode = '22023';
    end if;
    v_result := v_result || jsonb_build_object('operatingSinceYear', v_year);
  end if;
  if p_profile ? 'serviceRegions' then
    if jsonb_typeof(p_profile->'serviceRegions') <> 'array' then
      raise exception 'serviceRegions must be an array' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_profile->'serviceRegions') as entries(value)
      where jsonb_typeof(entries.value) <> 'string'
    ) then
      raise exception 'serviceRegions entries must be text' using errcode = '22023';
    end if;
    select array_agg(region order by region) into v_regions
    from (
      select distinct app_private.clean_brokerdesk_text(value,'serviceRegions',2,120,true) as region
      from jsonb_array_elements_text(p_profile->'serviceRegions')
    ) normalized;
    v_regions := coalesce(v_regions, '{}'::text[]);
    if cardinality(v_regions) > 20 then
      raise exception 'serviceRegions has too many entries' using errcode = '22023';
    end if;
    v_result := v_result || jsonb_build_object('serviceRegions', to_jsonb(v_regions));
  end if;
  foreach v_key in array array['authorityDeclared','termsAccepted'] loop
    if p_profile ? v_key then
      if jsonb_typeof(p_profile->v_key) <> 'boolean' then
        raise exception '% must be boolean', v_key using errcode = '22023';
      end if;
      v_result := v_result || jsonb_build_object(v_key, (p_profile->>v_key)::boolean);
    end if;
  end loop;
  return v_result;
end;
$$;

create function app_private.brokerdesk_onboarding_organization_id(p_actor uuid, p_workspace_ref text)
returns uuid language sql stable security definer set search_path = '' as $$
  select organization_record.id
  from public.organizations organization_record
  join public.organization_members member_record
    on member_record.organization_id = organization_record.id
   and member_record.user_id = p_actor
   and member_record.status = 'active'
  join app_private.organization_member_access member_access
    on member_access.organization_id = organization_record.id
   and member_access.member_id = member_record.id
   and member_access.role_preset = 'owner'
   and member_access.starts_at <= now()
   and (member_access.ends_at is null or member_access.ends_at > now())
   and member_access.revoked_at is null
  where organization_record.workspace_ref = p_workspace_ref
    and organization_record.type = 'matchmaker_agency'
    and organization_record.status in ('onboarding','active')
  limit 1;
$$;

create function app_private.brokerdesk_onboarding_projection(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'available', true,
    'workspaceRef', organization_record.workspace_ref,
    'workspaceName', organization_record.name,
    'workspaceStatus', organization_record.status,
    'onboardingStatus', onboarding.status::text,
    'nextStage', onboarding.next_stage::text,
    'version', onboarding.row_version,
    'profile', jsonb_build_object(
      'legalName', profile.legal_name,
      'tradingName', profile.trading_name,
      'businessType', profile.business_type::text,
      'registrationNumber', profile.registration_number,
      'registrationCountry', profile.registration_country,
      'primaryCity', profile.primary_city,
      'primaryRegion', profile.primary_region,
      'primaryCountry', profile.primary_country,
      'representativeFullName', profile.representative_full_name,
      'representativePosition', profile.representative_position,
      'representativeWorkEmail', profile.representative_work_email,
      'representativeWorkPhone', profile.representative_work_phone,
      'authorityContext', profile.authority_context,
      'serviceRegions', to_jsonb(profile.service_regions),
      'operatingSinceYear', profile.operating_since_year,
      'website', profile.website,
      'authorityDeclared', profile.authority_declared_at is not null,
      'termsAccepted', profile.terms_accepted_at is not null
    ),
    'verificationChecks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', verification.verification_type::text,
        'status', verification.status::text,
        'expiresAt', verification.expires_at,
        'attentionReason', verification.attention_reason
      ) order by verification.verification_type::text)
      from app_private.organization_verification_checks verification
      where verification.organization_id = organization_record.id
    ), '[]'::jsonb)
  )
  from public.organizations organization_record
  join app_private.organization_business_profiles profile on profile.organization_id = organization_record.id
  join app_private.organization_onboarding_states onboarding on onboarding.organization_id = organization_record.id
  where organization_record.id = p_organization_id;
$$;

create function public.resolve_brokerdesk_bootstrap()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_workspaces jsonb; v_count integer;
begin
  perform app_private.require_current_session();
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
    'workspaceRef', organization_record.workspace_ref,
    'workspaceName', organization_record.name,
    'workspaceStatus', organization_record.status,
    'onboardingStatus', onboarding.status::text,
    'nextStage', onboarding.next_stage::text,
    'rolePreset', member_access.role_preset::text
  ) order by organization_record.created_at), '[]'::jsonb)
  into v_count, v_workspaces
  from public.organizations organization_record
  join public.organization_members member_record
    on member_record.organization_id = organization_record.id
   and member_record.user_id = auth.uid() and member_record.status = 'active'
  join app_private.organization_member_access member_access
    on member_access.organization_id = organization_record.id
   and member_access.member_id = member_record.id
   and member_access.starts_at <= now()
   and (member_access.ends_at is null or member_access.ends_at > now())
   and member_access.revoked_at is null
  left join app_private.organization_onboarding_states onboarding on onboarding.organization_id = organization_record.id
  where organization_record.type = 'matchmaker_agency'
    and organization_record.status in ('onboarding','active');

  return jsonb_build_object(
    'workspaces', v_workspaces,
    'nextAction', case
      when v_count = 0 then 'create_workspace'
      when v_count > 1 then 'choose_workspace'
      when (v_workspaces->0->>'workspaceStatus') = 'active' then 'open_workspace'
      else 'resume_onboarding'
    end
  );
end;
$$;

create function public.create_brokerdesk_workspace(p_profile jsonb, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid; v_profile jsonb; v_hash text; v_existing record;
  v_organization_id uuid; v_result jsonb;
begin
  perform app_private.require_current_session();
  v_actor := auth.uid();
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_.:-]{16,128}$' then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  v_profile := app_private.normalize_brokerdesk_profile(p_profile, true);
  v_hash := encode(extensions.digest(convert_to(v_profile::text, 'UTF8'), 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':create-workspace:' || p_idempotency_key, 0));

  select * into v_existing from app_private.brokerdesk_command_idempotency
  where actor_user_id = v_actor and command_name = 'create_workspace'
    and idempotency_key = p_idempotency_key and expires_at > now();
  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'idempotency key was already used for a different request' using errcode = '22023';
    end if;
    return v_existing.safe_result;
  end if;
  if (select count(*) from public.organization_members member_record
      join public.organizations organization_record on organization_record.id = member_record.organization_id
      where member_record.user_id = v_actor and member_record.status = 'active'
        and member_record.role = 'owner' and organization_record.type = 'matchmaker_agency'
        and organization_record.status in ('onboarding','active')) >= 3 then
    raise exception 'workspace limit reached' using errcode = '22023';
  end if;

  insert into public.organizations (type, name, status, created_by, metadata)
  values ('matchmaker_agency', v_profile->>'legalName', 'onboarding', v_actor, jsonb_build_object('createdVia','brokerdesk_onboarding'))
  returning id into v_organization_id;
  insert into public.organization_members (organization_id, user_id, role, status, invited_by)
  values (v_organization_id, v_actor, 'owner', 'active', v_actor);
  insert into public.matchmaker_profiles (organization_id, display_name, service_regions, verification_status, metadata)
  values (v_organization_id, coalesce(v_profile->>'tradingName',v_profile->>'legalName'), '{}', 'pending', jsonb_build_object('privateUntilVerified',true));
  insert into public.entitlements (organization_id, feature_key, feature_value, source)
  values (v_organization_id, 'brokerdesk.enabled', 'false'::jsonb, 'onboarding');
  insert into app_private.organization_business_profiles (
    organization_id, legal_name, trading_name, business_type, registration_number,
    registration_country, primary_city, primary_region, primary_country
  ) values (
    v_organization_id, v_profile->>'legalName', v_profile->>'tradingName',
    (v_profile->>'businessType')::app_private.brokerdesk_business_type,
    v_profile->>'registrationNumber', v_profile->>'registrationCountry',
    v_profile->>'primaryCity', v_profile->>'primaryRegion', v_profile->>'primaryCountry'
  );
  insert into app_private.organization_onboarding_states (organization_id, next_stage)
  values (v_organization_id, 'representative');
  insert into app_private.organization_verification_checks (organization_id, verification_type)
  values (v_organization_id, 'representative_identity'),
         (v_organization_id, 'business_registration'),
         (v_organization_id, 'business_contact');
  insert into app_private.brokerdesk_audit_events
    (organization_id, actor_user_id, event_name, resource_type, outcome, safe_details)
  values (v_organization_id, v_actor, 'workspace.created', 'workspace', 'succeeded', jsonb_build_object('onboardingStage','representative'));

  v_result := app_private.brokerdesk_onboarding_projection(v_organization_id);
  insert into app_private.brokerdesk_command_idempotency
    (actor_user_id, command_name, idempotency_key, request_hash, organization_id, safe_result)
  values (v_actor, 'create_workspace', p_idempotency_key, v_hash, v_organization_id, v_result);
  return v_result;
end;
$$;

create function public.resolve_brokerdesk_onboarding(p_workspace_ref text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_organization_id uuid;
begin
  perform app_private.require_current_session();
  if p_workspace_ref is null or p_workspace_ref !~ '^wrk_[0-9a-f]{32}$' then
    return '{"available":false}'::jsonb;
  end if;
  v_organization_id := app_private.brokerdesk_onboarding_organization_id(auth.uid(), p_workspace_ref);
  if v_organization_id is null then return '{"available":false}'::jsonb; end if;
  return app_private.brokerdesk_onboarding_projection(v_organization_id);
end;
$$;

create function public.save_brokerdesk_onboarding_profile(
  p_workspace_ref text, p_profile jsonb, p_expected_version bigint,
  p_submit_for_verification boolean, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid; v_organization_id uuid; v_profile jsonb; v_hash text; v_existing record;
  v_current app_private.organization_business_profiles%rowtype;
  v_state app_private.organization_onboarding_states%rowtype;
  v_next_stage app_private.brokerdesk_onboarding_stage; v_result jsonb;
begin
  perform app_private.require_current_session();
  v_actor := auth.uid();
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_.:-]{16,128}$'
     or p_expected_version is null or p_expected_version < 1 then
    raise exception 'invalid command metadata' using errcode = '22023';
  end if;
  v_organization_id := app_private.brokerdesk_onboarding_organization_id(v_actor, p_workspace_ref);
  if v_organization_id is null then raise exception 'workspace is unavailable' using errcode = '42501'; end if;
  v_profile := app_private.normalize_brokerdesk_profile(p_profile, false);
  if v_profile = '{}'::jsonb and not coalesce(p_submit_for_verification,false) then
    raise exception 'profile update is empty' using errcode = '22023';
  end if;
  v_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'workspaceRef',p_workspace_ref,'profile',v_profile,'version',p_expected_version,
    'submit',coalesce(p_submit_for_verification,false))::text, 'UTF8'), 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':save-onboarding:' || p_idempotency_key, 0));
  select * into v_existing from app_private.brokerdesk_command_idempotency
  where actor_user_id = v_actor and command_name = 'save_onboarding_profile'
    and idempotency_key = p_idempotency_key and expires_at > now();
  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'idempotency key was already used for a different request' using errcode = '22023';
    end if;
    return v_existing.safe_result;
  end if;

  select * into v_state from app_private.organization_onboarding_states
  where organization_id = v_organization_id for update;
  if v_state.row_version <> p_expected_version then
    raise exception 'onboarding version conflict' using errcode = '40001';
  end if;
  if v_state.status in ('under_review','approved') then
    raise exception 'onboarding cannot be edited in its current state' using errcode = '55000';
  end if;

  update app_private.organization_business_profiles set
    legal_name = case when v_profile ? 'legalName' then v_profile->>'legalName' else legal_name end,
    trading_name = case when v_profile ? 'tradingName' then v_profile->>'tradingName' else trading_name end,
    business_type = case when v_profile ? 'businessType' then (v_profile->>'businessType')::app_private.brokerdesk_business_type else business_type end,
    registration_number = case when v_profile ? 'registrationNumber' then v_profile->>'registrationNumber' else registration_number end,
    registration_country = case when v_profile ? 'registrationCountry' then v_profile->>'registrationCountry' else registration_country end,
    primary_city = case when v_profile ? 'primaryCity' then v_profile->>'primaryCity' else primary_city end,
    primary_region = case when v_profile ? 'primaryRegion' then v_profile->>'primaryRegion' else primary_region end,
    primary_country = case when v_profile ? 'primaryCountry' then v_profile->>'primaryCountry' else primary_country end,
    representative_full_name = case when v_profile ? 'representativeFullName' then v_profile->>'representativeFullName' else representative_full_name end,
    representative_position = case when v_profile ? 'representativePosition' then v_profile->>'representativePosition' else representative_position end,
    representative_work_email = case when v_profile ? 'representativeWorkEmail' then v_profile->>'representativeWorkEmail' else representative_work_email end,
    representative_work_phone = case when v_profile ? 'representativeWorkPhone' then v_profile->>'representativeWorkPhone' else representative_work_phone end,
    authority_context = case when v_profile ? 'authorityContext' then v_profile->>'authorityContext' else authority_context end,
    service_regions = case when v_profile ? 'serviceRegions' then array(select jsonb_array_elements_text(v_profile->'serviceRegions')) else service_regions end,
    operating_since_year = case when v_profile ? 'operatingSinceYear' then (v_profile->>'operatingSinceYear')::integer else operating_since_year end,
    website = case when v_profile ? 'website' then v_profile->>'website' else website end,
    authority_declared_at = case when v_profile ? 'authorityDeclared' then case when (v_profile->>'authorityDeclared')::boolean then coalesce(authority_declared_at,now()) else null end else authority_declared_at end,
    authority_declaration_version = case when v_profile ? 'authorityDeclared' then case when (v_profile->>'authorityDeclared')::boolean then '2026-09-09' else null end else authority_declaration_version end,
    terms_accepted_at = case when v_profile ? 'termsAccepted' then case when (v_profile->>'termsAccepted')::boolean then coalesce(terms_accepted_at,now()) else null end else terms_accepted_at end,
    terms_version = case when v_profile ? 'termsAccepted' then case when (v_profile->>'termsAccepted')::boolean then '2026-09-09' else null end else terms_version end,
    updated_at = now()
  where organization_id = v_organization_id
  returning * into v_current;

  if v_current.representative_full_name is null or v_current.representative_position is null
     or (v_current.representative_work_email is null and v_current.representative_work_phone is null) then
    v_next_stage := 'representative';
  elsif cardinality(v_current.service_regions) = 0 or v_current.operating_since_year is null
        or v_current.authority_context is null then
    v_next_stage := 'practice';
  else
    v_next_stage := 'review';
  end if;
  if coalesce(p_submit_for_verification,false) then
    if v_next_stage <> 'review' or v_current.authority_declared_at is null or v_current.terms_accepted_at is null then
      raise exception 'onboarding is incomplete' using errcode = '22023';
    end if;
    v_next_stage := 'verification';
  end if;

  update app_private.organization_onboarding_states set
    status = case when coalesce(p_submit_for_verification,false) then 'ready_for_verification' else 'draft' end,
    next_stage = v_next_stage,
    submitted_at = case when coalesce(p_submit_for_verification,false) then now() else submitted_at end,
    row_version = row_version + 1, updated_at = now()
  where organization_id = v_organization_id;
  update public.organizations set name = v_current.legal_name, updated_at = now()
  where id = v_organization_id;
  update public.matchmaker_profiles set
    display_name = coalesce(v_current.trading_name,v_current.legal_name),
    service_regions = v_current.service_regions, updated_at = now()
  where organization_id = v_organization_id;
  insert into app_private.brokerdesk_audit_events
    (organization_id, actor_user_id, event_name, resource_type, outcome, safe_details)
  values (v_organization_id, v_actor,
    case when coalesce(p_submit_for_verification,false) then 'onboarding.submitted' else 'onboarding.saved' end,
    'workspace_onboarding','succeeded',jsonb_build_object('nextStage',v_next_stage::text));
  v_result := app_private.brokerdesk_onboarding_projection(v_organization_id);
  insert into app_private.brokerdesk_command_idempotency
    (actor_user_id,command_name,idempotency_key,request_hash,organization_id,safe_result)
  values (v_actor,'save_onboarding_profile',p_idempotency_key,v_hash,v_organization_id,v_result);
  return v_result;
end;
$$;

-- The legacy generic organization command remains available for its original
-- domains, but it cannot bypass the BrokerDesk onboarding lifecycle.
create or replace function public.create_organization_with_owner(
  p_type public.organization_type,
  p_name text,
  p_slug text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_current_session();
  if p_type = 'matchmaker_agency' then
    raise exception 'matchmaker agencies must use BrokerDesk onboarding' using errcode = '22023';
  end if;
  return app_private.create_organization_with_owner(p_type, p_name, p_slug);
end;
$$;

revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all sequences in schema app_private from public, anon, authenticated;
-- Preserve non-BrokerDesk organization management while removing agency
-- onboarding/activation from the legacy direct-table policy path.
drop policy if exists "Organization owners and admins can update organizations" on public.organizations;
create policy "Non-BrokerDesk owners and admins can update organizations"
  on public.organizations for update to authenticated
  using (
    type <> 'matchmaker_agency'
    and public.has_organization_role(id, array['owner','admin']::public.organization_member_role[])
  )
  with check (
    type <> 'matchmaker_agency'
    and public.has_organization_role(id, array['owner','admin']::public.organization_member_role[])
  );
drop policy if exists "Organization owners can delete organizations" on public.organizations;
create policy "Non-BrokerDesk owners can delete organizations"
  on public.organizations for delete to authenticated
  using (
    type <> 'matchmaker_agency'
    and public.has_organization_role(id, array['owner']::public.organization_member_role[])
  );
revoke insert, update, delete on table public.matchmaker_profiles from authenticated;
revoke all on function app_private.prevent_brokerdesk_audit_mutation() from public, anon, authenticated;
revoke all on function app_private.clean_brokerdesk_text(text,text,integer,integer,boolean) from public, anon, authenticated;
revoke all on function app_private.normalize_brokerdesk_profile(jsonb,boolean) from public, anon, authenticated;
revoke all on function app_private.brokerdesk_onboarding_organization_id(uuid,text) from public, anon, authenticated;
revoke all on function app_private.brokerdesk_onboarding_projection(uuid) from public, anon, authenticated;
revoke all on function public.resolve_brokerdesk_bootstrap() from public, anon, authenticated;
revoke all on function public.create_brokerdesk_workspace(jsonb,text) from public, anon, authenticated;
revoke all on function public.resolve_brokerdesk_onboarding(text) from public, anon, authenticated;
revoke all on function public.save_brokerdesk_onboarding_profile(text,jsonb,bigint,boolean,text) from public, anon, authenticated;
revoke all on function public.create_organization_with_owner(public.organization_type,text,text) from public, anon, authenticated;
grant execute on function public.resolve_brokerdesk_bootstrap() to authenticated;
grant execute on function public.create_brokerdesk_workspace(jsonb,text) to authenticated;
grant execute on function public.resolve_brokerdesk_onboarding(text) to authenticated;
grant execute on function public.save_brokerdesk_onboarding_profile(text,jsonb,bigint,boolean,text) to authenticated;
grant execute on function public.create_organization_with_owner(public.organization_type,text,text) to authenticated;

comment on table app_private.organization_verification_documents is
  'Quarantined metadata only. No upload or release RPC exists until retention, KMS and malware scanning are approved.';
comment on function public.resolve_brokerdesk_onboarding(text) is
  'Owner-only onboarding projection. Missing, malformed and unauthorized workspace references return the same unavailable shape.';

-- Onboarding reads and writes have independent budgets so a noisy dashboard
-- cannot consume authentication or customer-workflow capacity.
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
  v_now timestamptz := now();
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
    ('brokerdesk_onboarding_write', 30, 300)
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
      when app_private.api_rate_limits.window_started_at <= v_now - make_interval(secs => window_seconds)
      then v_now else app_private.api_rate_limits.window_started_at end,
    request_count = case
      when app_private.api_rate_limits.window_started_at <= v_now - make_interval(secs => window_seconds)
      then 1 else app_private.api_rate_limits.request_count + 1 end,
    updated_at = v_now
  returning * into limit_record;

  return jsonb_build_object(
    'allowed', limit_record.request_count <= action_limit,
    'retryAfter', case when limit_record.request_count <= action_limit then 0 else greatest(
      1, ceil(extract(epoch from (
        limit_record.window_started_at + make_interval(secs => window_seconds) - v_now
      )))::integer
    ) end
  );
end;
$$;

revoke all on function public.consume_api_rate_limit(text,text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,text) to anon, authenticated;
