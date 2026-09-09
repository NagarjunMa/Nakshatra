begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(21);

select has_table('app_private', 'brokerdesk_action_reauth_challenges', 'BrokerDesk privileged challenges are private');
select has_function(
  'public', 'start_brokerdesk_action_reauth', array['text', 'text', 'uuid'],
  'purpose-bound BrokerDesk reauthentication start RPC exists'
);
select has_function(
  'public', 'complete_brokerdesk_action_reauth', array['uuid', 'text'],
  'BrokerDesk reauthentication completion RPC exists'
);
select ok(
  not has_table_privilege('authenticated', 'app_private.brokerdesk_action_reauth_challenges', 'select'),
  'authenticated callers cannot inspect privileged challenges'
);
select ok(
  not has_function_privilege(
    'authenticated', 'app_private.consume_brokerdesk_action_reauth(uuid,text,text)', 'execute'
  ),
  'proof consumption is unavailable outside a command transaction'
);

select pg_temp.create_auth_actor(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001',
  'brokerdesk-reauth-owner@nakshatra.test',
  pg_catalog.now() - interval '1 minute'
);
select pg_temp.create_auth_actor(
  'b1000000-0000-4000-8000-000000000002',
  'b2000000-0000-4000-8000-000000000002',
  'brokerdesk-reauth-other@nakshatra.test',
  pg_catalog.now() - interval '1 minute'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001'
);

create temporary table brokerdesk_reauth_workspace as
select created.result->>'workspaceRef' as workspace_ref
from (
  select public.create_brokerdesk_workspace(
    '{
      "legalName":"Fresh Auth Matchmakers Private Limited",
      "tradingName":"Fresh Auth Matchmakers",
      "businessType":"private_limited",
      "registrationNumber":"REAUTH-100",
      "registrationCountry":"in",
      "primaryCity":"Bengaluru",
      "primaryRegion":"Karnataka",
      "primaryCountry":"in"
    }'::jsonb,
    'reauth:workspace:0001'
  ) as result
) created;

create temporary table brokerdesk_first_challenge as
select (
  public.start_brokerdesk_action_reauth(
    (select workspace_ref from brokerdesk_reauth_workspace),
    'team_invite',
    'b2000000-0000-4000-8000-000000000001'
  )->>'challengeId'
)::uuid as id;

select ok((select id is not null from brokerdesk_first_challenge), 'an onboarding owner can start an exact team action challenge');
select is(
  public.complete_brokerdesk_action_reauth((select id from brokerdesk_first_challenge), repeat('a', 64)),
  'not_fresh',
  'the initiating session cannot satisfy BrokerDesk fresh authentication'
);
select throws_ok(
  format(
    'select public.start_brokerdesk_action_reauth(%L, %L, %L::uuid)',
    (select workspace_ref from brokerdesk_reauth_workspace),
    'billing_admin',
    'b2000000-0000-4000-8000-000000000001'
  ),
  '42501', 'workspace unavailable',
  'an undeclared action cannot create a challenge'
);

select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000002',
  'b2000000-0000-4000-8000-000000000002'
);
select throws_ok(
  format(
    'select public.start_brokerdesk_action_reauth(%L, %L, %L::uuid)',
    (select workspace_ref from brokerdesk_reauth_workspace),
    'team_invite',
    'b2000000-0000-4000-8000-000000000002'
  ),
  '42501', 'workspace unavailable',
  'another broker cannot discover or start a challenge for the workspace'
);
select is(
  public.complete_brokerdesk_action_reauth((select id from brokerdesk_first_challenge), repeat('a', 64)),
  'invalid',
  'another broker cannot complete the owner challenge'
);

reset role;
select pg_temp.create_auth_session(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000003',
  pg_catalog.now() + interval '1 second'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000003'
);
select is(
  public.complete_brokerdesk_action_reauth((select id from brokerdesk_first_challenge), repeat('a', 64)),
  'verified',
  'a newer same-user live session verifies the exact challenge'
);

reset role;
select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001'
);
select is(
  app_private.consume_brokerdesk_action_reauth(
    (select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)),
    'team_invite',
    repeat('a', 64)
  ),
  'proof_invalid',
  'the initiating session cannot consume the proof'
);

select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000003'
);
select is(
  app_private.consume_brokerdesk_action_reauth(
    (select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)),
    'team_access_replace',
    repeat('a', 64)
  ),
  'proof_invalid',
  'a proof cannot be substituted into another action'
);
select is(
  app_private.consume_brokerdesk_action_reauth(
    (select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)),
    'team_invite',
    repeat('a', 64)
  ),
  'consumed',
  'the fresh session consumes the actor, workspace and action-bound proof once'
);
select is(
  app_private.consume_brokerdesk_action_reauth(
    (select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)),
    'team_invite',
    repeat('a', 64)
  ),
  'proof_invalid',
  'a consumed proof cannot be replayed'
);

set local role authenticated;
create temporary table brokerdesk_second_challenge as
select (
  public.start_brokerdesk_action_reauth(
    (select workspace_ref from brokerdesk_reauth_workspace),
    'verification_manage',
    'b2000000-0000-4000-8000-000000000003'
  )->>'challengeId'
)::uuid as id;

reset role;
select pg_temp.create_auth_session(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000004',
  pg_catalog.now() + interval '2 seconds'
);
select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000004'
);

set local role authenticated;
select is(
  public.complete_brokerdesk_action_reauth((select id from brokerdesk_second_challenge), repeat('b', 64)),
  'verified',
  'a second exact purpose receives its own proof'
);

reset role;
update public.organization_members member_record
set status = 'suspended'
where member_record.user_id = 'b1000000-0000-4000-8000-000000000001'
  and member_record.organization_id = (
    select organization_record.id from public.organizations organization_record
    where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)
  );
select pg_temp.set_authenticated_claims(
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000004'
);
select is(
  app_private.consume_brokerdesk_action_reauth(
    (select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)),
    'verification_manage',
    repeat('b', 64)
  ),
  'not_authorized',
  'membership suspension invalidates authority before proof consumption'
);
select is(
  app_private.consume_brokerdesk_action_reauth(
    (select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from brokerdesk_reauth_workspace)),
    'verification_manage',
    repeat('b', 64)
  ),
  'proof_invalid',
  'an authorization-revoked proof stays invalidated'
);

select is(
  (select count(*)::integer from app_private.brokerdesk_action_reauth_challenges where consumed_at is not null),
  1,
  'only the correctly scoped proof is retained as consumed'
);
select is(
  (select count(*)::integer from app_private.brokerdesk_action_reauth_challenges where invalidated_at is not null),
  1,
  'the authorization-revoked proof is retained as invalidated'
);
select ok(
  has_function_privilege('authenticated', 'public.start_brokerdesk_action_reauth(text,text,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.complete_brokerdesk_action_reauth(uuid,text)', 'execute'),
  'only start and completion are granted; consumption remains command-private'
);

select * from finish();
rollback;
