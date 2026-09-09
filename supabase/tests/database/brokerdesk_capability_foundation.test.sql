begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(40);

select has_table('app_private', 'organization_member_access', 'member access is private');
select has_table('app_private', 'broker_client_assignments', 'customer assignments are private');
select has_table('app_private', 'broker_client_mandates', 'customer mandates are private');
select has_function('public', 'resolve_brokerdesk_access', array['text'], 'minimal access resolver exists');
select has_function(
  'public', 'can_access_brokerdesk_relationship', array['text', 'text', 'text'],
  'combined relationship authorization predicate exists'
);
select ok(not has_table_privilege('authenticated', 'app_private.organization_member_access', 'SELECT'), 'authenticated users cannot read private member grants');
select ok(not has_table_privilege('authenticated', 'app_private.broker_client_assignments', 'SELECT'), 'authenticated users cannot read private assignments');
select ok(not has_table_privilege('authenticated', 'app_private.broker_client_mandates', 'SELECT'), 'authenticated users cannot read private mandates');
select ok(not has_table_privilege('authenticated', 'public.broker_clients', 'UPDATE'), 'relationship mutation is RPC-only until audited commands are delivered');

select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'owner-a@brokerdesk.test');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', 'advisor-a@brokerdesk.test');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000003', 'unassigned-a@brokerdesk.test');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000004', 'owner-b@brokerdesk.test');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000005', '92000000-0000-4000-8000-000000000005', 'suspended-a@brokerdesk.test');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000006', '92000000-0000-4000-8000-000000000006', 'customer-a@brokerdesk.test');
select pg_temp.create_auth_actor('91000000-0000-4000-8000-000000000007', '92000000-0000-4000-8000-000000000007', 'customer-b@brokerdesk.test');

insert into public.organizations (id, type, name, slug, created_by)
values
  ('93000000-0000-4000-8000-000000000001', 'matchmaker_agency', 'Agency A', 'capability-agency-a', '91000000-0000-4000-8000-000000000001'),
  ('93000000-0000-4000-8000-000000000002', 'matchmaker_agency', 'Agency B', 'capability-agency-b', '91000000-0000-4000-8000-000000000004');

insert into public.organization_members (id, organization_id, user_id, role, status)
values
  ('94000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('94000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', 'broker_agent', 'active'),
  ('94000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000003', 'broker_agent', 'active'),
  ('94000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000004', 'owner', 'active'),
  ('94000000-0000-4000-8000-000000000005', '93000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000005', 'viewer', 'suspended');

insert into public.entitlements (id, organization_id, feature_key, feature_value, source, created_at)
values
  ('97000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 'brokerdesk.enabled', 'true'::jsonb, 'test', now() - interval '1 minute'),
  ('97000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000002', 'brokerdesk.enabled', 'true'::jsonb, 'test', now() - interval '1 minute');

insert into public.candidates (id, primary_owner_user_id, display_name, created_by)
values
  ('95000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000006', 'Customer A', '91000000-0000-4000-8000-000000000006'),
  ('95000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000007', 'Customer B', '91000000-0000-4000-8000-000000000007');

insert into public.broker_clients (id, organization_id, candidate_id, introduced_by)
values
  ('96000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('96000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001'),
  ('96000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000004');

insert into app_private.broker_client_assignments (id, organization_id, broker_client_id, member_id, assigned_by)
values (
  '98000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001'
);

insert into app_private.broker_client_mandates (
  id, organization_id, broker_client_id, purpose, permitted_capabilities,
  evidence_reference, customer_approved_by, starts_at, ends_at
) values
  (
    '99000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000001', 'Customer authorized Introduction support',
    array['introductions.send']::app_private.brokerdesk_capability[], 'consent:test:customer-a',
    '91000000-0000-4000-8000-000000000006', now() - interval '1 day', now() + interval '30 days'
  ),
  (
    '99000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000002', 'Expired test mandate',
    array['introductions.send']::app_private.brokerdesk_capability[], 'consent:test:expired',
    '91000000-0000-4000-8000-000000000007', now() - interval '31 days', now() - interval '1 day'
  );

create temporary table brokerdesk_refs as
select
  (select workspace_ref from public.organizations where id = '93000000-0000-4000-8000-000000000001') as workspace_a,
  (select workspace_ref from public.organizations where id = '93000000-0000-4000-8000-000000000002') as workspace_b,
  (select relationship_ref from public.broker_clients where id = '96000000-0000-4000-8000-000000000001') as relationship_a1,
  (select relationship_ref from public.broker_clients where id = '96000000-0000-4000-8000-000000000002') as relationship_a2,
  (select relationship_ref from public.broker_clients where id = '96000000-0000-4000-8000-000000000003') as relationship_b1;

select ok(workspace_a like 'wrk\_%' escape '\', 'workspace references use the dedicated opaque prefix') from brokerdesk_refs;
select ok(relationship_a1 like 'bcr\_%' escape '\', 'relationship references use the dedicated opaque prefix') from brokerdesk_refs;
select isnt(relationship_a1, relationship_b1, 'relationship references are distinct across agencies') from brokerdesk_refs;

set local role authenticated;
select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001');

select is(public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs)) ->> 'enabled', 'true', 'an entitled active owner resolves BrokerDesk access');
select is(public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs)) ->> 'rolePreset', 'owner', 'the resolver returns the safe role preset');
select is(pg_catalog.jsonb_array_length(public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs)) -> 'capabilities'), 15, 'the owner receives the explicit capability inventory');
select is(public.resolve_brokerdesk_access((select workspace_b from brokerdesk_refs)), '{"enabled": false}'::jsonb, 'another agency workspace has the same disabled response');
select is(public.resolve_brokerdesk_access('wrk_00000000000000000000000000000000'), '{"enabled": false}'::jsonb, 'a missing opaque workspace has the same disabled response');
select ok(public.has_brokerdesk_capability((select workspace_a from brokerdesk_refs), 'customers.read', (select relationship_a1 from brokerdesk_refs)), 'organization-scoped owners can read their relationships');
select ok(not public.has_brokerdesk_capability((select workspace_a from brokerdesk_refs), 'unknown.capability', (select relationship_a1 from brokerdesk_refs)), 'unknown capabilities fail closed');
select ok(public.can_access_brokerdesk_relationship((select workspace_a from brokerdesk_refs), (select relationship_a1 from brokerdesk_refs), 'introductions.send'), 'a capability plus a current mandate authorizes the sensitive relationship action');
select ok(not public.can_access_brokerdesk_relationship((select workspace_a from brokerdesk_refs), (select relationship_a2 from brokerdesk_refs), 'introductions.send'), 'an expired mandate fails closed');
select is((select count(*)::integer from public.broker_clients), 2, 'the owner sees only its agency relationships');
select is((select count(*)::integer from public.candidates), 0, 'BrokerDesk access does not expose customer candidate rows');

