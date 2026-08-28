-- Phase 1 identity verification perimeter. Provider identifiers, invitations,
-- attempts, event records, and work leases intentionally live outside the
-- public Data API schema. Only a derived public verification badge is exposed.

revoke all on table public.verifications from anon, authenticated;

create table app_private.identity_verification_subjects (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  provider text not null default 'didit' check (provider = 'didit'),
  provider_subject_ref uuid not null default extensions.gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'expired', 'revoked')),
  consent_version text,
  verified_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  provider_redacted_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (
    (status = 'verified' and verified_at is not null and expires_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or (status not in ('verified', 'revoked'))
  ),
  check (expires_at is null or verified_at is null or expires_at > verified_at)
);

create table app_private.identity_verification_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  provider_subject_ref uuid not null references app_private.identity_verification_subjects(provider_subject_ref) on delete cascade,
  provider_session_ref text unique,
  status text not null default 'created' check (status in ('created', 'invited', 'in_progress', 'verified', 'declined', 'failed', 'expired', 'redacted', 'revoked')),
  document_country char(2),
  document_type text,
  consent_version text,
  consented_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  provider_redacted_at timestamptz,
  evidence_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (document_country is null or document_country ~ '^[A-Z]{2}$'),
  check (document_type is null or document_type ~ '^[a-z_]{2,64}$'),
  check (evidence_payload = '{}'::jsonb)
);

create table app_private.identity_verification_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  check (expires_at > created_at)
);

create unique index identity_verification_invitation_active_token_idx
  on app_private.identity_verification_invitations(token_hash)
  where consumed_at is null and revoked_at is null;

create table app_private.identity_verification_management_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  scope text not null check (scope in ('resume', 'status', 'withdraw_consent')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  check (expires_at > created_at)
);

create table app_private.identity_verification_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider_event_hash text not null unique check (provider_event_hash ~ '^[a-f0-9]{64}$'),
  attempt_id uuid references app_private.identity_verification_attempts(id) on delete set null,
  received_at timestamptz not null default pg_catalog.now(),
  processed_at timestamptz,
  processing_error_code text,
  payload_digest text not null check (payload_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default pg_catalog.now()
);

create table app_private.identity_verification_worker_state (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  task_type text not null check (task_type in ('reconcile', 'provider_redaction', 'expiry')),
  run_after timestamptz not null default pg_catalog.now(),
  claim_token uuid,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  completed_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now(),
  check ((claim_token is null and claimed_at is null and lease_expires_at is null) or (claim_token is not null and claimed_at is not null and lease_expires_at is not null))
);

create index identity_verification_attempts_candidate_created_idx
  on app_private.identity_verification_attempts(candidate_id, created_at desc);
create index identity_verification_attempts_subject_idx
  on app_private.identity_verification_attempts(provider_subject_ref);
create index identity_verification_worker_claim_idx
  on app_private.identity_verification_worker_state(run_after, lease_expires_at)
  where completed_at is null;

alter table app_private.identity_verification_subjects enable row level security;
alter table app_private.identity_verification_attempts enable row level security;
alter table app_private.identity_verification_invitations enable row level security;
alter table app_private.identity_verification_management_tokens enable row level security;
alter table app_private.identity_verification_webhook_events enable row level security;
alter table app_private.identity_verification_worker_state enable row level security;

revoke all on all tables in schema app_private from public, anon, authenticated;

create function app_private.ensure_identity_verification_subject()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app_private.identity_verification_subjects(candidate_id)
  values (new.id)
  on conflict (candidate_id) do nothing;
  return new;
end;
$$;

insert into app_private.identity_verification_subjects(candidate_id)
select candidate.id from public.candidates candidate
on conflict (candidate_id) do nothing;

create trigger ensure_identity_verification_subject
  after insert on public.candidates
  for each row execute function app_private.ensure_identity_verification_subject();

