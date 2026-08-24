begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(39);

select has_function('public', 'is_current_session_active', array[]::text[], 'live Auth session predicate exists');
select has_function('app_private', 'require_current_session', array[]::text[], 'internal live-session guard exists');
select ok(not has_function_privilege('anon', 'public.is_current_session_active()', 'EXECUTE'), 'anonymous callers cannot probe Auth sessions');
select ok(has_function_privilege('authenticated', 'public.is_current_session_active()', 'EXECUTE'), 'authenticated callers can validate their own session');
select ok(not has_function_privilege('authenticated', 'app_private.require_current_session()', 'EXECUTE'), 'the throwing guard is internal only');
select has_function('public', 'is_public_portfolio_media_path', array['text', 'text'], 'public-media Storage predicate exists');
select ok(not has_function_privilege('anon', 'public.is_public_portfolio_media_path(text,text)', 'EXECUTE'), 'anonymous callers cannot use the internal Storage policy helper as an RPC');

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and policyname = 'Authenticated requests require a live session'
      and permissive = 'RESTRICTIVE'
      and cmd = 'ALL'
      and roles = array['authenticated']::name[]
  ),
  37,
  'every private application table has one restrictive live-session policy'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'Authenticated storage % require a live session'
      and permissive = 'RESTRICTIVE'
      and roles = array['authenticated']::name[]
  ),
  4,
  'Storage has restrictive read, insert, update, and delete session policies'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'submit_public_interest(text,text,text,text,text,text,text,text,text)',
      'decide_interest_request(uuid,text)',
      'manage_reveal_grant(uuid,text)',
      'publish_portfolio_transaction(uuid,jsonb,jsonb,jsonb,text,timestamp with time zone,integer,text,text)',
      'renew_portfolio_transaction(timestamp with time zone)',
      'rotate_portfolio_transaction(text)',
      'unpublish_portfolio_transaction()',
      'replace_candidate_relationships_and_timeline(uuid,jsonb,jsonb,jsonb)',
      'list_portfolio_access()',
      'resolve_approved_portfolio(text)',
      'resolve_approved_horoscope(text)',
      'set_portfolio_hero(uuid)',
      'can_manage_organization_member(uuid,organization_member_role)',
      'create_organization_with_owner(organization_type,text,text)',
      'start_account_deletion_reauth(uuid)',
      'complete_account_deletion_reauth(uuid,text)',
      'consume_account_deletion_reauth(text)',
      'cancel_account_deletion()',
      'export_my_account_data()'
    ]) signature
    where pg_catalog.strpos(
      pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.' || signature)),
      'app_private.require_current_session()'
    ) = 0
  ),
  'every authenticated privileged RPC has an explicit live-session guard'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'app_private.resolve_approved_portfolio(text)',
    'EXECUTE'
  ),
  'authenticated callers cannot bypass the approved-view wrapper'
);

select ok(
  not exists (
    select 1
    from pg_proc function_record
    join pg_namespace function_schema on function_schema.oid = function_record.pronamespace
    where function_schema.nspname = 'public'
      and function_record.prosecdef = true
      and has_function_privilege('authenticated', function_record.oid, 'EXECUTE')
      and function_record.oid not in (
        'public.is_current_session_active()'::regprocedure,
        'public.is_published_portfolio(uuid)'::regprocedure,
        'public.resolve_public_portfolio(text)'::regprocedure,
        'public.record_public_portfolio_view(text)'::regprocedure,
        'public.consume_api_rate_limit(text,text)'::regprocedure,
        'public.is_public_portfolio_media_path(text,text)'::regprocedure
      )
      and pg_catalog.strpos(
        pg_catalog.pg_get_functiondef(function_record.oid),
        'app_private.require_current_session()'
      ) = 0
  ),
  'every authenticated SECURITY DEFINER RPC is guarded or explicitly allowlisted'
);

