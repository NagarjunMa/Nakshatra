begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(17);

select pg_temp.create_auth_actor(
  '97000000-0000-4000-8000-000000000001',
  '97100000-0000-4000-8000-000000000001',
  'webhook-owner@test.local'
);

insert into public.candidates (id, primary_owner_user_id, display_name, legal_name, birth_date, created_by)
values (
  '97200000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'Webhook Candidate', 'Synthetic Test Person', '1990-01-01',
  '97000000-0000-4000-8000-000000000001'
);

insert into app_private.identity_verification_attempts(
  id, candidate_id, provider_subject_ref, provider_session_ref, status
)
select
  '97300000-0000-4000-8000-000000000001', subject.candidate_id,
  subject.provider_subject_ref, '97400000-0000-4000-8000-000000000001', 'in_progress'
from app_private.identity_verification_subjects subject
where subject.candidate_id = '97200000-0000-4000-8000-000000000001';

create temporary table webhook_attempt as
select provider_subject_ref
from app_private.identity_verification_attempts
where id = '97300000-0000-4000-8000-000000000001';

select ok(
  not has_function_privilege('anon', 'public.record_identity_verification_webhook(text,text,uuid,text,uuid)', 'execute'),
  'anonymous callers cannot record identity-verification webhooks'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_identity_verification_work(integer)', 'execute'),
  'authenticated callers cannot claim identity-verification work'
);

set local role service_role;
do $$ begin
  perform pg_temp.set_service_role_claims();
end $$;

select ok(
  public.record_identity_verification_webhook(
    repeat('a', 64), repeat('b', 64),
    '97300000-0000-4000-8000-000000000001',
    '97400000-0000-4000-8000-000000000001',
    (select provider_subject_ref from webhook_attempt)
  ),
  'a matching signed-webhook receipt is persisted and queued'
);
select ok(
  public.record_identity_verification_webhook(
    repeat('a', 64), repeat('c', 64),
    '97300000-0000-4000-8000-000000000001',
    '97400000-0000-4000-8000-000000000001',
    (select provider_subject_ref from webhook_attempt)
  ),
  'a duplicate provider event is acknowledged without replaying work'
);
select ok(
  not public.record_identity_verification_webhook(
    repeat('d', 64), repeat('e', 64),
    '97300000-0000-4000-8000-000000000001',
    '97400000-0000-4000-8000-000000000099',
    (select provider_subject_ref from webhook_attempt)
  ),
  'an event with a mismatched provider session does not enter the private inbox'
);

reset role;
select is(
  (select count(*)::integer from app_private.identity_verification_webhook_events),
  1,
  'the private inbox stores one deduplicated digest-only event receipt'
);
select ok(
  exists (
    select 1 from app_private.identity_verification_worker_state
    where attempt_id = '97300000-0000-4000-8000-000000000001'
      and task_type = 'reconcile' and completed_at is null
  ),
  'a durable reconcile work item is queued for the matching attempt'
);

set local role service_role;
do $$ begin
  perform pg_temp.set_service_role_claims();
end $$;
create temporary table reconcile_claim as
select * from public.claim_identity_verification_work(1);
select is(
  (select task_type from reconcile_claim), 'reconcile',
  'the service-role worker claims the reconciler with a lease'
);
select is(
  (select provider_session_ref from reconcile_claim),
  '97400000-0000-4000-8000-000000000001',
  'the claim contains only the server-side provider session reference'
);
select throws_ok(
  $$select public.complete_identity_verification_reconciliation(
    '97300000-0000-4000-8000-000000000001',
    (select claim_token from reconcile_claim), 'verified', true, false, true, true, true
  )$$,
  '23514', null,
  'a verified projection requires every approved decision signal'
);
select ok(
  public.complete_identity_verification_reconciliation(
    '97300000-0000-4000-8000-000000000001',
    (select claim_token from reconcile_claim), 'verified', true, true, true, true, true
  ),
  'all required decision signals produce a verified projection'
);

reset role;
select is(
  (select status from app_private.identity_verification_subjects where candidate_id = '97200000-0000-4000-8000-000000000001'),
  'verified',
  'only the normalized verified state is retained for the candidate'
);
select ok(
  exists (
    select 1 from app_private.identity_verification_worker_state
    where attempt_id = '97300000-0000-4000-8000-000000000001'
      and task_type = 'provider_redaction' and completed_at is null
  ),
  'a terminal attempt schedules provider-session deletion'
);

set local role service_role;
do $$ begin
  perform pg_temp.set_service_role_claims();
end $$;
create temporary table redaction_claim as
select * from public.claim_identity_verification_work(1);
select is(
  (select task_type from redaction_claim), 'provider_redaction',
  'the session-deletion task is independently leased'
);
select ok(
  public.complete_identity_verification_provider_redaction(
    '97300000-0000-4000-8000-000000000001',
    (select claim_token from redaction_claim)
  ),
  'an idempotently deleted provider session completes its private receipt'
);

reset role;
select ok(
  (select status = 'redacted' and provider_redacted_at is not null
   from app_private.identity_verification_attempts
   where id = '97300000-0000-4000-8000-000000000001'),
  'the attempt retains only normalized redaction state after provider deletion'
);
set local role anon;
do $$ begin
  perform pg_temp.set_anon_claims();
end $$;
select throws_ok(
  $$select public.claim_identity_verification_work(0)$$,
  '42501', null,
  'non-service callers cannot probe worker validation'
);

select * from finish();
rollback;
