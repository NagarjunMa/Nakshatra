begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and policyname = 'Candidate owners can manage candidates'
  ),
  'legacy combined candidate policy is removed'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
  ),
  4,
  'candidates has exactly four operation-specific policies'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      and roles = array['authenticated']::name[]
  ),
  4,
  'every candidate policy targets one authenticated operation'
);

select ok(
  (
    select bool_and(
      has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
      and has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
      and has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
      and has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
    )
    from unnest(array[
      'portfolios',
      'candidates',
      'candidate_personal_details',
      'candidate_astrology_details',
      'candidate_family_members',
      'candidate_education_entries',
      'candidate_career_entries',
      'candidate_lifestyle_details',
      'candidate_partner_preferences',
      'visibility_rules'
    ]) as dashboard_tables(table_name)
  ),
  'authenticated dashboard saves have explicit table privileges'
);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'candidate-owner@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'candidate-outsider@example.test', now(), now());

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000101';

select lives_ok(
  $$
    insert into public.candidates (
      id,
      display_name,
      primary_owner_user_id,
      created_by
    ) values (
      '00000000-0000-0000-0000-000000000103',
      'Candidate Owner',
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000101'
    )
  $$,
  'an authenticated owner can insert their candidate row'
);

select is(
  (
    select count(*)::integer
    from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  ),
  1,
  'the owner can select their candidate row'
);

select lives_ok(
  $$
    update public.candidates
    set display_name = 'Candidate Owner Updated'
    where id = '00000000-0000-0000-0000-000000000103'
  $$,
  'the owner can update their candidate row'
);

select is(
  (
    select display_name
    from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  ),
  'Candidate Owner Updated',
  'the owner update is persisted'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000102';

select is(
  (
    select count(*)::integer
    from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  ),
  0,
  'another user cannot select the owner candidate row'
);

select lives_ok(
  $$
    update public.candidates
    set display_name = 'Unauthorized Update'
    where id = '00000000-0000-0000-0000-000000000103'
  $$,
  'another user update is filtered without leaking the row'
);

select lives_ok(
  $$
    delete from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  $$,
  'another user delete is filtered without leaking the row'
);

select throws_ok(
  $$
    insert into public.candidates (
      id,
      display_name,
      primary_owner_user_id,
      created_by
    ) values (
      '00000000-0000-0000-0000-000000000104',
      'Forged Candidate',
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000101'
    )
  $$,
  '42501',
  null,
  'another user cannot create a candidate row owned by someone else'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000101';

select is(
  (
    select display_name
    from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  ),
  'Candidate Owner Updated',
  'another user cannot update or delete the owner row'
);

select lives_ok(
  $$
    delete from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  $$,
  'the owner can delete their candidate row'
);

select is(
  (
    select count(*)::integer
    from public.candidates
    where id = '00000000-0000-0000-0000-000000000103'
  ),
  0,
  'the owner delete is persisted'
);

set local role anon;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';

select throws_ok(
  $$
    insert into public.candidates (display_name)
    values ('Anonymous Candidate')
  $$,
  '42501',
  null,
  'anonymous users cannot insert candidate rows'
);

select * from finish();
rollback;