select ok(has_function_privilege('anon', 'public.resolve_public_portfolio(text)', 'EXECUTE'), 'public portfolio resolution remains anonymous');
select ok(has_function_privilege('anon', 'public.record_public_portfolio_view(text)', 'EXECUTE'), 'public view recording remains anonymous');
select ok(
  pg_catalog.obj_description('public.is_public_portfolio_media_path(text,text)'::regprocedure, 'pg_proc') is not null,
  'the unguarded public-media helper is explicitly documented as a safe allowlist entry'
);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner@session.test', now(), now()),
  ('51000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'other@session.test', now(), now());

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', now(), now()),
  ('52000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', now(), now());

insert into public.portfolios (id, user_id, draft_data)
values ('53000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '{}'::jsonb);

insert into public.account_deletion_requests (id, user_id, subject_hash)
values (
  '54000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  repeat('a', 64)
);

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

insert into storage.objects (bucket_id, name)
values ('photos', '51000000-0000-4000-8000-000000000001/private.webp');

set local role authenticated;
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"52000000-0000-4000-8000-000000000001"}';

select ok(public.is_current_session_active(), 'a JWT bound to the same live Auth session is active');
select is((select count(*)::integer from public.portfolios), 1, 'a live owner session keeps existing private table access');
select is((select count(*)::integer from public.account_deletion_requests), 1, 'a live owner session can read its deletion state');
select is((select count(*)::integer from storage.objects where bucket_id = 'photos'), 1, 'a live owner session keeps existing private Storage access');
select lives_ok($$select public.list_portfolio_access()$$, 'a live session can execute a privileged RPC');
select lives_ok($$select public.export_my_account_data()$$, 'a live session can execute a Phase 4 account RPC');
select ok(not public.is_public_portfolio_media_path('photos', 'missing.webp'), 'the public-media helper does not reveal private or missing paths');

set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}';
select ok(not public.is_current_session_active(), 'a JWT without a session identifier fails closed');

set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"not-a-uuid"}';
select ok(not public.is_current_session_active(), 'a malformed session identifier fails closed without casting errors');

set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"52000000-0000-4000-8000-000000000002"}';
select ok(not public.is_current_session_active(), 'a session belonging to another user is rejected');
select is((select count(*)::integer from public.portfolios), 0, 'a mismatched session cannot read private tables');
select is((select count(*)::integer from public.account_deletion_requests), 0, 'a mismatched session cannot read account deletion state');
select is((select count(*)::integer from storage.objects where bucket_id = 'photos'), 0, 'a mismatched session cannot read private Storage');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('photos', '51000000-0000-4000-8000-000000000001/new.webp')$$,
  '42501',
  null,
  'a mismatched session cannot upload a private Storage object'
);
select is_empty(
  $$
    update storage.objects
    set name = '51000000-0000-4000-8000-000000000001/changed.webp'
    where name = '51000000-0000-4000-8000-000000000001/private.webp'
    returning id
  $$,
  'a mismatched session cannot update a private Storage object'
);
select throws_ok(
  $$select public.list_portfolio_access()$$,
  '42501',
  'authentication session is no longer active',
  'a mismatched session cannot execute a privileged RPC'
);
select throws_ok(
  $$select public.export_my_account_data()$$,
  '42501',
  'authentication session is no longer active',
  'a mismatched session cannot execute Phase 4 account RPCs'
);
select throws_ok(
  $$select public.can_manage_organization_member('55000000-0000-4000-8000-000000000001', 'viewer')$$,
  '42501',
  'authentication session is no longer active',
  'a mismatched session cannot execute organization authorization helpers'
);

reset role;
delete from auth.sessions where id = '52000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"52000000-0000-4000-8000-000000000001"}';
select ok(not public.is_current_session_active(), 'deleting the backing Auth session immediately revokes the JWT');
select is((select count(*)::integer from public.portfolios), 0, 'a revoked session cannot read private rows');
select throws_ok(
  $$select public.renew_portfolio_transaction(now() + interval '90 days')$$,
  '42501',
  'authentication session is no longer active',
  'a revoked session cannot execute publication lifecycle RPCs'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(public.resolve_public_portfolio('missing-session-test-token'), null, 'anonymous sanitized portfolio behavior is unchanged');

reset role;
set local role service_role;
select is((select count(*)::integer from public.portfolios), 1, 'trusted service-role maintenance still bypasses user RLS');
select is(
  (select name from storage.objects where bucket_id = 'photos' limit 1),
  '51000000-0000-4000-8000-000000000001/private.webp',
  'revoked Storage mutations leave the private object unchanged'
);

reset role;
select * from finish();
rollback;
