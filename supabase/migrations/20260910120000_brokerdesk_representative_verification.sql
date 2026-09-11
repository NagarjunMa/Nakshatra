-- Generalize the existing candidate-only identity perimeter so the same Didit
-- session, webhook, worker, consent, retry, redaction, and audit machinery can
-- verify a BrokerDesk representative. A representative is never modelled as a
-- matrimonial candidate, and raw representative birth dates are not retained.

alter table app_private.identity_verification_subjects
  add column id uuid not null default extensions.gen_random_uuid(),
  add column subject_type text not null default 'candidate',
  add column organization_id uuid references public.organizations(id) on delete cascade,
  add column subject_user_id uuid references auth.users(id) on delete cascade,
  add column expected_birth_date_hash text;

alter table app_private.identity_verification_subjects
  drop constraint identity_verification_subjects_pkey,
  alter column candidate_id drop not null,
  add primary key (id),
  add constraint identity_verification_subject_candidate_key unique (candidate_id),
  add constraint identity_verification_subject_type_check
    check (subject_type in ('candidate', 'organization_representative')),
  add constraint identity_verification_subject_domain_check check (
    (subject_type = 'candidate'
      and candidate_id is not null
      and organization_id is null
      and subject_user_id is null
      and expected_birth_date_hash is null)
    or
    (subject_type = 'organization_representative'
      and candidate_id is null
      and organization_id is not null
      and subject_user_id is not null
      and (
        (status = 'pending' and expected_birth_date_hash ~ '^[a-f0-9]{64}$')
        or (status <> 'pending' and expected_birth_date_hash is null)
      ))
  );

create unique index identity_verification_subject_representative_idx
  on app_private.identity_verification_subjects(organization_id)
  where subject_type = 'organization_representative';

alter table app_private.identity_verification_attempts
  add column subject_id uuid;
update app_private.identity_verification_attempts attempt
set subject_id = subject_record.id
from app_private.identity_verification_subjects subject_record
where subject_record.provider_subject_ref = attempt.provider_subject_ref;
alter table app_private.identity_verification_attempts
  alter column subject_id set not null,
  alter column candidate_id drop not null,
  add constraint identity_verification_attempt_subject_fk
    foreign key (subject_id) references app_private.identity_verification_subjects(id) on delete cascade;
create index identity_verification_attempt_subject_created_idx
  on app_private.identity_verification_attempts(subject_id, created_at desc);

alter table app_private.identity_verification_management_tokens
  add column subject_id uuid;
update app_private.identity_verification_management_tokens management
set subject_id = subject_record.id
from app_private.identity_verification_subjects subject_record
where subject_record.candidate_id = management.candidate_id;
alter table app_private.identity_verification_management_tokens
  alter column subject_id set not null,
  alter column candidate_id drop not null,
  add constraint identity_verification_management_subject_fk
    foreign key (subject_id) references app_private.identity_verification_subjects(id) on delete cascade;
create index identity_verification_management_subject_idx
  on app_private.identity_verification_management_tokens(subject_id, expires_at);

alter table app_private.identity_verification_worker_state
  add column subject_id uuid;
update app_private.identity_verification_worker_state state
set subject_id = coalesce(
  (select attempt.subject_id from app_private.identity_verification_attempts attempt where attempt.id = state.attempt_id),
  (select subject_record.id from app_private.identity_verification_subjects subject_record where subject_record.candidate_id = state.candidate_id)
);
alter table app_private.identity_verification_worker_state
  drop constraint identity_verification_worker_state_pkey,
  alter column subject_id set not null,
  alter column candidate_id drop not null,
  add constraint identity_verification_worker_subject_fk
    foreign key (subject_id) references app_private.identity_verification_subjects(id) on delete cascade,
  add primary key (subject_id, task_type);

create function app_private.enforce_identity_verification_attempt_subject_binding()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from app_private.identity_verification_subjects subject_record
    where subject_record.id = new.subject_id
      and subject_record.candidate_id is not distinct from new.candidate_id
      and subject_record.provider_subject_ref = new.provider_subject_ref
  ) then
    raise exception 'identity verification subject binding is invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function app_private.enforce_identity_verification_management_subject_binding()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from app_private.identity_verification_subjects subject_record
    where subject_record.id = new.subject_id
      and subject_record.candidate_id is not distinct from new.candidate_id
  ) then
    raise exception 'identity verification subject binding is invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function app_private.enforce_identity_verification_worker_subject_binding()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from app_private.identity_verification_subjects subject_record
    where subject_record.id = new.subject_id
      and subject_record.candidate_id is not distinct from new.candidate_id
  ) or (
    new.attempt_id is not null and not exists (
      select 1 from app_private.identity_verification_attempts attempt
      where attempt.id = new.attempt_id
        and attempt.subject_id = new.subject_id
        and attempt.candidate_id is not distinct from new.candidate_id
    )
  ) then
    raise exception 'identity verification worker binding is invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enforce_identity_verification_attempt_subject_binding
  before insert or update of subject_id, candidate_id, provider_subject_ref
  on app_private.identity_verification_attempts
  for each row execute function app_private.enforce_identity_verification_attempt_subject_binding();
create trigger enforce_identity_verification_management_subject_binding
  before insert or update of subject_id, candidate_id
  on app_private.identity_verification_management_tokens
  for each row execute function app_private.enforce_identity_verification_management_subject_binding();
create trigger enforce_identity_verification_worker_subject_binding
  before insert or update of subject_id, candidate_id, attempt_id
  on app_private.identity_verification_worker_state
  for each row execute function app_private.enforce_identity_verification_worker_subject_binding();