select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');
select is(public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs)) ->> 'rolePreset', 'advisor', 'the legacy broker-agent role maps to the advisor preset');
select is((select count(*)::integer from public.broker_clients), 1, 'an advisor sees only assigned customers');
select ok(public.has_brokerdesk_capability((select workspace_a from brokerdesk_refs), 'customers.read', (select relationship_a1 from brokerdesk_refs)), 'the advisor has capability within an active assignment');
select ok(not public.has_brokerdesk_capability((select workspace_a from brokerdesk_refs), 'customers.read', (select relationship_a2 from brokerdesk_refs)), 'the advisor cannot use the same capability outside assignment scope');
select ok(public.can_access_brokerdesk_relationship((select workspace_a from brokerdesk_refs), (select relationship_a1 from brokerdesk_refs), 'introductions.send'), 'the assigned advisor can use a customer-mandated action');

select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from public.broker_clients), 0, 'an unassigned advisor sees no relationships');

select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000005', '92000000-0000-4000-8000-000000000005');
select is(public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs)), '{"enabled": false}'::jsonb, 'a suspended member receives the same disabled response');
select is((select count(*)::integer from public.broker_clients), 0, 'a suspended member sees no relationships');

select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000004');
select is(public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs)), '{"enabled": false}'::jsonb, 'Broker B cannot resolve Broker A access');
select is((select count(*)::integer from public.broker_clients), 1, 'Broker B sees only its own relationship');

reset role;
insert into public.entitlements (id, organization_id, feature_key, feature_value, source, created_at)
values ('97000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000002', 'brokerdesk.enabled', 'false'::jsonb, 'test-revocation', now());

set local role authenticated;
select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000004');
select is(public.resolve_brokerdesk_access((select workspace_b from brokerdesk_refs)), '{"enabled": false}'::jsonb, 'the latest false entitlement immediately disables BrokerDesk');
select is((select count(*)::integer from public.broker_clients), 0, 'a disabled entitlement removes relationship reads');

reset role;
update app_private.broker_client_mandates
set revoked_at = now(), revoked_by = '91000000-0000-4000-8000-000000000001'
where id = '99000000-0000-4000-8000-000000000001';

set local role authenticated;
select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');
select ok(public.has_brokerdesk_capability((select workspace_a from brokerdesk_refs), 'introductions.send', (select relationship_a1 from brokerdesk_refs)), 'mandate revocation does not rewrite the separate employee capability');
select ok(not public.can_access_brokerdesk_relationship((select workspace_a from brokerdesk_refs), (select relationship_a1 from brokerdesk_refs), 'introductions.send'), 'mandate revocation immediately blocks the sensitive action');

reset role;
update app_private.broker_client_assignments set revoked_at = now()
where id = '98000000-0000-4000-8000-000000000001';

set local role authenticated;
select pg_temp.set_authenticated_claims('91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.broker_clients), 0, 'assignment revocation immediately removes relationship access');

reset role;
delete from auth.sessions where id = '92000000-0000-4000-8000-000000000001';
set local role authenticated;
-- db:smoke: allow-invalid-auth-claims
set local request.jwt.claims = '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"92000000-0000-4000-8000-000000000001"}';
select throws_ok(
  $$select public.resolve_brokerdesk_access((select workspace_a from brokerdesk_refs))$$,
  '42501', 'authentication session is no longer active',
  'a deleted session cannot resolve BrokerDesk access'
);

reset role;
select ok(not has_function_privilege('anon', 'public.resolve_brokerdesk_access(text)', 'EXECUTE'), 'anonymous callers cannot probe workspace access');

select * from finish();
rollback;
