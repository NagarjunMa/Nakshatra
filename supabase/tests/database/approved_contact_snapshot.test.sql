begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(9);

select pg_temp.create_auth_actor(
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002',
  'owner@approved-contact.test'
);

insert into app_private.b2c_creator_entitlements (email_hash)
values (app_private.normalized_email_hash('owner@approved-contact.test'));

insert into public.candidates (id, primary_owner_user_id, display_name, created_by)
values (
  '65000000-0000-4000-8000-000000000003',
  '65000000-0000-4000-8000-000000000001',
  'Approved Contact Owner',
  '65000000-0000-4000-8000-000000000001'
);

update app_private.identity_verification_subjects
set status = 'verified',
    verified_at = now() - interval '1 day',
    expires_at = now() + interval '365 days'
where candidate_id = '65000000-0000-4000-8000-000000000003';

insert into public.portfolios (
  id, user_id, candidate_id, draft_data, is_published
) values (
  '65000000-0000-4000-8000-000000000004',
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000003',
  '{"personal":{"name":"Approved Contact Owner"}}'::jsonb,
  false
);

insert into public.portfolio_media (
  id, portfolio_id, candidate_id, media_type, storage_path, visibility,
  sort_order, metadata
) values (
  '65000000-0000-4000-8000-000000000005',
  '65000000-0000-4000-8000-000000000004',
  '65000000-0000-4000-8000-000000000003',
  'hero',
  '65000000-0000-4000-8000-000000000001/65000000-0000-4000-8000-000000000004/hero.webp',
  'public',
  0,
  '{"blurPath":"65000000-0000-4000-8000-000000000001/65000000-0000-4000-8000-000000000004/hero-blur.webp"}'::jsonb
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);

select is(
  public.publish_portfolio_transaction(
    '65000000-0000-4000-8000-000000000004',
    '{"personal":{"name":"Approved Contact Owner"}}',
    '{"privacy_mode":"balanced","personal":{"name":"Approved Contact Owner"},"visibility":{"contact":"restricted"}}',
    '{"privacy_mode":"balanced","personal":{"name":"Approved Contact Owner"},"contact":{"contact_person":"Father","phone":"+1 555 010 2000","email":"parent@example.test","contacts":[{"relationship":"mother","name":"Parent Two","phone":"+1 555 010 2001"}]}}',
    'approved_contact_0001',
    now() + interval '90 days',
    1,
    '#f7f5ef',
    null
  ) ->> 'status',
  'ok',
  'publication accepts a bounded contact block for approved viewers'
);

reset role;
select is(
  (select data #>> '{contact,phone}' from public.approved_portfolio_snapshots
   where portfolio_id = '65000000-0000-4000-8000-000000000004'),
  '+1 555 010 2000',
  'the approved snapshot stores the primary protected phone'
);
select is(
  (select data #>> '{contact,contacts,0,name}' from public.approved_portfolio_snapshots
   where portfolio_id = '65000000-0000-4000-8000-000000000004'),
  'Parent Two',
  'the approved snapshot stores a bounded additional contact'
);
select ok(
  not ((select data from public.public_portfolio_snapshots
        where portfolio_id = '65000000-0000-4000-8000-000000000004') ? 'contact'),
  'the public snapshot still contains no contact block'
);
select is(
  (select data #>> '{visibility,contact}' from public.public_portfolio_snapshots
   where portfolio_id = '65000000-0000-4000-8000-000000000004'),
  'restricted',
  'the public snapshot may describe contact as restricted'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
select throws_ok(
  $$select public.publish_portfolio_transaction(
    '65000000-0000-4000-8000-000000000004',
    '{"personal":{"name":"Approved Contact Owner"}}',
    '{"privacy_mode":"balanced","personal":{"name":"Approved Contact Owner"}}',
    '{"personal":{"name":"Approved Contact Owner"},"contact":{"phone":"+1 555 010 2000","secure_note":"owner only"}}',
    'approved_contact_0001', now() + interval '90 days', 1, '#f7f5ef', null
  )$$,
  '23514', null,
  'approved contact rejects owner-only secure notes'
);
select throws_ok(
  $$select public.publish_portfolio_transaction(
    '65000000-0000-4000-8000-000000000004',
    '{"personal":{"name":"Approved Contact Owner"}}',
    '{"privacy_mode":"balanced","personal":{"name":"Approved Contact Owner"}}',
    '{"personal":{"name":"Approved Contact Owner"},"family":{"phone":"+1 555 010 2000"}}',
    'approved_contact_0001', now() + interval '90 days', 1, '#f7f5ef', null
  )$$,
  '23514', null,
  'approved snapshots reject contact fields outside the contact block'
);
select throws_ok(
  $$select public.publish_portfolio_transaction(
    '65000000-0000-4000-8000-000000000004',
    '{"personal":{"name":"Approved Contact Owner"}}',
    '{"privacy_mode":"balanced","personal":{"name":"Approved Contact Owner"}}',
    '{"personal":{"name":"Approved Contact Owner"},"contact":{"contacts":[{"name":"Parent","phone":"+1 555 010 2000","secure_note":"owner only"}]}}',
    'approved_contact_0001', now() + interval '90 days', 1, '#f7f5ef', null
  )$$,
  '23514', null,
  'approved contact entries reject unexpected nested fields'
);
select throws_ok(
  $$select public.publish_portfolio_transaction(
    '65000000-0000-4000-8000-000000000004',
    '{"personal":{"name":"Approved Contact Owner"}}',
    '{"privacy_mode":"balanced","personal":{"name":"Approved Contact Owner"}}',
    '{"personal":{"name":"Approved Contact Owner"},"contact":{"contacts":[{},{},{},{},{},{}]}}',
    'approved_contact_0001', now() + interval '90 days', 1, '#f7f5ef', null
  )$$,
  '23514', null,
  'approved contact rejects more than five additional contacts'
);

select * from finish();
rollback;
