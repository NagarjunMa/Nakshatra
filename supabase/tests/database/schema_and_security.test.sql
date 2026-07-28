begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(32);

select has_schema('app_private', 'private helper schema exists');
select has_table('public', 'portfolios', 'owner portfolios table exists');
select has_table('public', 'portfolio_views', 'portfolio view audit table exists');
select has_table('public', 'public_portfolio_snapshots', 'sanitized public snapshots table exists');
select has_table('public', 'candidates', 'candidate domain table exists');
select has_table('public', 'portfolio_media', 'portfolio media table exists');
select has_table('public', 'reference_countries', 'country reference table exists');
select has_table('public', 'reference_regions', 'region reference table exists');
select has_table('public', 'reference_cities', 'city reference table exists');

select has_function('public', 'update_updated_at', array[]::text[], 'updated-at trigger function exists');
select has_function('public', 'record_view', array['uuid'], 'rate-limited view function exists');
select has_function('public', 'can_manage_portfolio', array['uuid'], 'portfolio authorization function exists');
select has_function('app_private', 'is_current_public_snapshot', array['uuid', 'text'], 'snapshot token helper is private');
select ok(to_regprocedure('public.is_current_public_snapshot(uuid,text)') is null, 'security-definer snapshot helper is not API exposed');

select ok((select relrowsecurity from pg_class where oid = 'public.portfolios'::regclass), 'portfolios has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.portfolio_views'::regclass), 'portfolio views has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.public_portfolio_snapshots'::regclass), 'public snapshots has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.portfolio_media'::regclass), 'portfolio media has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reference_countries'::regclass), 'country references have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reference_regions'::regclass), 'region references have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reference_cities'::regclass), 'city references have RLS enabled');

select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolios' and policyname = 'Users can manage own portfolio'), 'owner portfolio policy exists');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolios' and policyname = 'Public can view published portfolios'), 'unsafe direct public portfolio policy was removed');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'public_portfolio_snapshots' and policyname = 'Public can read active sanitized portfolio snapshots'), 'sanitized snapshot read policy exists');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'public_portfolio_snapshots' and policyname = 'Portfolio managers can manage sanitized portfolio snapshots'), 'snapshot manager policy exists');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload own photos'), 'owner-scoped photo upload policy exists');

select has_trigger('public', 'portfolios', 'portfolios_updated_at', 'portfolio timestamp trigger exists');
select has_trigger('public', 'public_portfolio_snapshots', 'public_portfolio_snapshots_updated_at', 'snapshot timestamp trigger exists');
select has_index('public', 'portfolios', 'idx_portfolios_share_token', 'share token lookup is indexed');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pgtap@example.test', now(), now());
insert into public.portfolios (id, user_id, draft_data)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '{}'::jsonb);

select lives_ok(
  $$select public.record_view('00000000-0000-0000-0000-000000000002'::uuid)$$,
  'view recording accepts a valid portfolio'
);
select is(
  (select count(*)::integer from public.portfolio_views where portfolio_id = '00000000-0000-0000-0000-000000000002'),
  1,
  'view recording inserts one event'
);
select public.record_view('00000000-0000-0000-0000-000000000002'::uuid);
select is(
  (select count(*)::integer from public.portfolio_views where portfolio_id = '00000000-0000-0000-0000-000000000002'),
  1,
  'view recording rate-limits duplicate events within one hour'
);

select * from finish();
rollback;
