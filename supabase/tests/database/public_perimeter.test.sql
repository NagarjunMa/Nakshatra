begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../support/auth-fixtures.sql

select plan(25);

select pg_temp.create_auth_actor('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112', 'owner@perimeter.test');
select pg_temp.create_auth_actor('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222223', 'viewer@perimeter.test');

insert into public.candidates (id, primary_owner_user_id, display_name, created_by)
values ('33333333-3333-4333-8333-333333333334', '11111111-1111-4111-8111-111111111111', 'Aditi', '11111111-1111-4111-8111-111111111111');

update app_private.identity_verification_subjects
set status = 'verified', verified_at = now() - interval '1 day', expires_at = now() + interval '365 days'
where candidate_id = '33333333-3333-4333-8333-333333333334';

insert into public.portfolios (id, user_id, candidate_id, share_token, draft_data, published_data)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333334',
  'phase1_secure_token_1',
  '{}'::jsonb,
  '{}'::jsonb
);

insert into public.portfolio_media (
  id, portfolio_id, media_type, storage_path, visibility, sort_order, metadata
)
values
  ('44444444-4444-4444-8444-444444444441', '33333333-3333-4333-8333-333333333333', 'hero', '11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/hero.webp', 'public', 0, '{"blurPath":"11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/hero-blur.webp","width":800,"height":1200}'::jsonb),
  ('44444444-4444-4444-8444-444444444442', '33333333-3333-4333-8333-333333333333', 'gallery', '11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/first.webp', 'public', 1, '{"blurPath":"11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/first-blur.webp"}'::jsonb),
  ('44444444-4444-4444-8444-444444444443', '33333333-3333-4333-8333-333333333333', 'gallery', '11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/second.webp', 'public', 2, '{"blurPath":"11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/second-blur.webp"}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'gallery', '11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/protected.webp', 'approved_only', 3, '{"blurPath":"11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/protected-blur.webp"}'::jsonb);

update public.portfolios
set is_published = true, expires_at = now() + interval '90 days'
where id = '33333333-3333-4333-8333-333333333333';

insert into public.public_portfolio_snapshots (
  portfolio_id, share_token, data, template_id, theme_color, sun_sign, expires_at, is_active
) values (
  '33333333-3333-4333-8333-333333333333',
  'phase1_secure_token_1',
  '{"privacy_mode":"private","personal":{"name":"Aditi","age":29,"gender":"female"},"astrology":{"rashi":"kanya"},"visibility":{"contact":"restricted"}}'::jsonb,
  3,
  '#17151c',
  'kanya',
  now() + interval '90 days',
  true
);

insert into public.approved_portfolio_snapshots (
  portfolio_id, data, template_id, theme_color, sun_sign, published_at
) values (
  '33333333-3333-4333-8333-333333333333',
  '{"privacy_mode":"private","personal":{"name":"Aditi Approved","dob":"1996-08-12","gender":"female"},"family":{"father":{"name":"Private Parent"}}}'::jsonb,
  3,
  '#17151c',
  'kanya',
  now()
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select * from public.public_portfolio_snapshots$$,
  '42501', null,
  'anonymous users cannot enumerate snapshot rows'
);
select throws_ok(
  $$select * from public.portfolio_media$$,
  '42501', null,
  'anonymous users cannot enumerate media descriptors'
);
select throws_ok(
  $$insert into public.interest_requests (portfolio_id) values ('33333333-3333-4333-8333-333333333333')$$,
  '42501', null,
  'anonymous users cannot insert arbitrary interest rows'
);
select throws_ok(
  $$insert into public.portfolio_views (portfolio_id) values ('33333333-3333-4333-8333-333333333333')$$,
  '42501', null,
  'anonymous users cannot insert arbitrary view rows'
);

select is(
  public.resolve_public_portfolio('missing_token_123456'),
  null,
  'missing tokens return the same unavailable result'
);
select is(
  public.resolve_public_portfolio('bad token value'),
  null,
  'invalid tokens return the same unavailable result'
);
select is(
  public.resolve_public_portfolio('phase1_secure_token_1') #>> '{data,personal,name}',
  'Aditi',
  'an exact active token resolves one sanitized snapshot'
);
select ok(
  not (public.resolve_public_portfolio('phase1_secure_token_1') ? 'portfolioId'),
  'public resolver omits the private portfolio identifier'
);
select ok(
  public.resolve_public_portfolio('phase1_secure_token_1')::text not like '%second.webp%'
    and public.resolve_public_portfolio('phase1_secure_token_1')::text like '%second-blur.webp%',
  'private gallery originals are replaced by generated previews'
);
select ok(
  public.resolve_public_portfolio('phase1_secure_token_1')::text not like '%protected.webp%'
    and public.resolve_public_portfolio('phase1_secure_token_1')::text like '%protected-blur.webp%',
  'approved-only originals never enter the public response'
);
select throws_ok(
  $$select public.submit_public_interest(
    'phase1_secure_token_1', 'Rohan Mehta', 'self', '+1 555 010 2200',
    'viewer@perimeter.test', 'Toronto, Canada',
    'A family introduction with sufficient detail.',
    'We would be glad to introduce our families.', null
  )$$,
  '42501', null,
  'anonymous visitors cannot submit identity-free access requests'
);
select ok(
  public.record_public_portfolio_view('phase1_secure_token_1'),
  'the token-scoped view command accepts an active portfolio'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"22222222-2222-4222-8222-222222222223"}';
select ok(
  public.submit_public_interest(
    'phase1_secure_token_1', 'Rohan Mehta', 'self', '+1 555 010 2200',
    'viewer@perimeter.test', 'Toronto, Canada',
    'A family introduction with sufficient detail.',
    'We would be glad to introduce our families.', null,
    'Canada', 'Ontario', 'Toronto'
  ),
  'an authenticated viewer can submit an identity-bound request'
);

reset role;
select is((select count(*)::integer from public.interest_requests), 1, 'interest command inserts exactly one row');
select is((select status::text from public.interest_requests limit 1), 'new', 'interest status is database-owned');
select is((select requested_sections from public.interest_requests limit 1), array['full']::text[], 'requested scope is database-owned');
select is((select metadata ->> 'country' from public.interest_requests limit 1), 'Canada', 'interest command stores the structured country');
select is((select metadata ->> 'state' from public.interest_requests limit 1), 'Ontario', 'interest command stores the structured state');
select is((select metadata ->> 'city' from public.interest_requests limit 1), 'Toronto', 'interest command stores the structured city');
select is((select count(*)::integer from public.portfolio_views), 1, 'view command inserts one rate-limited row');
select throws_ok(
  $$update public.public_portfolio_snapshots set data = jsonb_set(data, '{contact}', '{"email":"private@example.test"}'::jsonb)$$,
  '23514', null,
  'database rejects restricted fields in a public snapshot'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"11111111-1111-4111-8111-111111111112"}';
select is(
  public.decide_interest_request((select id from public.interest_requests limit 1), 'approved'),
  'approved',
  'owner approval atomically creates full access'
);

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"22222222-2222-4222-8222-222222222223"}';
select is(
  public.resolve_approved_portfolio('phase1_secure_token_1') #>> '{data,personal,name}',
  'Aditi Approved',
  'an approved authenticated viewer receives the approved projection'
);

set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","session_id":"11111111-1111-4111-8111-111111111112"}';
select is(
  public.decide_interest_request((select id from public.interest_requests limit 1), 'rejected'),
  'rejected',
  'rejection revokes the active grant atomically'
);

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","session_id":"22222222-2222-4222-8222-222222222223"}';
select is(
  public.resolve_approved_portfolio('phase1_secure_token_1'),
  null,
  'a rejected viewer can no longer resolve approved data'
);

select * from finish();
rollback;
