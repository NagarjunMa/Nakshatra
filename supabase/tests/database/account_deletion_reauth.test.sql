begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(16);

select pg_temp.create_auth_actor('71000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'reauth-owner@nakshatra.test', now() - interval '1 minute');
select pg_temp.create_auth_actor('71000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', 'reauth-other@nakshatra.test', now() - interval '1 minute');

select has_function('public', 'start_account_deletion_reauth', array['uuid'], 'start reauthentication RPC exists');
select has_function('public', 'complete_account_deletion_reauth', array['uuid', 'text'], 'completion RPC exists');
select has_function('public', 'consume_account_deletion_reauth', array['text'], 'consume-and-schedule RPC exists');
select ok(
  not has_table_privilege('authenticated', 'app_private.account_deletion_reauth_challenges', 'select'),
  'authenticated callers cannot inspect private challenges'
);
select ok(
  not has_function_privilege('authenticated', 'public.request_account_deletion()', 'execute'),
  'authenticated callers cannot bypass reauthentication through the legacy scheduler RPC'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000001"}';

create temporary table first_challenge as
select (public.start_account_deletion_reauth('72000000-0000-4000-8000-000000000001') ->> 'challengeId')::uuid as id;
select ok((select id is not null from first_challenge), 'live initiating session creates a challenge');
select is(
  public.complete_account_deletion_reauth((select id from first_challenge), repeat('a', 64)),
  'not_fresh',
  'the initiating session cannot satisfy fresh reauthentication'
);

reset role;
select pg_temp.create_auth_session('71000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000003', now() + interval '1 second');

set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000003"}';
select is(
  public.complete_account_deletion_reauth((select id from first_challenge), repeat('a', 64)),
  'verified',
  'a newer same-user live session verifies the challenge'
);
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000001"}';
select is(
  public.consume_account_deletion_reauth(repeat('a', 64)) ->> 'status',
  'proof_invalid',
  'the initiating session cannot consume a proof issued to the fresh session'
);
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000003"}';
select is(
  public.consume_account_deletion_reauth(repeat('a', 64)) ->> 'status',
  'pending',
  'a verified proof atomically schedules deletion'
);
select is(
  public.consume_account_deletion_reauth(repeat('a', 64)) ->> 'status',
  'proof_invalid',
  'a consumed proof cannot be replayed'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000002"}';
select is(
  public.consume_account_deletion_reauth(repeat('a', 64)) ->> 'status',
  'proof_invalid',
  'a different user cannot consume another user''s proof'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000002"}';
create temporary table expired_challenge as
select (public.start_account_deletion_reauth('72000000-0000-4000-8000-000000000002') ->> 'challengeId')::uuid as id;

reset role;
update app_private.account_deletion_reauth_challenges
set created_at = now() - interval '11 minutes',
    expires_at = now() - interval '1 second'
where id = (select id from expired_challenge);

set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"72000000-0000-4000-8000-000000000002"}';
select is(
  public.complete_account_deletion_reauth((select id from expired_challenge), repeat('b', 64)),
  'expired',
  'expired challenge is invalidated before it can produce a proof'
);

reset role;
select is(
  (select count(*)::integer from app_private.account_deletion_reauth_challenges where consumed_at is not null),
  1,
  'only the successfully consumed proof is retained as consumed state'
);
select is(
  (select status from public.account_deletion_requests where user_id = '71000000-0000-4000-8000-000000000001'),
  'pending',
  'the existing NAK-39 deletion state machine owns the resulting pending request'
);
select ok(
  has_function_privilege('authenticated', 'public.start_account_deletion_reauth(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.complete_account_deletion_reauth(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.consume_account_deletion_reauth(text)', 'execute'),
  'only the explicit reauthentication RPC surface is granted to authenticated callers'
);

select * from finish();
rollback;
