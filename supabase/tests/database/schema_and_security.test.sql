begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(45);

select has_schema('app_private', 'private helper schema exists');
select has_table('public', 'portfolios', 'owner portfolios table exists');
select has_table('public', 'portfolio_views', 'portfolio view audit table exists');
select has_table('public', 'public_portfolio_snapshots', 'sanitized public snapshots table exists');
select has_table('public', 'candidates', 'candidate domain table exists');
select has_table('public', 'portfolio_media', 'portfolio media table exists');
select has_table('public', 'portfolio_horoscopes', 'private horoscope attachment table exists');
select has_table('public', 'reference_countries', 'country reference table exists');
select has_table('public', 'reference_regions', 'region reference table exists');
select has_table('public', 'reference_cities', 'city reference table exists');

select has_function('public', 'update_updated_at', array[]::text[], 'updated-at trigger function exists');
select has_function('public', 'record_public_portfolio_view', array['text'], 'token-scoped view function exists');
select has_function('public', 'resolve_public_portfolio', array['text'], 'token-scoped portfolio resolver exists');
select has_function('public', 'can_manage_portfolio', array['uuid'], 'portfolio authorization function exists');
select ok(to_regprocedure('app_private.is_current_public_snapshot(uuid,text)') is null, 'obsolete snapshot helper is removed');
select ok(to_regprocedure('public.is_current_public_snapshot(uuid,text)') is null, 'security-definer snapshot helper is not API exposed');

select ok((select relrowsecurity from pg_class where oid = 'public.portfolios'::regclass), 'portfolios has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.portfolio_views'::regclass), 'portfolio views has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.public_portfolio_snapshots'::regclass), 'public snapshots has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.portfolio_media'::regclass), 'portfolio media has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.portfolio_horoscopes'::regclass), 'horoscope attachments have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reference_countries'::regclass), 'country references have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reference_regions'::regclass), 'region references have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reference_cities'::regclass), 'city references have RLS enabled');

select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolios' and policyname = 'Users can manage own portfolio'), 'owner portfolio policy exists');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolios' and policyname = 'Public can view published portfolios'), 'unsafe direct public portfolio policy was removed');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'public_portfolio_snapshots' and roles && array['anon'::name]), 'anonymous users have no direct snapshot policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'public_portfolio_snapshots' and policyname = 'Portfolio managers can manage sanitized portfolio snapshots'), 'snapshot manager policy exists');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload own photos'), 'owner-scoped photo upload policy exists');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolio_media' and roles && array['anon'::name]), 'anonymous users have no direct media descriptor policy');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Active portfolio protected previews are readable'), 'only active generated protected previews are publicly readable');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolio_horoscopes' and policyname = 'Approved viewers can read published horoscope attachments'), 'approved viewers have an identity-bound horoscope policy');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'portfolio_horoscopes' and roles @> array['anon'::name]), 'anonymous users have no horoscope table policy');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Approved viewers can read horoscope files'), 'approved viewers have a private storage policy');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Active portfolio protected previews are readable' and qual like '%public_portfolio_snapshots%'), 'protected previews require an active snapshot');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Active portfolio public photos are readable' and qual like '%privacy_mode%'), 'private portfolios expose only the first public gallery original');

select has_trigger('public', 'portfolios', 'portfolios_updated_at', 'portfolio timestamp trigger exists');
select has_trigger('public', 'public_portfolio_snapshots', 'public_portfolio_snapshots_updated_at', 'snapshot timestamp trigger exists');
select has_trigger('public', 'portfolio_horoscopes', 'portfolio_horoscopes_updated_at', 'horoscope timestamp trigger exists');
select has_index('public', 'portfolios', 'idx_portfolios_share_token', 'share token lookup is indexed');
select has_index('public', 'portfolio_horoscopes', 'idx_portfolio_horoscopes_published', 'published horoscope lookup is indexed');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pgtap@example.test', now(), now());
insert into public.portfolios (id, user_id, draft_data)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '{}'::jsonb);

select ok(has_function_privilege('anon', 'public.record_public_portfolio_view(text)', 'EXECUTE'), 'anonymous role can execute token-scoped view recording');
select ok(not has_table_privilege('anon', 'public.portfolio_views', 'INSERT'), 'anonymous role cannot insert view rows directly');
select ok(not has_table_privilege('anon', 'public.interest_requests', 'INSERT'), 'anonymous role cannot insert interest rows directly');
select ok(not has_table_privilege('authenticated', 'public.reveal_grants', 'INSERT'), 'authenticated callers cannot create grants directly');

select * from finish();
rollback;
