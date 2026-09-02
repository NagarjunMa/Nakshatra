-- Didit webhook processing. Webhook bodies and provider decisions can contain
-- identity evidence, so this migration stores only keyed digests, identifiers,
-- normalized outcomes, and lease state. The worker fetches and evaluates a
-- decision transiently, then sends boolean policy results back to the database.

alter table app_private.identity_verification_worker_state
  add column attempt_id uuid references app_private.identity_verification_attempts(id) on delete cascade;

-- Existing state is candidate-scoped. Preserve it while associating it with the
-- latest attempt if there is one; legacy rows without an attempt are ignored by
-- the new worker rather than being deleted during this forward-only migration.
update app_private.identity_verification_worker_state state
set attempt_id = (
  select attempt.id
  from app_private.identity_verification_attempts attempt
  where attempt.candidate_id = state.candidate_id
  order by attempt.created_at desc
  limit 1
)
where state.attempt_id is null
  and exists (
    select 1
    from app_private.identity_verification_attempts attempt
    where attempt.candidate_id = state.candidate_id
  );

alter table app_private.identity_verification_worker_state
  drop constraint identity_verification_worker_state_pkey,
  add primary key (candidate_id, task_type);

create unique index identity_verification_worker_attempt_task_idx
  on app_private.identity_verification_worker_state(attempt_id, task_type)
  where attempt_id is not null;

create index identity_verification_worker_attempt_claim_idx
  on app_private.identity_verification_worker_state(attempt_id, run_after, lease_expires_at)
  where completed_at is null and attempt_id is not null;

create or replace function app_private.require_identity_verification_worker()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
end;
$$;

create or replace function app_private.enqueue_identity_verification_work(
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
begin
  if p_task_type not in ('reconcile', 'provider_redaction') then
    raise exception 'invalid identity verification work type' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from app_private.identity_verification_attempts attempt
    where attempt.id = p_attempt_id
      and attempt.candidate_id = p_candidate_id
  ) then
    raise exception 'identity verification attempt is unavailable' using errcode = '22023';
  end if;

  insert into app_private.identity_verification_worker_state(
    candidate_id, attempt_id, task_type, run_after, claim_token, claimed_at,
    lease_expires_at, attempts, last_error_code, completed_at, updated_at
  ) values (
    p_candidate_id, p_attempt_id, p_task_type, p_run_after, null, null,
    null, 0, null, null, pg_catalog.now()
  )
  on conflict (candidate_id, task_type) do update
  set attempt_id = case
        when app_private.identity_verification_worker_state.lease_expires_at > pg_catalog.now()
        then app_private.identity_verification_worker_state.attempt_id
        else excluded.attempt_id
      end,
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
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider_session_ref is not null
    and new.status in ('verified', 'declined', 'failed', 'expired', 'revoked')
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    perform app_private.enqueue_identity_verification_work(
      new.candidate_id, new.id, 'provider_redaction'
    );
  end if;
  return new;
end;
$$;

create trigger enqueue_identity_verification_redaction
  after insert or update of status on app_private.identity_verification_attempts
  for each row execute function app_private.enqueue_identity_verification_redaction();

