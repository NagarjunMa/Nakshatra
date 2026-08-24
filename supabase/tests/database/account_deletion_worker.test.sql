begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(24);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'delete-owner@worker.test', now(), now()),
  ('61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'delete-stale@worker.test', now(), now());

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', now(), now()),
  ('62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', now(), now());

select has_function('public', 'claim_account_deletion_batch', array['integer'], 'worker claim RPC exists');
select has_function('public', 'complete_account_deletion', array['uuid', 'uuid'], 'worker receipt RPC exists');
select ok(
  not has_function_privilege('authenticated', 'public.claim_account_deletion_batch(integer)', 'EXECUTE'),
  'authenticated users cannot claim deletion work'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"62000000-0000-4000-8000-000000000001"}';

select is(public.request_account_deletion() ->> 'status', 'pending', 'a new deletion request enters pending');
create temporary table owner_deadline as
select scheduled_for from public.account_deletion_requests where user_id = '61000000-0000-4000-8000-000000000001';
select is(
  (public.request_account_deletion() ->> 'scheduledFor')::timestamptz,
  (select scheduled_for from owner_deadline),
  'repeating a pending request preserves its original recovery deadline'
);
select ok(public.is_current_session_active(), 'pending deletion preserves private session access');

reset role;
select is(
  (select count(*)::integer from auth.sessions where user_id = '61000000-0000-4000-8000-000000000001'),
  1,
  'pending deletion does not revoke Auth sessions'
);
update public.account_deletion_requests
set scheduled_for = now() - interval '1 second'
where user_id = '61000000-0000-4000-8000-000000000001';

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
create temporary table owner_claim as
select * from public.claim_account_deletion_batch(1);
select is((select count(*)::integer from owner_claim), 1, 'worker claims a due pending request once');
select is(
  (select processing_stage from public.account_deletion_requests where id = (select request_id from owner_claim)),
  'claimed',
  'claim records the initial durable worker stage'
);

-- service_role may invoke the worker RPC but must not receive direct access to
-- auth.sessions. Return to the test owner to inspect the Auth-side effect.
reset role;
select is(
  (select count(*)::integer from auth.sessions where user_id = '61000000-0000-4000-8000-000000000001'),
  0,
  'claim atomically revokes every Auth session'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"62000000-0000-4000-8000-000000000001"}';
select ok(not public.is_current_session_active(), 'processing deletion denies the previously live JWT');

reset role;
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select ok(
  not public.advance_account_deletion_stage(
    (select request_id from owner_claim),
    '00000000-0000-4000-8000-000000000099',
    'initial_storage_cleaned'
  ),
  'a mismatched claim token cannot advance deletion work'
);
select ok(
  public.advance_account_deletion_stage(
    (select request_id from owner_claim),
    (select claim_token from owner_claim),
    'initial_storage_cleaned'
  ),
  'the owning claim advances initial Storage cleanup'
);
select lives_ok(
  $$select public.prepare_account_deletion(
    (select request_id from owner_claim),
    '61000000-0000-4000-8000-000000000001',
    (select claim_token from owner_claim)
  )$$,
  'database cleanup validates and advances the owned claim'
);
select ok(
  public.advance_account_deletion_stage(
    (select request_id from owner_claim),
    (select claim_token from owner_claim),
    'final_storage_cleaned'
  ),
  'the owning claim advances final Storage cleanup'
);

update public.account_deletion_requests
set user_id = null
where id = (select request_id from owner_claim);
select ok(
  public.record_account_deletion_auth_deleted(
    (select request_id from owner_claim),
    (select claim_token from owner_claim)
  ),
  'a null Auth foreign key records the durable post-Auth stage'
);
select ok(
  public.complete_account_deletion(
    (select request_id from owner_claim),
    (select claim_token from owner_claim)
  ),
  'the owned claim writes a completion receipt'
);
select is(
  (select status from public.account_deletion_requests where id = (select request_id from owner_claim)),
  'completed',
  'completion retains an auditable terminal receipt'
);

insert into public.account_deletion_requests (
  user_id, subject_hash, status, scheduled_for, processing_stage, lease_token, lease_expires_at
) values (
  '61000000-0000-4000-8000-000000000002', repeat('b', 64), 'processing', now() - interval '2 hours',
  'database_prepared', '63000000-0000-4000-8000-000000000001', now() - interval '1 second'
);
create temporary table stale_claim as
select * from public.claim_account_deletion_batch(1);
select is((select count(*)::integer from stale_claim), 1, 'an expired processing lease is reclaimed');
select isnt(
  (select claim_token from stale_claim),
  '63000000-0000-4000-8000-000000000001'::uuid,
  'stale lease reclaim rotates the ownership token'
);
select is(
  (select processing_stage from stale_claim),
  'database_prepared',
  'stale lease reclaim preserves the last durable stage'
);

select ok(
  public.fail_account_deletion(
    (select request_id from stale_claim),
    (select claim_token from stale_claim),
    'STORAGE_REMOVE_FAILED'
  ),
  'the owning pre-Auth worker can persist a retryable failure'
);
select is(
  (select status from public.account_deletion_requests where id = (select request_id from stale_claim)),
  'failed',
  'a recoverable worker error becomes failed rather than stranded processing'
);
select ok(
  (select retry_after > now() from public.account_deletion_requests where id = (select request_id from stale_claim)),
  'failed work receives a bounded retry time without changing its original deadline'
);

reset role;
select * from finish();
rollback;
