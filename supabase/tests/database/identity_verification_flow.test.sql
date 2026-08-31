begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('95000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'verification-owner@test.local', now(), now()),
  ('95000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'verification-other@test.local', now(), now());

-- The live-session perimeter validates the JWT session_id against auth.sessions.
-- Keep these fixture IDs aligned with every authenticated request below.
insert into auth.sessions (id, user_id, created_at, updated_at)
values
  ('95100000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', now(), now()),
  ('95100000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', now(), now());

insert into public.candidates (id, primary_owner_user_id, display_name, legal_name, birth_date, created_by)
values
  ('96000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'Accountless Verification Candidate', 'Private Candidate Name', '1995-03-21', '95000000-0000-4000-8000-000000000001'),
  ('96000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000001', 'Self Verification Candidate', 'Self Candidate Name', '1994-02-20', '95000000-0000-4000-8000-000000000001');

select ok(
  not has_table_privilege('authenticated', 'app_private.identity_verification_management_tokens', 'select'),
  'authenticated callers cannot read private management tokens'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"95100000-0000-4000-8000-000000000001"}';
select ok(
  public.create_identity_verification_invitation('96000000-0000-4000-8000-000000000001', repeat('a', 64)) > now(),
  'an authorized owner creates a short-lived candidate-bound invitation'
);

set local request.jwt.claims = '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"95100000-0000-4000-8000-000000000002"}';
select throws_ok(
  $$select public.create_identity_verification_invitation('96000000-0000-4000-8000-000000000001', repeat('b', 64))$$,
  '42501', null, 'a different authenticated user cannot issue an invitation'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(
  public.get_identity_verification_link_status(repeat('a', 64)) ->> 'kind',
  'invitation', 'an accountless bearer link resolves only to generic invitation state'
);
select ok(
  not (public.get_identity_verification_link_status(repeat('a', 64)) ?| array['candidateId', 'legalName', 'birthDate', 'providerSessionRef']),
  'invitation inspection exposes no candidate or provider data'
);

create temporary table invitation_start as
select * from public.begin_identity_verification(null, repeat('a', 64), repeat('c', 64));
select is((select count(*)::integer from invitation_start), 1, 'a valid invitation creates exactly one verification attempt');

-- The anonymous flow above must remain unable to inspect private verification
-- records. Reset only this assertion to the pgTAP runner's trusted role, then return to
-- anon for the remaining bearer-link behavior checks.
reset role;
select ok(
  exists (
    select 1 from app_private.identity_verification_attempts attempt
    where attempt.id = (select attempt_id from invitation_start)
      and attempt.consent_version = '2026-08-28'
      and attempt.consented_at is not null
      and attempt.consent_purpose is not null
      and attempt.consent_processing_details is not null
      and attempt.consent_retention_details is not null
      and attempt.consent_withdrawal_details is not null
  ),
  'consent version, timestamp, purpose, processing, retention, and withdrawal details are recorded before session creation'
);
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$select * from public.begin_identity_verification(null, repeat('a', 64), repeat('d', 64))$$,
  '22023', null, 'a consumed invitation cannot start a second attempt'
);
select throws_ok(
  $$select public.attach_identity_verification_provider_session((select attempt_id from invitation_start), '11111111-1111-4111-8111-111111111111', repeat('d', 64))$$,
  '22023', null, 'a provider session cannot be attached without the matching private management credential'
);
select lives_ok(
  $$select public.attach_identity_verification_provider_session((select attempt_id from invitation_start), '11111111-1111-4111-8111-111111111111', repeat('c', 64))$$,
  'the matching management credential attaches the hosted provider session'
);
select is(
  public.get_identity_verification_link_status(repeat('c', 64)) ->> 'status',
  'in_progress', 'the management link exposes only generic in-progress state'
);
select ok(
  not (public.get_identity_verification_link_status(repeat('c', 64)) ?| array['candidateId', 'legalName', 'birthDate', 'providerSessionRef']),
  'management status never returns candidate or provider identifiers'
);
select lives_ok(
  $$select public.withdraw_identity_verification_consent(repeat('c', 64))$$,
  'a valid management link withdraws consent once'
);

-- Private-table state is checked under the trusted test role, never through
-- the anonymous bearer-link caller used to exercise the public RPCs above.
reset role;
select ok(
  (select status = 'revoked' and revoked_at is not null from app_private.identity_verification_subjects where candidate_id = '96000000-0000-4000-8000-000000000001')
  and exists (
    select 1 from app_private.identity_verification_attempts
    where id = (select attempt_id from invitation_start)
      and status = 'revoked' and consent_withdrawn_at is not null
  ),
  'withdrawal revokes the derived verification and records the withdrawal timestamp'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"95100000-0000-4000-8000-000000000099"}';
select throws_ok(
  $$select public.get_identity_verification_link_status(repeat('c', 64))$$,
  '42501', 'authentication session is no longer active',
  'a revoked authenticated session cannot use a bearer verification link'
);

set local request.jwt.claims = '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"95100000-0000-4000-8000-000000000001"}';
select is(
  (select legal_name from public.begin_identity_verification('96000000-0000-4000-8000-000000000002', null, repeat('e', 64))),
  'Self Candidate Name', 'only the candidate primary owner can begin direct self-verification'
);

set local request.jwt.claims = '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"95100000-0000-4000-8000-000000000002"}';
select throws_ok(
  $$select * from public.begin_identity_verification('96000000-0000-4000-8000-000000000002', null, repeat('f', 64))$$,
  '42501', null, 'a non-primary owner cannot begin direct self-verification'
);

set local request.jwt.claims = '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"95100000-0000-4000-8000-000000000099"}';
select throws_ok(
  $$select * from public.begin_identity_verification('96000000-0000-4000-8000-000000000002', null, repeat('0', 64))$$,
  '42501', 'authentication session is no longer active',
  'a revoked authenticated session cannot begin direct self-verification'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(
  public.consume_api_rate_limit('identity_verification_start', repeat('9', 64)) ->> 'allowed',
  'true', 'identity-verification starts use a database-backed anonymous rate limit'
);

select * from finish();
rollback;
