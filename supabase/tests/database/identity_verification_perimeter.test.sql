begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(17);

select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000001', '91100000-0000-4000-8000-000000000001', 'identity-owner@test.local');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000002', '91100000-0000-4000-8000-000000000002', 'verified-owner@test.local');

insert into public.candidates (id, primary_owner_user_id, display_name, created_by)
values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Unverified Candidate', '91000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'Verified Candidate', '91000000-0000-4000-8000-000000000002');

select ok(
  exists (select 1 from app_private.identity_verification_subjects where candidate_id = '92000000-0000-4000-8000-000000000001'),
  'every candidate receives one stable private verification subject'
);
select ok(not has_table_privilege('anon', 'app_private.identity_verification_subjects', 'select'), 'anon cannot read private verification subjects');
select ok(not has_table_privilege('authenticated', 'app_private.identity_verification_subjects', 'select'), 'authenticated cannot read private verification subjects');
select ok(not has_table_privilege('authenticated', 'app_private.identity_verification_attempts', 'insert,update,delete'), 'authenticated cannot mutate private verification attempts');

select throws_ok(
  $$insert into app_private.identity_verification_attempts(candidate_id, provider_subject_ref, evidence_payload)
    select '92000000-0000-4000-8000-000000000001', provider_subject_ref, '{"document_number":"must-not-persist"}'::jsonb
    from app_private.identity_verification_subjects where candidate_id = '92000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'raw identity evidence is rejected'
);

insert into app_private.identity_verification_invitations(candidate_id, token_hash, expires_at)
values ('92000000-0000-4000-8000-000000000001', repeat('a', 64), now() + interval '1 hour');
select is(app_private.consume_identity_verification_invitation(repeat('a', 64)), '92000000-0000-4000-8000-000000000001'::uuid, 'an invitation is consumed atomically');
select throws_ok($$select app_private.consume_identity_verification_invitation(repeat('a', 64))$$, '22023', null, 'a consumed invitation cannot be replayed');

insert into app_private.identity_verification_attempts(id, candidate_id, provider_subject_ref)
select '93000000-0000-4000-8000-000000000001', candidate_id, provider_subject_ref
from app_private.identity_verification_subjects
where candidate_id = '92000000-0000-4000-8000-000000000002';

select throws_ok(
  $$select app_private.transition_identity_verification_attempt('93000000-0000-4000-8000-000000000001', 'created', 'verified')$$,
  '22023', null, 'invalid attempt transitions fail atomically'
);
select is(app_private.transition_identity_verification_attempt('93000000-0000-4000-8000-000000000001', 'created', 'invited'), 'invited', 'the created to invited transition is accepted');
select is(app_private.transition_identity_verification_attempt('93000000-0000-4000-8000-000000000001', 'invited', 'in_progress'), 'in_progress', 'the invited to in-progress transition is accepted');
select is(app_private.transition_identity_verification_attempt('93000000-0000-4000-8000-000000000001', 'in_progress', 'verified'), 'verified', 'the in-progress to verified transition is accepted');
select lives_ok(
  $$select app_private.project_identity_verification('93000000-0000-4000-8000-000000000001', 'v1', now() - interval '1 minute', now() + interval '365 days')$$,
  'a verified attempt projects a current candidate verification'
);
select is((select status::text from app_private.identity_verification_subjects where candidate_id = '92000000-0000-4000-8000-000000000002'), 'verified', 'the normalized subject holds the verified status');

insert into public.portfolios (id, user_id, candidate_id, share_token, draft_data, published_data, expires_at)
values
  ('94000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'identity_unverified_tok', '{}'::jsonb, '{}'::jsonb, now() + interval '90 days'),
  ('94000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', 'identity_verified_token', '{}'::jsonb, '{}'::jsonb, now() + interval '90 days');

insert into public.portfolio_media (portfolio_id, candidate_id, media_type, storage_path, visibility, sort_order)
values
  ('94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'hero', '91000000-0000-4000-8000-000000000001/94000000-0000-4000-8000-000000000001/hero.webp', 'public', 0),
  ('94000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', 'hero', '91000000-0000-4000-8000-000000000002/94000000-0000-4000-8000-000000000002/hero.webp', 'public', 0);

select throws_ok($$update public.portfolios set is_published = true where id = '94000000-0000-4000-8000-000000000001'$$, '23514', null, 'direct database publication fails without current verification');
select lives_ok($$update public.portfolios set is_published = true where id = '94000000-0000-4000-8000-000000000002'$$, 'verified candidate publication succeeds');

insert into public.public_portfolio_snapshots(portfolio_id, share_token, data, template_id, is_active)
values ('94000000-0000-4000-8000-000000000002', 'identity_verified_token', '{}'::jsonb, 3, true);
select ok(
  (select identity_verification_badge = 'identity_verified'
    and identity_verified_until is not null
    and identity_reverification_grace_until = identity_verified_until + interval '30 days'
   from public.public_portfolio_snapshots where portfolio_id = '94000000-0000-4000-8000-000000000002'),
  'public snapshots receive only the safe verification badge and validity windows'
);

insert into app_private.identity_verification_worker_state(candidate_id, task_type)
values ('92000000-0000-4000-8000-000000000002', 'reconcile');
select is((select task_type from app_private.claim_identity_verification_work(1)), 'reconcile', 'worker claims are lease-backed and bounded');

select * from finish();
rollback;
