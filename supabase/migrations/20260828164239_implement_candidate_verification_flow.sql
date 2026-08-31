-- Phase 2 candidate-verification flow. The public RPC surface is deliberately
-- narrow: it accepts only authenticated ownership or a hashed bearer token and
-- never returns portfolio data, contact data, or provider evidence.

alter table app_private.identity_verification_attempts
  add column consent_purpose text,
  add column consent_processing_details text,
  add column consent_retention_details text,
  add column consent_withdrawal_details text,
  add column consent_withdrawn_at timestamptz,
  add constraint identity_verification_attempts_consent_record_check
    check (
      (consent_version is null
        and consented_at is null
        and consent_purpose is null
        and consent_processing_details is null
        and consent_retention_details is null
        and consent_withdrawal_details is null)
      or
      (consent_version is not null
        and consented_at is not null
        and consent_purpose is not null
        and consent_processing_details is not null
        and consent_retention_details is not null
        and consent_withdrawal_details is not null)
    );

create index identity_verification_management_tokens_candidate_idx
  on app_private.identity_verification_management_tokens(candidate_id, expires_at)
  where consumed_at is null and revoked_at is null;

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
    ('identity_verification_retry', 5, 3600)
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
      1,
      pg_catalog.ceil(extract(epoch from (
        limit_record.window_started_at + pg_catalog.make_interval(secs => window_seconds) - v_now
      )))::integer
    ) end
  );
end;
$$;

