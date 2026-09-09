begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(18);

select pg_temp.create_auth_actor('81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'customer-a@brokerdesk.test');
select pg_temp.create_auth_actor('81000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002', 'customer-b@brokerdesk.test');
select pg_temp.create_auth_actor('81000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000003', 'broker-a@brokerdesk.test');
select pg_temp.create_auth_actor('81000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000004', 'broker-b@brokerdesk.test');
select pg_temp.create_auth_actor('81000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000005', 'suspended-a@brokerdesk.test');

insert into public.organizations (id, type, name, slug, created_by)
values
  ('83000000-0000-4000-8000-000000000001', 'matchmaker_agency', 'Broker A Agency', 'brokerdesk-agency-a', '81000000-0000-4000-8000-000000000003'),
  ('83000000-0000-4000-8000-000000000002', 'matchmaker_agency', 'Broker B Agency', 'brokerdesk-agency-b', '81000000-0000-4000-8000-000000000004');

insert into public.organization_members (organization_id, user_id, role, status)
values
  ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000003', 'owner', 'active'),
  ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000005', 'viewer', 'suspended'),
  ('83000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000004', 'owner', 'active');

insert into public.entitlements (organization_id, feature_key, feature_value, source)
values
  ('83000000-0000-4000-8000-000000000001', 'brokerdesk.enabled', 'true'::jsonb, 'test'),
  ('83000000-0000-4000-8000-000000000002', 'brokerdesk.enabled', 'true'::jsonb, 'test');

-- These legacy attribution fields deliberately point at agencies and creators.
-- Neither field is allowed to confer ownership after the safety migration.
insert into public.candidates (
  id, primary_owner_user_id, current_organization_id, display_name, created_by
) values
  (
    '84000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    'Customer A Candidate',
    '81000000-0000-4000-8000-000000000003'
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    '83000000-0000-4000-8000-000000000002',
    'Customer B Candidate',
    '81000000-0000-4000-8000-000000000004'
  );

insert into public.broker_clients (organization_id, candidate_id, introduced_by)
values
  ('83000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000003'),
  ('83000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003'),
  ('83000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004'),
  ('83000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000004');

insert into public.portfolios (
  id, user_id, candidate_id, owner_organization_id, draft_data, is_published
) values
  (
    '85000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    '84000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '{"personal":{"name":"Customer A"}}',
    false
  ),
  (
    '85000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    '84000000-0000-4000-8000-000000000002',
    '83000000-0000-4000-8000-000000000002',
    '{"personal":{"name":"Customer B"}}',
    false
  );

set local role authenticated;
set local request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"82000000-0000-4000-8000-000000000001"}';

select ok(public.owns_candidate('84000000-0000-4000-8000-000000000001'), 'Customer A owns their candidate');
select ok(not public.owns_candidate('84000000-0000-4000-8000-000000000002'), 'Customer A does not own Customer B candidate');
select ok(public.can_manage_portfolio('85000000-0000-4000-8000-000000000001'), 'Customer A manages their portfolio');
select ok(not public.can_manage_portfolio('85000000-0000-4000-8000-000000000002'), 'Customer A cannot manage Customer B portfolio');
select is((select count(*)::integer from public.candidates), 1, 'Customer A reads only their candidate row');
select is((select count(*)::integer from public.portfolios), 1, 'Customer A reads only their portfolio row');

set local request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"82000000-0000-4000-8000-000000000003"}';

select ok(not public.owns_candidate('84000000-0000-4000-8000-000000000001'), 'Broker A does not own a candidate they created');
select ok(not public.owns_candidate('84000000-0000-4000-8000-000000000002'), 'Broker A does not own another agency customer candidate');
select ok(not public.can_manage_portfolio('85000000-0000-4000-8000-000000000001'), 'Broker A cannot manage a portfolio attributed to their organization');
select is((select count(*)::integer from public.candidates), 0, 'Broker A has no direct candidate-table projection');
select is((select count(*)::integer from public.portfolios), 0, 'Broker A has no direct portfolio-table projection');
select is((select count(*)::integer from public.broker_clients), 2, 'Broker A reads only its two agency relationships');
select lives_ok(
  $$update public.candidates set display_name = 'Broker A mutation' where id = '84000000-0000-4000-8000-000000000001'$$,
  'Broker A update is filtered without revealing the candidate row'
);

set local request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"82000000-0000-4000-8000-000000000004"}';

select is((select count(*)::integer from public.candidates), 0, 'Broker B has no direct candidate-table projection');
select is((select count(*)::integer from public.broker_clients), 2, 'Broker B reads only its two agency relationships');

set local request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000005","role":"authenticated","session_id":"82000000-0000-4000-8000-000000000005"}';

select ok(not public.is_organization_member('83000000-0000-4000-8000-000000000001'), 'a suspended employee is not an active organization member');
select is((select count(*)::integer from public.broker_clients), 0, 'a suspended employee cannot read agency relationships');

reset role;
select is(
  (select display_name from public.candidates where id = '84000000-0000-4000-8000-000000000001'),
  'Customer A Candidate',
  'the broker update did not mutate Customer A candidate'
);

select * from finish();
rollback;