create function app_private.reject_identity_evidence_payload()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.evidence_payload <> '{}'::jsonb then
    raise exception 'identity evidence payloads must be empty' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger reject_identity_evidence_payload
  before insert or update of evidence_payload on app_private.identity_verification_attempts
  for each row execute function app_private.reject_identity_evidence_payload();

create function app_private.current_identity_verification(p_candidate_id uuid)
returns setof app_private.identity_verification_subjects
language sql
stable
security definer
set search_path = ''
as $$
  select subject_record
  from app_private.identity_verification_subjects subject_record
  where subject_record.candidate_id = p_candidate_id
    and subject_record.status = 'verified'
    and subject_record.verified_at <= pg_catalog.now()
    and subject_record.expires_at > pg_catalog.now()
    and subject_record.revoked_at is null
$$;

create function app_private.consume_identity_verification_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_record app_private.identity_verification_invitations%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid invitation token' using errcode = '22023';
  end if;

  select * into invitation_record
  from app_private.identity_verification_invitations
  where token_hash = p_token_hash
  for update;
  if invitation_record.id is null
    or invitation_record.consumed_at is not null
    or invitation_record.revoked_at is not null
    or invitation_record.expires_at <= pg_catalog.now()
  then
    raise exception 'invitation is unavailable' using errcode = '22023';
  end if;

  update app_private.identity_verification_invitations
  set consumed_at = pg_catalog.now()
  where id = invitation_record.id;
  return invitation_record.candidate_id;
end;
$$;

create function app_private.transition_identity_verification_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_next_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.identity_verification_attempts%rowtype;
begin
  select * into attempt_record from app_private.identity_verification_attempts where id = p_attempt_id for update;
  if attempt_record.id is null or attempt_record.status <> p_expected_status then
    raise exception 'identity verification attempt transition conflict' using errcode = '40001';
  end if;
  if not (
    (p_expected_status = 'created' and p_next_status in ('invited', 'in_progress', 'revoked'))
    or (p_expected_status = 'invited' and p_next_status in ('in_progress', 'expired', 'revoked'))
    or (p_expected_status = 'in_progress' and p_next_status in ('verified', 'declined', 'failed', 'expired', 'revoked'))
    or (p_expected_status = 'verified' and p_next_status in ('redacted', 'revoked'))
    or (p_expected_status in ('declined', 'failed', 'expired') and p_next_status = 'redacted')
  ) then
    raise exception 'invalid identity verification attempt transition' using errcode = '22023';
  end if;
  update app_private.identity_verification_attempts
  set status = p_next_status,
      started_at = case when p_next_status = 'in_progress' then coalesce(started_at, pg_catalog.now()) else started_at end,
      completed_at = case when p_next_status in ('verified', 'declined', 'failed', 'expired', 'revoked') then coalesce(completed_at, pg_catalog.now()) else completed_at end,
      updated_at = pg_catalog.now()
  where id = p_attempt_id;
  return p_next_status;
end;
$$;