create function public.create_identity_verification_invitation(
  p_candidate_id uuid,
  p_token_hash text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_expiry timestamptz := pg_catalog.now() + interval '7 days';
begin
  perform app_private.require_current_session();
  if auth.uid() is null or not public.owns_candidate(p_candidate_id) then
    raise exception 'candidate invitation is unavailable' using errcode = '42501';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid invitation token' using errcode = '22023';
  end if;

  update app_private.identity_verification_invitations
  set revoked_at = pg_catalog.now()
  where candidate_id = p_candidate_id
    and consumed_at is null
    and revoked_at is null;

  insert into app_private.identity_verification_invitations(
    candidate_id, token_hash, expires_at, created_by
  ) values (p_candidate_id, p_token_hash, invitation_expiry, auth.uid());
  return invitation_expiry;
end;
$$;

create function public.begin_identity_verification(
  p_candidate_id uuid,
  p_invitation_token_hash text,
  p_management_token_hash text
)
returns table(
  attempt_id uuid,
  provider_subject_ref uuid,
  legal_name text,
  birth_date date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_record public.candidates%rowtype;
  invitation_record app_private.identity_verification_invitations%rowtype;
  attempt_record app_private.identity_verification_attempts%rowtype;
  selected_candidate_id uuid;
begin
  -- Bearer links deliberately support anonymous use. A caller presenting an
  -- authenticated identity must nevertheless have a currently live Auth
  -- session, so a revoked JWT cannot use a link as a privileged bypass.
  if auth.uid() is not null then
    perform app_private.require_current_session();
  end if;
  if (p_candidate_id is null) = (p_invitation_token_hash is null) then
    raise exception 'choose exactly one verification authorization' using errcode = '22023';
  end if;
  if p_management_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid management token' using errcode = '22023';
  end if;

  if p_candidate_id is not null then
    select * into candidate_record
    from public.candidates candidate
    where candidate.id = p_candidate_id
      and candidate.primary_owner_user_id = auth.uid()
    for update;
    if candidate_record.id is null then
      raise exception 'self verification is unavailable' using errcode = '42501';
    end if;
    selected_candidate_id := p_candidate_id;
  else
    if p_invitation_token_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'invalid invitation token' using errcode = '22023';
    end if;
    select * into invitation_record
    from app_private.identity_verification_invitations invitation
    where invitation.token_hash = p_invitation_token_hash
    for update;
    if invitation_record.id is null
      or invitation_record.consumed_at is not null
      or invitation_record.revoked_at is not null
      or invitation_record.expires_at <= pg_catalog.now()
    then
      raise exception 'invitation is unavailable' using errcode = '22023';
    end if;
    selected_candidate_id := invitation_record.candidate_id;
    select * into candidate_record
    from public.candidates candidate
    where candidate.id = selected_candidate_id
    for update;
    update app_private.identity_verification_invitations
    set consumed_at = pg_catalog.now()
    where id = invitation_record.id;
  end if;

  if candidate_record.id is null
    or candidate_record.legal_name is null
    or pg_catalog.btrim(candidate_record.legal_name) = ''
    or candidate_record.birth_date is null
  then
    raise exception 'verification details are unavailable' using errcode = '22023';
  end if;

  select * into attempt_record
  from app_private.identity_verification_attempts attempt
  where attempt.candidate_id = selected_candidate_id
    and attempt.status in ('created', 'invited', 'in_progress')
  order by attempt.created_at desc
  limit 1
  for update;

  if attempt_record.id is null then
    insert into app_private.identity_verification_attempts(
      candidate_id, provider_subject_ref, status,
      consent_version, consented_at, consent_purpose,
      consent_processing_details, consent_retention_details, consent_withdrawal_details
    )
    select selected_candidate_id, subject.provider_subject_ref, 'created',
      '2026-08-28', pg_catalog.now(),
      'Identity verification before public Nakshatra portfolio publication.',
      'Nakshatra sends your legal name, date of birth, India document country, and approved document types to Didit for hosted identity verification.',
      'Nakshatra retains only the verification state and consent record; identity evidence remains with Didit and is not stored by Nakshatra.',
      'Use your private verification-management link to withdraw consent. Withdrawal revokes Nakshatra verification immediately.'
    from app_private.identity_verification_subjects subject
    where subject.candidate_id = selected_candidate_id
    returning * into attempt_record;
  end if;

  insert into app_private.identity_verification_management_tokens(
    candidate_id, token_hash, scope, expires_at
  ) values (
    selected_candidate_id, p_management_token_hash, 'withdraw_consent', pg_catalog.now() + interval '30 days'
  );

  return query select attempt_record.id, attempt_record.provider_subject_ref,
    candidate_record.legal_name, candidate_record.birth_date;
end;
$$;

create function public.attach_identity_verification_provider_session(
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
end;
$$;

create function public.get_identity_verification_link_status(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_record app_private.identity_verification_invitations%rowtype;
  management_record app_private.identity_verification_management_tokens%rowtype;
  attempt_status text;
begin
  if auth.uid() is not null then
    perform app_private.require_current_session();
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'verification link is unavailable' using errcode = '22023';
  end if;
  select * into invitation_record
  from app_private.identity_verification_invitations invitation
  where invitation.token_hash = p_token_hash;
  if invitation_record.id is not null then
    if invitation_record.consumed_at is null
      and invitation_record.revoked_at is null
      and invitation_record.expires_at > pg_catalog.now()
    then
      return '{"kind":"invitation","status":"ready"}'::jsonb;
    end if;
    raise exception 'verification link is unavailable' using errcode = '22023';
  end if;

  select * into management_record
  from app_private.identity_verification_management_tokens management
  where management.token_hash = p_token_hash;
  if management_record.id is null
    or management_record.consumed_at is not null
    or management_record.revoked_at is not null
    or management_record.expires_at <= pg_catalog.now()
  then
    raise exception 'verification link is unavailable' using errcode = '22023';
  end if;

  select attempt.status into attempt_status
  from app_private.identity_verification_attempts attempt
  where attempt.candidate_id = management_record.candidate_id
  order by attempt.created_at desc
  limit 1;
  return pg_catalog.jsonb_build_object(
    'kind', 'management',
    'status', coalesce(attempt_status, 'pending'),
    'canRetry', coalesce(attempt_status in ('created', 'failed', 'expired', 'declined'), false),
    'canWithdraw', management_record.scope = 'withdraw_consent'
  );
end;
$$;

create function public.withdraw_identity_verification_consent(p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  management_record app_private.identity_verification_management_tokens%rowtype;
begin
  if auth.uid() is not null then
    perform app_private.require_current_session();
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'verification management is unavailable' using errcode = '22023';
  end if;
  select * into management_record
  from app_private.identity_verification_management_tokens management
  where management.token_hash = p_token_hash
  for update;
  if management_record.id is null
    or management_record.scope <> 'withdraw_consent'
    or management_record.consumed_at is not null
    or management_record.revoked_at is not null
    or management_record.expires_at <= pg_catalog.now()
  then
    raise exception 'verification management is unavailable' using errcode = '22023';
  end if;

  update app_private.identity_verification_management_tokens
  set consumed_at = pg_catalog.now()
  where id = management_record.id;
  update app_private.identity_verification_attempts
  set status = 'revoked',
      consent_withdrawn_at = pg_catalog.now(),
      completed_at = coalesce(completed_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where candidate_id = management_record.candidate_id
    and status in ('created', 'invited', 'in_progress', 'verified');
  perform app_private.revoke_identity_verification(management_record.candidate_id, 'consent withdrawn');
end;
$$;

create function public.retry_identity_verification(
  p_token_hash text,
  p_management_token_hash text
)
returns table(
  attempt_id uuid,
  provider_subject_ref uuid,
  legal_name text,
  birth_date date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  management_record app_private.identity_verification_management_tokens%rowtype;
  candidate_record public.candidates%rowtype;
  previous_attempt app_private.identity_verification_attempts%rowtype;
  replacement_attempt app_private.identity_verification_attempts%rowtype;
begin
  if auth.uid() is not null then
    perform app_private.require_current_session();
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_management_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'verification retry is unavailable' using errcode = '22023';
  end if;
  select * into management_record
  from app_private.identity_verification_management_tokens management
  where management.token_hash = p_token_hash
  for update;
  if management_record.id is null
    or management_record.consumed_at is not null
    or management_record.revoked_at is not null
    or management_record.expires_at <= pg_catalog.now()
  then
    raise exception 'verification retry is unavailable' using errcode = '22023';
  end if;
  select * into previous_attempt
  from app_private.identity_verification_attempts attempt
  where attempt.candidate_id = management_record.candidate_id
  order by attempt.created_at desc
  limit 1
  for update;
  if previous_attempt.id is null
    or previous_attempt.status not in ('created', 'failed', 'expired', 'declined')
    or previous_attempt.consent_withdrawn_at is not null
  then
    raise exception 'verification retry is unavailable' using errcode = '22023';
  end if;
  select * into candidate_record
  from public.candidates candidate
  where candidate.id = management_record.candidate_id
  for update;
  if candidate_record.legal_name is null
    or pg_catalog.btrim(candidate_record.legal_name) = ''
    or candidate_record.birth_date is null
  then
    raise exception 'verification details are unavailable' using errcode = '22023';
  end if;

  insert into app_private.identity_verification_attempts(
    candidate_id, provider_subject_ref, status,
    consent_version, consented_at, consent_purpose,
    consent_processing_details, consent_retention_details, consent_withdrawal_details
  ) values (
    previous_attempt.candidate_id, previous_attempt.provider_subject_ref, 'created',
    previous_attempt.consent_version, previous_attempt.consented_at, previous_attempt.consent_purpose,
    previous_attempt.consent_processing_details, previous_attempt.consent_retention_details,
    previous_attempt.consent_withdrawal_details
  ) returning * into replacement_attempt;
  update app_private.identity_verification_management_tokens
  set consumed_at = pg_catalog.now()
  where id = management_record.id;
  insert into app_private.identity_verification_management_tokens(
    candidate_id, token_hash, scope, expires_at
  ) values (
    previous_attempt.candidate_id, p_management_token_hash, 'withdraw_consent', pg_catalog.now() + interval '30 days'
  );

  return query select replacement_attempt.id, replacement_attempt.provider_subject_ref,
    candidate_record.legal_name, candidate_record.birth_date;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text) to anon, authenticated;
revoke all on function public.create_identity_verification_invitation(uuid, text) from public, anon, authenticated;
grant execute on function public.create_identity_verification_invitation(uuid, text) to authenticated;
revoke all on function public.begin_identity_verification(uuid, text, text) from public, anon, authenticated;
grant execute on function public.begin_identity_verification(uuid, text, text) to anon, authenticated;
revoke all on function public.attach_identity_verification_provider_session(uuid, text, text) from public, anon, authenticated;
grant execute on function public.attach_identity_verification_provider_session(uuid, text, text) to anon, authenticated;
revoke all on function public.get_identity_verification_link_status(text) from public, anon, authenticated;
grant execute on function public.get_identity_verification_link_status(text) to anon, authenticated;
revoke all on function public.withdraw_identity_verification_consent(text) from public, anon, authenticated;
grant execute on function public.withdraw_identity_verification_consent(text) to anon, authenticated;
revoke all on function public.retry_identity_verification(text, text) from public, anon, authenticated;
grant execute on function public.retry_identity_verification(text, text) to anon, authenticated;
