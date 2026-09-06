begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(4);

select pg_temp.create_auth_actor(
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  'protected-primary@portfolio.test'
);
select pg_temp.create_auth_actor(
  '61000000-0000-4000-8000-000000000002',
  '62000000-0000-4000-8000-000000000002',
  'owner-only-primary@portfolio.test'
);

insert into public.candidates (id, primary_owner_user_id, display_name, created_by)
values
  (
    '64000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    'Protected Primary',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '64000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000002',
    'Owner Only Primary',
    '61000000-0000-4000-8000-000000000002'
  );

update app_private.identity_verification_subjects
set status = 'verified',
    verified_at = now() - interval '1 day',
    expires_at = now() + interval '365 days'
where candidate_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);

insert into public.portfolios (id, user_id, candidate_id, draft_data, is_published)
values
  (
    '63000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    '64000000-0000-4000-8000-000000000001',
    '{"personal":{"name":"Protected Primary"}}',
    false
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000002',
    '64000000-0000-4000-8000-000000000002',
    '{"personal":{"name":"Owner Only Primary"}}',
    false
  );

insert into public.portfolio_media (
  portfolio_id, candidate_id, media_type, storage_path, visibility, sort_order, metadata
) values
  (
    '63000000-0000-4000-8000-000000000001',
    '64000000-0000-4000-8000-000000000001',
    'hero',
    '61000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/hero.webp',
    'interest_required',
    0,
    '{"blurPath":"61000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/hero-blur.webp"}'
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    '64000000-0000-4000-8000-000000000002',
    'hero',
    '61000000-0000-4000-8000-000000000002/63000000-0000-4000-8000-000000000002/hero.webp',
    'owner_only',
    0,
    '{}'::jsonb
  );

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001'
);
select is(
  public.publish_portfolio_transaction(
    '63000000-0000-4000-8000-000000000001',
    '{"personal":{"name":"Protected Primary"}}',
    '{"personal":{"name":"Protected Primary"}}',
    '{"personal":{"name":"Protected Primary"}}',
    'protected_primary_001',
    now() + interval '90 days',
    1,
    '#f7f5ef',
    null
  ) ->> 'status',
  'ok',
  'a protected primary photo satisfies transactional publish readiness'
);
select ok(
  (select is_published from public.portfolios where id = '63000000-0000-4000-8000-000000000001'),
  'the protected-primary portfolio is published'
);

select pg_temp.set_authenticated_claims(
  '61000000-0000-4000-8000-000000000002',
  '62000000-0000-4000-8000-000000000002'
);
select is(
  public.publish_portfolio_transaction(
    '63000000-0000-4000-8000-000000000002',
    '{"personal":{"name":"Owner Only Primary"}}',
    '{"personal":{"name":"Owner Only Primary"}}',
    '{"personal":{"name":"Owner Only Primary"}}',
    'owner_only_primary_01',
    now() + interval '90 days',
    1,
    '#f7f5ef',
    null
  ) ->> 'status',
  'not_ready',
  'an owner-only primary photo cannot satisfy publish readiness'
);
select ok(
  not (select is_published from public.portfolios where id = '63000000-0000-4000-8000-000000000002'),
  'the owner-only portfolio remains unpublished'
);

select * from finish();
rollback;