create function app_private.project_identity_verification(
  p_attempt_id uuid,
  p_consent_version text,
  p_verified_at timestamptz,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.identity_verification_attempts%rowtype;
begin
  if p_verified_at is null or p_expires_at is null or p_expires_at <= p_verified_at then
    raise exception 'invalid identity verification validity period' using errcode = '22023';
  end if;
  select * into attempt_record from app_private.identity_verification_attempts where id = p_attempt_id for update;
  if attempt_record.id is null or attempt_record.status <> 'verified' then
    raise exception 'only a verified attempt can update identity projection' using errcode = '22023';
  end if;
  update app_private.identity_verification_subjects
  set status = 'verified', consent_version = p_consent_version,
      verified_at = p_verified_at, expires_at = p_expires_at,
      revoked_at = null, revocation_reason = null, updated_at = pg_catalog.now()
  where candidate_id = attempt_record.candidate_id;
  if not found then
    raise exception 'identity verification subject is missing' using errcode = '23503';
  end if;
end;
$$;

create function app_private.revoke_identity_verification(p_candidate_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app_private.identity_verification_subjects
  set status = 'revoked', revoked_at = pg_catalog.now(), revocation_reason = nullif(pg_catalog.left(p_reason, 128), ''), updated_at = pg_catalog.now()
  where candidate_id = p_candidate_id;
  if not found then raise exception 'identity verification subject is missing' using errcode = '23503'; end if;
end;
$$;

create function app_private.claim_identity_verification_work(p_limit integer)
returns table(candidate_id uuid, task_type text, claim_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid work claim limit' using errcode = '22023';
  end if;
  return query
  with eligible as (
    select state.candidate_id
    from app_private.identity_verification_worker_state state
    where state.completed_at is null
      and state.run_after <= pg_catalog.now()
      and (state.lease_expires_at is null or state.lease_expires_at <= pg_catalog.now())
    order by state.run_after, state.candidate_id
    for update skip locked
    limit p_limit
  ), claimed as (
    update app_private.identity_verification_worker_state state
    set claim_token = extensions.gen_random_uuid(), claimed_at = pg_catalog.now(),
        lease_expires_at = pg_catalog.now() + interval '10 minutes', attempts = attempts + 1,
        updated_at = pg_catalog.now()
    from eligible
    where state.candidate_id = eligible.candidate_id
    returning state.candidate_id, state.task_type, state.claim_token
  ) select * from claimed;
end;
$$;

revoke all on function app_private.reject_identity_evidence_payload() from public, anon, authenticated;
revoke all on function app_private.ensure_identity_verification_subject() from public, anon, authenticated;
revoke all on function app_private.current_identity_verification(uuid) from public, anon, authenticated;
revoke all on function app_private.consume_identity_verification_invitation(text) from public, anon, authenticated;
revoke all on function app_private.transition_identity_verification_attempt(uuid, text, text) from public, anon, authenticated;
revoke all on function app_private.project_identity_verification(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function app_private.revoke_identity_verification(uuid, text) from public, anon, authenticated;
revoke all on function app_private.claim_identity_verification_work(integer) from public, anon, authenticated;

alter table public.public_portfolio_snapshots
  add column identity_verification_badge text,
  add column identity_verified_until timestamptz,
  add column identity_reverification_grace_until timestamptz,
  add constraint public_portfolio_snapshots_identity_badge_check
    check (identity_verification_badge is null or identity_verification_badge = 'identity_verified'),
  add constraint public_portfolio_snapshots_identity_badge_consistency_check
    check ((identity_verification_badge is null and identity_verified_until is null and identity_reverification_grace_until is null)
      or (identity_verification_badge = 'identity_verified' and identity_verified_until is not null and identity_reverification_grace_until = identity_verified_until + interval '30 days'));

create function app_private.apply_public_identity_verification_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  verification_record app_private.identity_verification_subjects%rowtype;
begin
  select * into verification_record
  from app_private.current_identity_verification((select candidate_id from public.portfolios where id = new.portfolio_id));
  if verification_record.candidate_id is null then
    new.identity_verification_badge := null;
    new.identity_verified_until := null;
    new.identity_reverification_grace_until := null;
  else
    new.identity_verification_badge := 'identity_verified';
    new.identity_verified_until := verification_record.expires_at;
    new.identity_reverification_grace_until := verification_record.expires_at + interval '30 days';
  end if;
  return new;
end;
$$;

create trigger apply_public_identity_verification_badge
  before insert or update on public.public_portfolio_snapshots
  for each row execute function app_private.apply_public_identity_verification_badge();

create function app_private.enforce_identity_verification_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_published = true and (tg_op = 'insert' or old.is_published is distinct from true) then
    if not exists (select 1 from app_private.current_identity_verification(new.candidate_id)) then
      raise exception 'first publication requires current candidate identity verification' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_identity_verification_publication
  before insert or update of is_published on public.portfolios
  for each row execute function app_private.enforce_identity_verification_publication();

revoke all on function app_private.apply_public_identity_verification_badge() from public, anon, authenticated;
revoke all on function app_private.enforce_identity_verification_publication() from public, anon, authenticated;