create function app_private.invalidate_representative_identity_after_name_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_subject_id uuid;
begin
  if pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(old.representative_full_name), '\s+', ' ', 'g'))
    is not distinct from
    pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(new.representative_full_name), '\s+', ' ', 'g')) then
    return new;
  end if;

  select subject_record.id into v_subject_id
  from app_private.identity_verification_subjects subject_record
  where subject_record.organization_id = new.organization_id
    and subject_record.subject_type = 'organization_representative'
  for update;
  if v_subject_id is null then return new; end if;

  update app_private.identity_verification_attempts
  set status = 'revoked', completed_at = coalesce(completed_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where subject_id = v_subject_id and status in ('created','invited','in_progress','verified');
  update app_private.identity_verification_management_tokens
  set revoked_at = pg_catalog.now()
  where subject_id = v_subject_id and consumed_at is null and revoked_at is null;
  update app_private.identity_verification_subjects
  set status = 'revoked', verified_at = null, expires_at = null,
      revoked_at = pg_catalog.now(), revocation_reason = 'representative name changed',
      expected_birth_date_hash = null, updated_at = pg_catalog.now()
  where id = v_subject_id;
  update app_private.organization_verification_checks
  set status = 'required', verified_at = null, expires_at = null,
      attention_reason = 'Verify the updated representative identity.', updated_at = pg_catalog.now()
  where organization_id = new.organization_id and verification_type = 'representative_identity';
  update public.organizations
  set status = 'onboarding', updated_at = pg_catalog.now()
  where id = new.organization_id and type = 'matchmaker_agency' and status = 'active';
  insert into public.entitlements(organization_id,feature_key,feature_value,source)
  values(new.organization_id,'brokerdesk.enabled','false'::jsonb,'representative_identity_invalidated');
  insert into app_private.brokerdesk_audit_events(
    organization_id,actor_user_id,event_name,resource_type,outcome,safe_details
  ) values (
    new.organization_id,auth.uid(),'representative.identity_verification_invalidated',
    'organization_verification','succeeded','{"reason":"representative_name_changed"}'::jsonb
  );
  return new;
end;
$$;

create trigger invalidate_representative_identity_after_name_change
  after update of representative_full_name on app_private.organization_business_profiles
  for each row execute function app_private.invalidate_representative_identity_after_name_change();

-- Existing candidate helpers keep their public signatures. New work is keyed
-- by the normalized subject so both domains share one durable queue.
create or replace function app_private.enqueue_identity_verification_work(
  -- Keep the legacy argument name because PostgreSQL does not permit an input
  -- parameter rename through CREATE OR REPLACE FUNCTION. The value now points
  -- to the normalized verification subject for either supported domain.
  p_candidate_id uuid,
  p_attempt_id uuid,
  p_task_type text,
  p_run_after timestamptz default pg_catalog.now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
begin
  if p_task_type not in ('reconcile', 'provider_redaction') then
    raise exception 'invalid identity verification work type' using errcode = '22023';
  end if;
  select attempt.candidate_id into v_candidate_id
  from app_private.identity_verification_attempts attempt
  where attempt.id = p_attempt_id and attempt.subject_id = p_candidate_id;
  if not found then
    raise exception 'identity verification attempt is unavailable' using errcode = '22023';
  end if;

  insert into app_private.identity_verification_worker_state(
    subject_id, candidate_id, attempt_id, task_type, run_after, claim_token,
    claimed_at, lease_expires_at, attempts, last_error_code, completed_at, updated_at
  ) values (
    p_candidate_id, v_candidate_id, p_attempt_id, p_task_type, p_run_after, null,
    null, null, 0, null, null, pg_catalog.now()
  )
  on conflict (subject_id, task_type) do update
  set candidate_id = excluded.candidate_id,
      attempt_id = case
        when app_private.identity_verification_worker_state.lease_expires_at > pg_catalog.now()
        then app_private.identity_verification_worker_state.attempt_id else excluded.attempt_id end,
      run_after = least(app_private.identity_verification_worker_state.run_after, excluded.run_after),
      claim_token = case
        when app_private.identity_verification_worker_state.lease_expires_at > pg_catalog.now()
        then app_private.identity_verification_worker_state.claim_token else null end,
      claimed_at = case
        when app_private.identity_verification_worker_state.lease_expires_at > pg_catalog.now()
        then app_private.identity_verification_worker_state.claimed_at else null end,
      lease_expires_at = case
        when app_private.identity_verification_worker_state.lease_expires_at > pg_catalog.now()
        then app_private.identity_verification_worker_state.lease_expires_at else null end,
      last_error_code = case
        when app_private.identity_verification_worker_state.lease_expires_at > pg_catalog.now()
        then app_private.identity_verification_worker_state.last_error_code else null end,
      completed_at = null,
      updated_at = pg_catalog.now();
end;
$$;

create or replace function app_private.enqueue_identity_verification_redaction()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.provider_session_ref is not null
    and new.status in ('verified', 'declined', 'failed', 'expired', 'revoked')
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    perform app_private.enqueue_identity_verification_work(new.subject_id, new.id, 'provider_redaction');
  end if;
  return new;
end;
$$;

create or replace function public.begin_identity_verification(
  p_candidate_id uuid,
  p_invitation_token_hash text,
  p_management_token_hash text
)
returns table(attempt_id uuid, provider_subject_ref uuid, legal_name text, birth_date date)
language plpgsql security definer set search_path = '' as $$
declare
  candidate_record public.candidates%rowtype;
  invitation_record app_private.identity_verification_invitations%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
  attempt_record app_private.identity_verification_attempts%rowtype;
  selected_candidate_id uuid;
begin
  if auth.uid() is not null then perform app_private.require_current_session(); end if;
  if (p_candidate_id is null) = (p_invitation_token_hash is null)
    or p_management_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid verification authorization' using errcode = '22023';
  end if;

  if p_candidate_id is not null then
    select * into candidate_record from public.candidates candidate
    where candidate.id = p_candidate_id and candidate.primary_owner_user_id = auth.uid() for update;
    if candidate_record.id is null then raise exception 'self verification is unavailable' using errcode = '42501'; end if;
    selected_candidate_id := p_candidate_id;
  else
    if p_invitation_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid invitation token' using errcode = '22023'; end if;
    select * into invitation_record from app_private.identity_verification_invitations invitation
    where invitation.token_hash = p_invitation_token_hash for update;
    if invitation_record.id is null or invitation_record.consumed_at is not null
      or invitation_record.revoked_at is not null or invitation_record.expires_at <= pg_catalog.now() then
      raise exception 'invitation is unavailable' using errcode = '22023';
    end if;
    selected_candidate_id := invitation_record.candidate_id;
    select * into candidate_record from public.candidates candidate where candidate.id = selected_candidate_id for update;
    update app_private.identity_verification_invitations set consumed_at = pg_catalog.now() where id = invitation_record.id;
  end if;
  if candidate_record.id is null or nullif(pg_catalog.btrim(candidate_record.legal_name),'') is null
    or candidate_record.birth_date is null then
    raise exception 'verification details are unavailable' using errcode = '22023';
  end if;

  select * into subject_record from app_private.identity_verification_subjects subject
  where subject.candidate_id = selected_candidate_id and subject.subject_type = 'candidate' for update;
  if subject_record.id is null then raise exception 'identity verification subject is missing' using errcode = '23503'; end if;
  select * into attempt_record from app_private.identity_verification_attempts attempt
  where attempt.subject_id = subject_record.id and attempt.status in ('created','invited','in_progress')
  order by attempt.created_at desc limit 1 for update;
  if attempt_record.id is null then
    insert into app_private.identity_verification_attempts(
      subject_id,candidate_id,provider_subject_ref,status,consent_version,consented_at,
      consent_purpose,consent_processing_details,consent_retention_details,consent_withdrawal_details
    ) values (
      subject_record.id,selected_candidate_id,subject_record.provider_subject_ref,'created','2026-08-28',pg_catalog.now(),
      'Identity verification before public Nakshatra portfolio publication.',
      'Nakshatra sends your legal name, date of birth, India document country, and approved document types to Didit for hosted identity verification.',
      'Nakshatra retains only the verification state and consent record; identity evidence remains with Didit and is not stored by Nakshatra.',
      'Use your private verification-management link to withdraw consent. Withdrawal revokes Nakshatra verification immediately.'
    ) returning * into attempt_record;
  end if;
  insert into app_private.identity_verification_management_tokens(subject_id,candidate_id,token_hash,scope,expires_at)
  values(subject_record.id,selected_candidate_id,p_management_token_hash,'withdraw_consent',pg_catalog.now()+interval '30 days');
  return query select attempt_record.id,attempt_record.provider_subject_ref,candidate_record.legal_name,candidate_record.birth_date;
end;
$$;

create function public.begin_brokerdesk_representative_verification(
  p_workspace_ref text,
  p_birth_date_hash text,
  p_management_token_hash text,
  p_proof_hash text
)
returns table(attempt_id uuid, provider_subject_ref uuid, legal_name text)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  profile_record app_private.organization_business_profiles%rowtype;
  state_record app_private.organization_onboarding_states%rowtype;
  check_record app_private.organization_verification_checks%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
  attempt_record app_private.identity_verification_attempts%rowtype;
begin
  perform app_private.require_current_session();
  if p_workspace_ref !~ '^wrk_[0-9a-f]{32}$'
    or p_birth_date_hash !~ '^[a-f0-9]{64}$'
    or p_management_token_hash !~ '^[a-f0-9]{64}$'
    or p_proof_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'representative verification is unavailable' using errcode = '22023';
  end if;
  v_organization_id := app_private.brokerdesk_onboarding_organization_id(v_actor,p_workspace_ref);
  if v_organization_id is null then raise exception 'workspace unavailable' using errcode = '42501'; end if;

  select * into profile_record from app_private.organization_business_profiles profile
  where profile.organization_id = v_organization_id for update;
  select * into state_record from app_private.organization_onboarding_states state
  where state.organization_id = v_organization_id for update;
  select * into check_record from app_private.organization_verification_checks verification
  where verification.organization_id = v_organization_id
    and verification.verification_type = 'representative_identity' for update;
  if nullif(pg_catalog.btrim(profile_record.representative_full_name),'') is null
    or profile_record.authority_declared_at is null or profile_record.terms_accepted_at is null
    or state_record.status not in ('ready_for_verification','under_review','needs_attention')
    or check_record.id is null then
    raise exception 'representative verification is unavailable' using errcode = '22023';
  end if;
  if check_record.status = 'verified' and check_record.expires_at > pg_catalog.now() then
    raise exception 'representative is already verified' using errcode = '22023';
  end if;
  select * into subject_record from app_private.identity_verification_subjects subject
  where subject.organization_id = v_organization_id and subject.subject_type = 'organization_representative' for update;
  if subject_record.id is not null and subject_record.subject_user_id <> v_actor then
    raise exception 'workspace unavailable' using errcode = '42501';
  end if;
  if subject_record.id is not null and exists(
    select 1 from app_private.identity_verification_attempts attempt
    where attempt.subject_id = subject_record.id and attempt.status in ('invited','in_progress')
  ) then
    raise exception 'representative verification is already in progress' using errcode = '40001';
  end if;
  if app_private.consume_brokerdesk_action_reauth(v_organization_id,'verification_manage',p_proof_hash) <> 'consumed' then
    raise exception 'fresh verification proof required' using errcode = '42501';
  end if;
  if subject_record.id is null then
    insert into app_private.identity_verification_subjects(
      subject_type,organization_id,subject_user_id,expected_birth_date_hash,status
    ) values ('organization_representative',v_organization_id,v_actor,p_birth_date_hash,'pending')
    returning * into subject_record;
  else
    update app_private.identity_verification_subjects
    set expected_birth_date_hash=p_birth_date_hash,status='pending',verified_at=null,expires_at=null,
        revoked_at=null,revocation_reason=null,updated_at=pg_catalog.now()
    where id=subject_record.id returning * into subject_record;
  end if;

  update app_private.identity_verification_attempts
  set status='revoked',completed_at=coalesce(completed_at,pg_catalog.now()),updated_at=pg_catalog.now()
  where subject_id=subject_record.id and status='created' and provider_session_ref is null;
  insert into app_private.identity_verification_attempts(
    subject_id,candidate_id,provider_subject_ref,status,consent_version,consented_at,
    consent_purpose,consent_processing_details,consent_retention_details,consent_withdrawal_details
  ) values (
    subject_record.id,null,subject_record.provider_subject_ref,'created','2026-09-10',pg_catalog.now(),
    'Identity verification of the person responsible for a private BrokerDesk business workspace.',
    'Nakshatra sends the representative name, date of birth, India document country, and approved document types to Didit for hosted identity verification.',
    'Nakshatra stores a keyed birth-date comparison and normalized verification state. Identity evidence remains with Didit and is scheduled for deletion.',
    'Use the private verification-management link to withdraw consent. Withdrawal revokes representative verification immediately.'
  ) returning * into attempt_record;
  update app_private.identity_verification_management_tokens
  set revoked_at=pg_catalog.now()
  where subject_id=subject_record.id and consumed_at is null and revoked_at is null;
  insert into app_private.identity_verification_management_tokens(subject_id,candidate_id,token_hash,scope,expires_at)
  values(subject_record.id,null,p_management_token_hash,'withdraw_consent',pg_catalog.now()+interval '30 days');
  insert into app_private.brokerdesk_audit_events(organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
  values(v_organization_id,v_actor,'representative.identity_verification_prepared','organization_verification','succeeded','{}'::jsonb);
  return query select attempt_record.id,attempt_record.provider_subject_ref,
    profile_record.representative_full_name;
end;
$$;

create or replace function public.attach_identity_verification_provider_session(
  p_attempt_id uuid,p_provider_session_ref text,p_management_token_hash text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  attempt_record app_private.identity_verification_attempts%rowtype;
  management_record app_private.identity_verification_management_tokens%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
begin
  if auth.uid() is not null then perform app_private.require_current_session(); end if;
  if p_provider_session_ref is null or pg_catalog.char_length(p_provider_session_ref) not between 8 and 128
    or p_management_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid provider session reference' using errcode = '22023';
  end if;
  select * into attempt_record from app_private.identity_verification_attempts attempt
  where attempt.id=p_attempt_id for update;
  if attempt_record.id is null or attempt_record.status not in ('created','invited','in_progress')
    or (attempt_record.provider_session_ref is not null and attempt_record.provider_session_ref<>p_provider_session_ref) then
    raise exception 'verification session cannot be attached' using errcode = '22023';
  end if;
  select * into management_record from app_private.identity_verification_management_tokens management
  where management.token_hash=p_management_token_hash and management.subject_id=attempt_record.subject_id for update;
  if management_record.id is null or management_record.consumed_at is not null
    or management_record.revoked_at is not null or management_record.expires_at<=pg_catalog.now() then
    raise exception 'verification session cannot be attached' using errcode = '22023';
  end if;
  update app_private.identity_verification_attempts set provider_session_ref=p_provider_session_ref,
    status='in_progress',started_at=coalesce(started_at,pg_catalog.now()),updated_at=pg_catalog.now()
  where id=p_attempt_id;
  perform app_private.enqueue_identity_verification_work(
    attempt_record.subject_id,attempt_record.id,'reconcile',pg_catalog.now()+interval '5 minutes'
  );
  select * into subject_record from app_private.identity_verification_subjects where id=attempt_record.subject_id;
  if subject_record.subject_type='organization_representative' then
    update app_private.organization_verification_checks set status='under_review',provider='didit',
      attention_reason=null,updated_at=pg_catalog.now()
    where organization_id=subject_record.organization_id and verification_type='representative_identity';
    update app_private.organization_onboarding_states set status='under_review',next_stage='verification',
      updated_at=pg_catalog.now()
    where organization_id=subject_record.organization_id and status<>'approved';
    insert into app_private.brokerdesk_audit_events(organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
    values(subject_record.organization_id,subject_record.subject_user_id,'representative.identity_verification_started','organization_verification','succeeded','{}'::jsonb);
  end if;
end;
$$;

create or replace function app_private.record_identity_verification_webhook(
  p_provider_event_hash text,p_payload_digest text,p_attempt_id uuid,
  p_provider_session_ref text,p_provider_subject_ref uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare attempt_record app_private.identity_verification_attempts%rowtype; event_record_id uuid;
begin
  perform app_private.require_identity_verification_worker();
  if p_provider_event_hash !~ '^[a-f0-9]{64}$' or p_payload_digest !~ '^[a-f0-9]{64}$'
    or p_provider_session_ref is null or pg_catalog.char_length(p_provider_session_ref) not between 8 and 128 then
    raise exception 'invalid identity verification webhook envelope' using errcode='22023';
  end if;
  select * into attempt_record from app_private.identity_verification_attempts attempt
  where attempt.id=p_attempt_id and attempt.provider_session_ref=p_provider_session_ref
    and attempt.provider_subject_ref=p_provider_subject_ref for update;
  if attempt_record.id is null then return false; end if;
  insert into app_private.identity_verification_webhook_events(provider_event_hash,attempt_id,payload_digest)
  values(p_provider_event_hash,attempt_record.id,p_payload_digest)
  on conflict(provider_event_hash) do nothing returning id into event_record_id;
  if event_record_id is null then return true; end if;
  perform app_private.enqueue_identity_verification_work(attempt_record.subject_id,attempt_record.id,'reconcile');
  return true;
end;
$$;

drop function public.claim_identity_verification_work(integer);
drop function app_private.claim_identity_verification_work(integer);
create function app_private.claim_identity_verification_work(p_limit integer)
returns table(
  subject_id uuid,candidate_id uuid,subject_type text,task_type text,claim_token uuid,
  attempt_id uuid,provider_session_ref text,legal_name text,birth_date date,birth_date_hash text
)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform app_private.require_identity_verification_worker();
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid work claim limit' using errcode='22023'; end if;
  return query with eligible as (
    select state.subject_id,state.task_type from app_private.identity_verification_worker_state state
    where state.attempt_id is not null and state.completed_at is null and state.run_after<=pg_catalog.now()
      and (state.lease_expires_at is null or state.lease_expires_at<=pg_catalog.now())
    order by state.run_after,state.subject_id,state.task_type for update skip locked limit p_limit
  ), claimed as (
    update app_private.identity_verification_worker_state state set claim_token=extensions.gen_random_uuid(),
      claimed_at=pg_catalog.now(),lease_expires_at=pg_catalog.now()+interval '10 minutes',
      attempts=state.attempts+1,updated_at=pg_catalog.now()
    from eligible where state.subject_id=eligible.subject_id and state.task_type=eligible.task_type
    returning state.subject_id,state.candidate_id,state.task_type,state.claim_token,state.attempt_id
  )
  select claimed.subject_id,claimed.candidate_id,subject_record.subject_type,claimed.task_type,
    claimed.claim_token,claimed.attempt_id,attempt.provider_session_ref,
    case when subject_record.subject_type='candidate' then candidate.legal_name else profile.representative_full_name end,
    case when subject_record.subject_type='candidate' then candidate.birth_date else null end,
    subject_record.expected_birth_date_hash
  from claimed
  join app_private.identity_verification_attempts attempt on attempt.id=claimed.attempt_id
  join app_private.identity_verification_subjects subject_record on subject_record.id=claimed.subject_id
  left join public.candidates candidate on candidate.id=subject_record.candidate_id
  left join app_private.organization_business_profiles profile on profile.organization_id=subject_record.organization_id;
end;
$$;

create function public.claim_identity_verification_work(p_limit integer default 10)
returns table(
  subject_id uuid,candidate_id uuid,subject_type text,task_type text,claim_token uuid,
  attempt_id uuid,provider_session_ref text,legal_name text,birth_date date,birth_date_hash text
)
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_identity_verification_worker();
  return query select * from app_private.claim_identity_verification_work(p_limit);
end;
$$;

create or replace function app_private.complete_identity_verification_reconciliation(
  p_attempt_id uuid,p_claim_token uuid,p_outcome text,p_id_verified boolean,
  p_passive_liveness_verified boolean,p_face_match_verified boolean,
  p_name_matches boolean,p_birth_date_matches boolean
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  state_record app_private.identity_verification_worker_state%rowtype;
  attempt_record app_private.identity_verification_attempts%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
  v_check_status app_private.organization_verification_status;
begin
  perform app_private.require_identity_verification_worker();
  if p_outcome not in ('pending','verified','declined','expired') then raise exception 'invalid identity verification outcome' using errcode='22023'; end if;
  if p_outcome='verified' and not(p_id_verified and p_passive_liveness_verified and p_face_match_verified and p_name_matches and p_birth_date_matches) then
    raise exception 'verified identity outcome requires every required check' using errcode='23514';
  end if;
  select * into state_record from app_private.identity_verification_worker_state state
  where state.attempt_id=p_attempt_id and state.task_type='reconcile' and state.claim_token=p_claim_token
    and state.lease_expires_at>pg_catalog.now() and state.completed_at is null for update;
  if state_record.subject_id is null then return false; end if;
  select * into attempt_record from app_private.identity_verification_attempts attempt
  where attempt.id=p_attempt_id and attempt.subject_id=state_record.subject_id for update;
  if attempt_record.id is null then return false; end if;
  select * into subject_record from app_private.identity_verification_subjects subject where subject.id=state_record.subject_id for update;

  if attempt_record.status in ('redacted','revoked') then
    update app_private.identity_verification_worker_state set completed_at=pg_catalog.now(),claim_token=null,
      claimed_at=null,lease_expires_at=null,last_error_code=null,updated_at=pg_catalog.now()
    where subject_id=state_record.subject_id and task_type='reconcile';
    if attempt_record.status='revoked' and attempt_record.provider_session_ref is not null then
      perform app_private.enqueue_identity_verification_work(state_record.subject_id,attempt_record.id,'provider_redaction');
    end if;
    return true;
  end if;
  if p_outcome='pending' then
    update app_private.identity_verification_worker_state set run_after=pg_catalog.now()+interval '5 minutes',
      claim_token=null,claimed_at=null,lease_expires_at=null,last_error_code=null,updated_at=pg_catalog.now()
    where subject_id=state_record.subject_id and task_type='reconcile';
    return true;
  end if;
  if attempt_record.status<>'in_progress' then return false; end if;
  update app_private.identity_verification_attempts set status=p_outcome,
    completed_at=coalesce(completed_at,pg_catalog.now()),updated_at=pg_catalog.now() where id=attempt_record.id;
  if p_outcome='verified' then
    update app_private.identity_verification_subjects set status='verified',verified_at=pg_catalog.now(),
      expires_at=pg_catalog.now()+interval '365 days',revoked_at=null,revocation_reason=null,
      expected_birth_date_hash=null,updated_at=pg_catalog.now()
    where id=state_record.subject_id and status<>'revoked';
    if not found then raise exception 'identity verification has been revoked' using errcode='22023'; end if;
  else
    update app_private.identity_verification_subjects set status=case when p_outcome='expired' then 'expired' else 'failed' end,
      verified_at=null,expires_at=null,expected_birth_date_hash=null,updated_at=pg_catalog.now()
    where id=state_record.subject_id and status<>'revoked';
  end if;
  if subject_record.subject_type='organization_representative' then
    v_check_status := case when p_outcome='verified' then 'verified'::app_private.organization_verification_status
      when p_outcome='expired' then 'expired'::app_private.organization_verification_status
      else 'needs_attention'::app_private.organization_verification_status end;
    update app_private.organization_verification_checks set status=v_check_status,provider='didit',
      verified_at=case when p_outcome='verified' then pg_catalog.now() else null end,
      expires_at=case when p_outcome='verified' then pg_catalog.now()+interval '365 days' else null end,
      attention_reason=case when p_outcome='declined' then 'Identity verification needs another attempt.'
        when p_outcome='expired' then 'Identity verification expired before completion.' else null end,
      updated_at=pg_catalog.now()
    where organization_id=subject_record.organization_id and verification_type='representative_identity';
    update app_private.organization_onboarding_states set
      status=case when p_outcome='verified' then 'under_review'::app_private.brokerdesk_onboarding_status else 'needs_attention'::app_private.brokerdesk_onboarding_status end,
      next_stage='verification',updated_at=pg_catalog.now()
    where organization_id=subject_record.organization_id and status<>'approved';
    insert into app_private.brokerdesk_audit_events(organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
    values(subject_record.organization_id,subject_record.subject_user_id,'representative.identity_verification_completed',
      'organization_verification','succeeded',pg_catalog.jsonb_build_object('result',p_outcome));
  end if;
  update app_private.identity_verification_worker_state set completed_at=pg_catalog.now(),claim_token=null,
    claimed_at=null,lease_expires_at=null,last_error_code=null,updated_at=pg_catalog.now()
  where subject_id=state_record.subject_id and task_type='reconcile';
  return true;
end;
$$;

create or replace function app_private.complete_identity_verification_provider_redaction(
  p_attempt_id uuid,p_claim_token uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare state_record app_private.identity_verification_worker_state%rowtype;
begin
  perform app_private.require_identity_verification_worker();
  select * into state_record from app_private.identity_verification_worker_state state
  where state.attempt_id=p_attempt_id and state.task_type='provider_redaction' and state.claim_token=p_claim_token
    and state.lease_expires_at>pg_catalog.now() and state.completed_at is null for update;
  if state_record.subject_id is null then return false; end if;
  update app_private.identity_verification_attempts set status=case when status in ('verified','declined','failed','expired') then 'redacted' else status end,
    provider_redacted_at=coalesce(provider_redacted_at,pg_catalog.now()),updated_at=pg_catalog.now() where id=p_attempt_id;
  if not found then return false; end if;
  update app_private.identity_verification_worker_state set completed_at=pg_catalog.now(),claim_token=null,
    claimed_at=null,lease_expires_at=null,last_error_code=null,updated_at=pg_catalog.now()
  where subject_id=state_record.subject_id and task_type='provider_redaction';
  return true;
end;
$$;

create or replace function public.get_identity_verification_link_status(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  invitation_record app_private.identity_verification_invitations%rowtype;
  management_record app_private.identity_verification_management_tokens%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
  attempt_status text;
begin
  if auth.uid() is not null then perform app_private.require_current_session(); end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'verification link is unavailable' using errcode='22023'; end if;
  select * into invitation_record from app_private.identity_verification_invitations where token_hash=p_token_hash;
  if invitation_record.id is not null then
    if invitation_record.consumed_at is null and invitation_record.revoked_at is null and invitation_record.expires_at>pg_catalog.now() then
      return '{"kind":"invitation","status":"ready"}'::jsonb;
    end if;
    raise exception 'verification link is unavailable' using errcode='22023';
  end if;
  select * into management_record from app_private.identity_verification_management_tokens where token_hash=p_token_hash;
  if management_record.id is null or management_record.consumed_at is not null or management_record.revoked_at is not null
    or management_record.expires_at<=pg_catalog.now() then raise exception 'verification link is unavailable' using errcode='22023'; end if;
  select * into subject_record from app_private.identity_verification_subjects where id=management_record.subject_id;
  select attempt.status into attempt_status from app_private.identity_verification_attempts attempt
  where attempt.subject_id=management_record.subject_id order by attempt.created_at desc limit 1;
  return pg_catalog.jsonb_build_object('kind','management','status',coalesce(attempt_status,'pending'),
    'canRetry',subject_record.subject_type='candidate' and coalesce(attempt_status in ('created','failed','expired','declined'),false),
    'canWithdraw',management_record.scope='withdraw_consent');
end;
$$;

create or replace function public.withdraw_identity_verification_consent(p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  management_record app_private.identity_verification_management_tokens%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
begin
  if auth.uid() is not null then perform app_private.require_current_session(); end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'verification management is unavailable' using errcode='22023'; end if;
  select * into management_record from app_private.identity_verification_management_tokens where token_hash=p_token_hash for update;
  if management_record.id is null or management_record.scope<>'withdraw_consent' or management_record.consumed_at is not null
    or management_record.revoked_at is not null or management_record.expires_at<=pg_catalog.now() then
    raise exception 'verification management is unavailable' using errcode='22023';
  end if;
  select * into subject_record from app_private.identity_verification_subjects where id=management_record.subject_id for update;
  update app_private.identity_verification_management_tokens set consumed_at=pg_catalog.now() where id=management_record.id;
  update app_private.identity_verification_attempts set status='revoked',consent_withdrawn_at=pg_catalog.now(),
    completed_at=coalesce(completed_at,pg_catalog.now()),updated_at=pg_catalog.now()
  where subject_id=management_record.subject_id and status in ('created','invited','in_progress','verified');
  update app_private.identity_verification_subjects set status='revoked',revoked_at=pg_catalog.now(),
    revocation_reason='consent withdrawn',expected_birth_date_hash=null,updated_at=pg_catalog.now()
  where id=management_record.subject_id;
  if subject_record.subject_type='organization_representative' then
    update app_private.organization_verification_checks set status='needs_attention',verified_at=null,expires_at=null,
      attention_reason='The representative withdrew identity-verification consent.',updated_at=pg_catalog.now()
    where organization_id=subject_record.organization_id and verification_type='representative_identity';
    update app_private.organization_onboarding_states set status='needs_attention',next_stage='verification',updated_at=pg_catalog.now()
    where organization_id=subject_record.organization_id and status<>'approved';
    insert into app_private.brokerdesk_audit_events(organization_id,actor_user_id,event_name,resource_type,outcome,safe_details)
    values(subject_record.organization_id,subject_record.subject_user_id,'representative.identity_verification_withdrawn',
      'organization_verification','succeeded','{}'::jsonb);
  end if;
end;
$$;

create or replace function public.retry_identity_verification(p_token_hash text,p_management_token_hash text)
returns table(attempt_id uuid,provider_subject_ref uuid,legal_name text,birth_date date)
language plpgsql security definer set search_path = '' as $$
declare
  management_record app_private.identity_verification_management_tokens%rowtype;
  subject_record app_private.identity_verification_subjects%rowtype;
  candidate_record public.candidates%rowtype;
  previous_attempt app_private.identity_verification_attempts%rowtype;
  replacement_attempt app_private.identity_verification_attempts%rowtype;
begin
  if auth.uid() is not null then perform app_private.require_current_session(); end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_management_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'verification retry is unavailable' using errcode='22023';
  end if;
  select * into management_record from app_private.identity_verification_management_tokens where token_hash=p_token_hash for update;
  if management_record.id is null or management_record.consumed_at is not null or management_record.revoked_at is not null
    or management_record.expires_at<=pg_catalog.now() then raise exception 'verification retry is unavailable' using errcode='22023'; end if;
  select * into subject_record from app_private.identity_verification_subjects where id=management_record.subject_id for update;
  if subject_record.subject_type<>'candidate' then raise exception 'representative retry requires a fresh security check' using errcode='22023'; end if;
  select * into previous_attempt from app_private.identity_verification_attempts attempt
  where attempt.subject_id=subject_record.id order by attempt.created_at desc limit 1 for update;
  if previous_attempt.id is null or previous_attempt.status not in ('created','failed','expired','declined')
    or previous_attempt.consent_withdrawn_at is not null then raise exception 'verification retry is unavailable' using errcode='22023'; end if;
  select * into candidate_record from public.candidates where id=subject_record.candidate_id for update;
  if nullif(pg_catalog.btrim(candidate_record.legal_name),'') is null or candidate_record.birth_date is null then
    raise exception 'verification details are unavailable' using errcode='22023';
  end if;
  insert into app_private.identity_verification_attempts(
    subject_id,candidate_id,provider_subject_ref,status,consent_version,consented_at,
    consent_purpose,consent_processing_details,consent_retention_details,consent_withdrawal_details
  ) values (
    subject_record.id,subject_record.candidate_id,subject_record.provider_subject_ref,'created',
    previous_attempt.consent_version,previous_attempt.consented_at,previous_attempt.consent_purpose,
    previous_attempt.consent_processing_details,previous_attempt.consent_retention_details,previous_attempt.consent_withdrawal_details
  ) returning * into replacement_attempt;
  update app_private.identity_verification_management_tokens set consumed_at=pg_catalog.now() where id=management_record.id;
  insert into app_private.identity_verification_management_tokens(subject_id,candidate_id,token_hash,scope,expires_at)
  values(subject_record.id,subject_record.candidate_id,p_management_token_hash,'withdraw_consent',pg_catalog.now()+interval '30 days');
  return query select replacement_attempt.id,replacement_attempt.provider_subject_ref,candidate_record.legal_name,candidate_record.birth_date;
end;
$$;

-- Candidate revocation remains source-compatible for account deletion and
-- publication code while targeting the normalized subject internally.
create or replace function app_private.revoke_identity_verification(p_candidate_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update app_private.identity_verification_subjects set status='revoked',revoked_at=pg_catalog.now(),
    revocation_reason=nullif(pg_catalog.left(p_reason,128),''),updated_at=pg_catalog.now()
  where candidate_id=p_candidate_id and subject_type='candidate';
  if not found then raise exception 'identity verification subject is missing' using errcode='23503'; end if;
end;
$$;

create or replace function public.consume_api_rate_limit(p_action text,p_subject_hash text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  action_limit integer; window_seconds integer; effective_subject text;
  limit_record app_private.api_rate_limits%rowtype; v_now timestamptz:=pg_catalog.now();
begin
  select configured.limit_value,configured.window_value into action_limit,window_seconds from (values
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
    ('brokerdesk_team_access_replace',30,3600),('brokerdesk_team_suspend',20,3600),
    ('brokerdesk_representative_verification_start',5,3600)
  ) as configured(action_name,limit_value,window_value) where configured.action_name=p_action;
  if action_limit is null then raise exception 'unsupported rate limit action' using errcode='22023'; end if;
  if auth.uid() is not null then effective_subject:='user:'||auth.uid()::text;
  elsif p_subject_hash is not null and p_subject_hash~'^[a-f0-9]{64}$' then effective_subject:='anonymous:'||p_subject_hash;
  else return '{"allowed":false,"retryAfter":60}'::jsonb; end if;
  insert into app_private.api_rate_limits(action,subject_key,window_started_at,request_count,updated_at)
  values(p_action,effective_subject,v_now,1,v_now) on conflict(action,subject_key) do update set
    window_started_at=case when app_private.api_rate_limits.window_started_at<=v_now-pg_catalog.make_interval(secs=>window_seconds) then v_now else app_private.api_rate_limits.window_started_at end,
    request_count=case when app_private.api_rate_limits.window_started_at<=v_now-pg_catalog.make_interval(secs=>window_seconds) then 1 else app_private.api_rate_limits.request_count+1 end,
    updated_at=v_now returning * into limit_record;
  return pg_catalog.jsonb_build_object('allowed',limit_record.request_count<=action_limit,'retryAfter',
    case when limit_record.request_count<=action_limit then 0 else greatest(1,pg_catalog.ceil(extract(epoch from(
      limit_record.window_started_at+pg_catalog.make_interval(secs=>window_seconds)-v_now)))::integer) end);
end;
$$;

revoke all on function app_private.enqueue_identity_verification_work(uuid,uuid,text,timestamptz) from public,anon,authenticated;
revoke all on function app_private.enforce_identity_verification_attempt_subject_binding() from public,anon,authenticated;
revoke all on function app_private.enforce_identity_verification_management_subject_binding() from public,anon,authenticated;
revoke all on function app_private.enforce_identity_verification_worker_subject_binding() from public,anon,authenticated;
revoke all on function app_private.invalidate_representative_identity_after_name_change() from public,anon,authenticated;
revoke all on function app_private.enqueue_identity_verification_redaction() from public,anon,authenticated;
revoke all on function app_private.record_identity_verification_webhook(text,text,uuid,text,uuid) from public,anon,authenticated;
revoke all on function app_private.claim_identity_verification_work(integer) from public,anon,authenticated;
revoke all on function app_private.complete_identity_verification_reconciliation(uuid,uuid,text,boolean,boolean,boolean,boolean,boolean) from public,anon,authenticated;
revoke all on function app_private.complete_identity_verification_provider_redaction(uuid,uuid) from public,anon,authenticated;
revoke all on function public.begin_brokerdesk_representative_verification(text,text,text,text) from public,anon,authenticated;
grant execute on function public.begin_brokerdesk_representative_verification(text,text,text,text) to authenticated;
revoke all on function public.begin_identity_verification(uuid,text,text) from public,anon,authenticated;
grant execute on function public.begin_identity_verification(uuid,text,text) to anon,authenticated;
revoke all on function public.attach_identity_verification_provider_session(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_identity_verification_provider_session(uuid,text,text) to anon,authenticated;
revoke all on function public.get_identity_verification_link_status(text) from public,anon,authenticated;
grant execute on function public.get_identity_verification_link_status(text) to anon,authenticated;
revoke all on function public.withdraw_identity_verification_consent(text) from public,anon,authenticated;
grant execute on function public.withdraw_identity_verification_consent(text) to anon,authenticated;
revoke all on function public.retry_identity_verification(text,text) from public,anon,authenticated;
grant execute on function public.retry_identity_verification(text,text) to anon,authenticated;
revoke all on function public.claim_identity_verification_work(integer) from public,anon,authenticated;
grant execute on function public.claim_identity_verification_work(integer) to service_role;
revoke all on function public.consume_api_rate_limit(text,text) from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text,text) to anon,authenticated;

comment on column app_private.identity_verification_subjects.expected_birth_date_hash is
  'Purpose-bound HMAC for representative decision matching; the raw representative birth date is not retained.';
comment on function public.begin_brokerdesk_representative_verification(text,text,text,text) is
  'Owner-only, purpose-bound AAL2 start command. It consumes the exact workspace verification proof atomically.';
