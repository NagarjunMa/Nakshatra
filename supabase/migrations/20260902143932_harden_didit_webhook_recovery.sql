-- Ensure every provider session is reconciled even if Didit cannot deliver a
-- webhook. This is deliberately a forward-only replacement of the existing
-- public function: deployed migrations must never be rewritten.
create or replace function public.attach_identity_verification_provider_session(
  p_attempt_id uuid,
  p_provider_session_ref text,
  p_management_token_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.identity_verification_attempts%rowtype;
  management_record app_private.identity_verification_management_tokens%rowtype;
begin
  if auth.uid() is not null then
    perform app_private.require_current_session();
  end if;
  if p_provider_session_ref is null
    or pg_catalog.char_length(p_provider_session_ref) < 8
    or pg_catalog.char_length(p_provider_session_ref) > 128
  then
    raise exception 'invalid provider session reference' using errcode = '22023';
  end if;
  if p_management_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid management token' using errcode = '22023';
  end if;

  select * into attempt_record
  from app_private.identity_verification_attempts attempt
  where attempt.id = p_attempt_id
  for update;
  if attempt_record.id is null
    or attempt_record.status not in ('created', 'invited', 'in_progress')
    or (attempt_record.provider_session_ref is not null and attempt_record.provider_session_ref <> p_provider_session_ref)
  then
    raise exception 'verification session cannot be attached' using errcode = '22023';
  end if;

  select * into management_record
  from app_private.identity_verification_management_tokens management
  where management.token_hash = p_management_token_hash
    and management.candidate_id = attempt_record.candidate_id
  for update;
  if management_record.id is null
    or management_record.consumed_at is not null
    or management_record.revoked_at is not null
    or management_record.expires_at <= pg_catalog.now()
  then
    raise exception 'verification session cannot be attached' using errcode = '22023';
  end if;

  update app_private.identity_verification_attempts
  set provider_session_ref = p_provider_session_ref,
      status = 'in_progress',
      started_at = coalesce(started_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where id = p_attempt_id;

  -- Wait five minutes before the first poll so normal webhooks can drive the
  -- fast path. A missed event still becomes durable, lease-protected work.
  perform app_private.enqueue_identity_verification_work(
    attempt_record.candidate_id, attempt_record.id, 'reconcile',
    pg_catalog.now() + interval '5 minutes'
  );
end;
$$;

-- Backfill existing in-progress provider sessions. This makes the recovery
-- guarantee apply at deployment time as well as to newly attached sessions.
do $$
declare
  attempt_record record;
begin
  for attempt_record in
    select id, candidate_id
    from app_private.identity_verification_attempts
    where status = 'in_progress'
      and provider_session_ref is not null
  loop
    perform app_private.enqueue_identity_verification_work(
      attempt_record.candidate_id, attempt_record.id, 'reconcile',
      pg_catalog.now() + interval '5 minutes'
    );
  end loop;
end;
$$;

-- Let the database derive bounded exponential backoff from the lease attempt
-- count. Callers cannot choose a shorter retry interval.
create or replace function app_private.defer_identity_verification_work(
  p_attempt_id uuid,
  p_task_type text,
  p_claim_token uuid,
  p_error_code text,
  p_delay_seconds integer default null
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
    or (p_delay_seconds is not null and (p_delay_seconds < 300 or p_delay_seconds > 3600))
  then
    raise exception 'invalid identity verification work deferral' using errcode = '22023';
  end if;

  update app_private.identity_verification_worker_state state
  set run_after = pg_catalog.now() + pg_catalog.make_interval(
        secs => coalesce(
          p_delay_seconds,
          least(3600, (300 * pg_catalog.power(2, greatest(state.attempts - 1, 0)))::integer)
        )
      ),
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

create or replace function public.defer_identity_verification_work(
  p_attempt_id uuid,
  p_task_type text,
  p_claim_token uuid,
  p_error_code text,
  p_delay_seconds integer default null
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