create or replace function app_private.record_identity_verification_webhook(
  p_provider_event_hash text,
  p_payload_digest text,
  p_attempt_id uuid,
  p_provider_session_ref text,
  p_provider_subject_ref uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.identity_verification_attempts%rowtype;
  event_record_id uuid;
begin
  perform app_private.require_identity_verification_worker();

  if p_provider_event_hash !~ '^[a-f0-9]{64}$'
    or p_payload_digest !~ '^[a-f0-9]{64}$'
    or p_provider_session_ref is null
    or pg_catalog.char_length(p_provider_session_ref) < 8
    or pg_catalog.char_length(p_provider_session_ref) > 128
  then
    raise exception 'invalid identity verification webhook envelope' using errcode = '22023';
  end if;

  select * into attempt_record
  from app_private.identity_verification_attempts attempt
  where attempt.id = p_attempt_id
    and attempt.provider_session_ref = p_provider_session_ref
    and attempt.provider_subject_ref = p_provider_subject_ref
  for update;
  if attempt_record.id is null then
    return false;
  end if;

  insert into app_private.identity_verification_webhook_events(
    provider_event_hash, attempt_id, payload_digest
  ) values (
    p_provider_event_hash, attempt_record.id, p_payload_digest
  )
  on conflict (provider_event_hash) do nothing
  returning id into event_record_id;

  -- Didit retries preserve event identity. Once the receipt exists, acknowledge
  -- it without extending a lease or replaying state transitions.
  if event_record_id is null then
    return true;
  end if;

  perform app_private.enqueue_identity_verification_work(
    attempt_record.candidate_id, attempt_record.id, 'reconcile'
  );
  return true;
end;
$$;

drop function app_private.claim_identity_verification_work(integer);

create function app_private.claim_identity_verification_work(p_limit integer)
returns table(
  candidate_id uuid,
  task_type text,
  claim_token uuid,
  attempt_id uuid,
  provider_session_ref text,
  legal_name text,
  birth_date date
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid work claim limit' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select state.candidate_id, state.task_type
    from app_private.identity_verification_worker_state state
    where state.attempt_id is not null
      and state.completed_at is null
      and state.run_after <= pg_catalog.now()
      and (state.lease_expires_at is null or state.lease_expires_at <= pg_catalog.now())
    order by state.run_after, state.candidate_id, state.task_type
    for update skip locked
    limit p_limit
  ), claimed as (
    update app_private.identity_verification_worker_state state
    set claim_token = extensions.gen_random_uuid(),
        claimed_at = pg_catalog.now(),
        lease_expires_at = pg_catalog.now() + interval '10 minutes',
        attempts = state.attempts + 1,
        updated_at = pg_catalog.now()
    from eligible
    where state.candidate_id = eligible.candidate_id
      and state.task_type = eligible.task_type
    returning state.candidate_id, state.task_type, state.claim_token, state.attempt_id
  )
  select claimed.candidate_id, claimed.task_type, claimed.claim_token,
    claimed.attempt_id, attempt.provider_session_ref, candidate.legal_name,
    candidate.birth_date
  from claimed
  join app_private.identity_verification_attempts attempt on attempt.id = claimed.attempt_id
  join public.candidates candidate on candidate.id = claimed.candidate_id;
end;
$$;

create or replace function app_private.defer_identity_verification_work(
  p_attempt_id uuid,
  p_task_type text,
  p_claim_token uuid,
  p_error_code text,
  p_delay_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  if p_task_type not in ('reconcile', 'provider_redaction')
    or p_error_code !~ '^[A-Z_]{3,64}$'
    or p_delay_seconds < 300
    or p_delay_seconds > 3600
  then
    raise exception 'invalid identity verification work deferral' using errcode = '22023';
  end if;

  update app_private.identity_verification_worker_state state
  set run_after = pg_catalog.now() + pg_catalog.make_interval(secs => p_delay_seconds),
      claim_token = null,
      claimed_at = null,
      lease_expires_at = null,
      last_error_code = p_error_code,
      updated_at = pg_catalog.now()
  where state.attempt_id = p_attempt_id
    and state.task_type = p_task_type
    and state.claim_token = p_claim_token
    and state.lease_expires_at > pg_catalog.now()
    and state.completed_at is null;
  return found;
end;
$$;

create or replace function app_private.complete_identity_verification_reconciliation(
  p_attempt_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_id_verified boolean,
  p_passive_liveness_verified boolean,
  p_face_match_verified boolean,
  p_name_matches boolean,
  p_birth_date_matches boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_record app_private.identity_verification_worker_state%rowtype;
  attempt_record app_private.identity_verification_attempts%rowtype;
begin
  perform app_private.require_identity_verification_worker();
  if p_outcome not in ('pending', 'verified', 'declined', 'expired') then
    raise exception 'invalid identity verification outcome' using errcode = '22023';
  end if;
  if p_outcome = 'verified'
    and not (p_id_verified and p_passive_liveness_verified and p_face_match_verified and p_name_matches and p_birth_date_matches)
  then
    raise exception 'verified identity outcome requires every required check' using errcode = '23514';
  end if;

  select * into state_record
  from app_private.identity_verification_worker_state state
  where state.attempt_id = p_attempt_id
    and state.task_type = 'reconcile'
    and state.claim_token = p_claim_token
    and state.lease_expires_at > pg_catalog.now()
    and state.completed_at is null
  for update;
  if state_record.candidate_id is null then
    return false;
  end if;

  select * into attempt_record
  from app_private.identity_verification_attempts attempt
  where attempt.id = p_attempt_id
    and attempt.candidate_id = state_record.candidate_id
  for update;
  if attempt_record.id is null then
    return false;
  end if;

  if attempt_record.status in ('redacted', 'revoked') then
    update app_private.identity_verification_worker_state
    set completed_at = pg_catalog.now(), claim_token = null, claimed_at = null,
        lease_expires_at = null, last_error_code = null, updated_at = pg_catalog.now()
    where candidate_id = state_record.candidate_id and task_type = 'reconcile';
    if attempt_record.status = 'revoked' and attempt_record.provider_session_ref is not null then
      perform app_private.enqueue_identity_verification_work(
        state_record.candidate_id, attempt_record.id, 'provider_redaction'
      );
    end if;
    return true;
  end if;

  if p_outcome = 'pending' then
    update app_private.identity_verification_worker_state
    set run_after = pg_catalog.now() + interval '5 minutes',
        claim_token = null, claimed_at = null, lease_expires_at = null,
        last_error_code = null, updated_at = pg_catalog.now()
    where candidate_id = state_record.candidate_id and task_type = 'reconcile';
    return true;
  end if;

  if attempt_record.status <> 'in_progress' then
    return false;
  end if;

  update app_private.identity_verification_attempts
  set status = p_outcome,
      completed_at = coalesce(completed_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where id = attempt_record.id;

  if p_outcome = 'verified' then
    update app_private.identity_verification_subjects
    set status = 'verified',
        verified_at = pg_catalog.now(),
        expires_at = pg_catalog.now() + interval '365 days',
        revoked_at = null,
        revocation_reason = null,
        updated_at = pg_catalog.now()
    where candidate_id = state_record.candidate_id
      and status <> 'revoked';
    if not found then
      raise exception 'identity verification has been revoked' using errcode = '22023';
    end if;
  else
    update app_private.identity_verification_subjects
    set status = case when p_outcome = 'expired' then 'expired' else 'failed' end,
        verified_at = null, expires_at = null, updated_at = pg_catalog.now()
    where candidate_id = state_record.candidate_id
      and status <> 'revoked';
  end if;

  update app_private.identity_verification_worker_state
  set completed_at = pg_catalog.now(), claim_token = null, claimed_at = null,
      lease_expires_at = null, last_error_code = null, updated_at = pg_catalog.now()
  where candidate_id = state_record.candidate_id and task_type = 'reconcile';
  return true;
end;
$$;

create or replace function app_private.complete_identity_verification_provider_redaction(
  p_attempt_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_record app_private.identity_verification_worker_state%rowtype;
begin
  perform app_private.require_identity_verification_worker();
  select * into state_record
  from app_private.identity_verification_worker_state state
  where state.attempt_id = p_attempt_id
    and state.task_type = 'provider_redaction'
    and state.claim_token = p_claim_token
    and state.lease_expires_at > pg_catalog.now()
    and state.completed_at is null
  for update;
  if state_record.candidate_id is null then
    return false;
  end if;

  update app_private.identity_verification_attempts
  set status = case when status in ('verified', 'declined', 'failed', 'expired') then 'redacted' else status end,
      provider_redacted_at = coalesce(provider_redacted_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where id = p_attempt_id;
  if not found then
    return false;
  end if;

  update app_private.identity_verification_worker_state
  set completed_at = pg_catalog.now(), claim_token = null, claimed_at = null,
      lease_expires_at = null, last_error_code = null, updated_at = pg_catalog.now()
  where candidate_id = state_record.candidate_id and task_type = 'provider_redaction';
  return true;
end;
$$;

create function public.record_identity_verification_webhook(
  p_provider_event_hash text,
  p_payload_digest text,
  p_attempt_id uuid,
  p_provider_session_ref text,
  p_provider_subject_ref uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  return app_private.record_identity_verification_webhook(
    p_provider_event_hash, p_payload_digest, p_attempt_id, p_provider_session_ref,
    p_provider_subject_ref
  );
end;
$$;

create function public.claim_identity_verification_work(p_limit integer default 10)
returns table(
  candidate_id uuid,
  task_type text,
  claim_token uuid,
  attempt_id uuid,
  provider_session_ref text,
  legal_name text,
  birth_date date
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  return query select * from app_private.claim_identity_verification_work(p_limit);
end;
$$;

create function public.defer_identity_verification_work(
  p_attempt_id uuid,
  p_task_type text,
  p_claim_token uuid,
  p_error_code text,
  p_delay_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  return app_private.defer_identity_verification_work(
    p_attempt_id, p_task_type, p_claim_token, p_error_code, p_delay_seconds
  );
end;
$$;

create function public.complete_identity_verification_reconciliation(
  p_attempt_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_id_verified boolean,
  p_passive_liveness_verified boolean,
  p_face_match_verified boolean,
  p_name_matches boolean,
  p_birth_date_matches boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  return app_private.complete_identity_verification_reconciliation(
    p_attempt_id, p_claim_token, p_outcome, p_id_verified,
    p_passive_liveness_verified, p_face_match_verified, p_name_matches,
    p_birth_date_matches
  );
end;
$$;

create function public.complete_identity_verification_provider_redaction(
  p_attempt_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_identity_verification_worker();
  return app_private.complete_identity_verification_provider_redaction(p_attempt_id, p_claim_token);
end;
$$;

revoke all on function app_private.require_identity_verification_worker() from public, anon, authenticated;
revoke all on function app_private.enqueue_identity_verification_work(uuid, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function app_private.enqueue_identity_verification_redaction() from public, anon, authenticated;
revoke all on function app_private.record_identity_verification_webhook(text, text, uuid, text, uuid) from public, anon, authenticated;
revoke all on function app_private.claim_identity_verification_work(integer) from public, anon, authenticated;
revoke all on function app_private.defer_identity_verification_work(uuid, text, uuid, text, integer) from public, anon, authenticated;
revoke all on function app_private.complete_identity_verification_reconciliation(uuid, uuid, text, boolean, boolean, boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function app_private.complete_identity_verification_provider_redaction(uuid, uuid) from public, anon, authenticated;

revoke all on function public.record_identity_verification_webhook(text, text, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.claim_identity_verification_work(integer) from public, anon, authenticated;
revoke all on function public.defer_identity_verification_work(uuid, text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_identity_verification_reconciliation(uuid, uuid, text, boolean, boolean, boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function public.complete_identity_verification_provider_redaction(uuid, uuid) from public, anon, authenticated;

grant execute on function public.record_identity_verification_webhook(text, text, uuid, text, uuid) to service_role;
grant execute on function public.claim_identity_verification_work(integer) to service_role;
grant execute on function public.defer_identity_verification_work(uuid, text, uuid, text, integer) to service_role;
grant execute on function public.complete_identity_verification_reconciliation(uuid, uuid, text, boolean, boolean, boolean, boolean, boolean) to service_role;
grant execute on function public.complete_identity_verification_provider_redaction(uuid, uuid) to service_role;
