begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../support/auth-fixtures.sql

select plan(16);

select has_table('app_private', 'api_rate_limits', 'rate-limit state is stored outside the exposed public schema');
select has_function(
  'public',
  'consume_api_rate_limit',
  array['text', 'text'],
  'the bounded rate-limit command exists'
);
select ok(
  has_function_privilege('anon', 'public.consume_api_rate_limit(text,text)', 'EXECUTE'),
  'anonymous application requests can consume a quota'
);
select ok(
  has_function_privilege('authenticated', 'public.consume_api_rate_limit(text,text)', 'EXECUTE'),
  'authenticated application requests can consume a quota'
);
select ok(
  not has_table_privilege('anon', 'app_private.api_rate_limits', 'SELECT'),
  'anonymous callers cannot inspect quota subjects'
);
select ok(
  not has_table_privilege('authenticated', 'app_private.api_rate_limits', 'SELECT'),
  'authenticated callers cannot inspect quota subjects'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'photos'),
  array['image/webp']::text[],
  'the photo bucket accepts only server-sanitized WebP output'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'horoscopes'),
  array['image/webp']::text[],
  'the horoscope bucket rejects raw document and image containers'
);

set local role anon;
select is(
  public.consume_api_rate_limit('auth_google', repeat('a', 64)) ->> 'allowed',
  'true',
  'a valid anonymous hash can consume an available quota'
);
select is(
  public.consume_api_rate_limit('auth_google', 'raw-ip-address') ->> 'allowed',
  'false',
  'an un-hashed anonymous subject fails closed'
);
select throws_ok(
  $$select public.consume_api_rate_limit('unconfigured_action', repeat('b', 64))$$,
  '22023',
  null,
  'callers cannot choose arbitrary quota classes'
);

reset role;
insert into app_private.api_rate_limits (
  action, subject_key, window_started_at, request_count, updated_at
) values (
  'auth_email', 'anonymous:' || repeat('c', 64), now(), 5, now()
);

set local role anon;
select is(
  public.consume_api_rate_limit('auth_email', repeat('c', 64)) ->> 'allowed',
  'false',
  'requests beyond the fixed email quota are denied'
);
select ok(
  (public.consume_api_rate_limit('auth_email', repeat('c', 64)) ->> 'retryAfter')::integer > 0,
  'denied requests include a positive retry delay'
);

reset role;
update app_private.api_rate_limits
set window_started_at = now() - interval '16 minutes', request_count = 5
where action = 'auth_email' and subject_key = 'anonymous:' || repeat('c', 64);

set local role anon;
select is(
  public.consume_api_rate_limit('auth_email', repeat('c', 64)) ->> 'allowed',
  'true',
  'an elapsed window starts a fresh quota'
);

reset role;
select pg_temp.create_auth_actor(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001',
  'rate-limit@example.test'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"b2000000-0000-4000-8000-000000000001"}';
select is(
  public.consume_api_rate_limit('dashboard_save', repeat('d', 64)) ->> 'allowed',
  'true',
  'an authenticated identity can consume its quota'
);

reset role;
select is(
  (
    select subject_key
    from app_private.api_rate_limits
    where action = 'dashboard_save'
  ),
  'user:b1000000-0000-4000-8000-000000000001',
  'authenticated quotas bind to auth.uid instead of caller-supplied hashes'
);

select * from finish();
rollback;
