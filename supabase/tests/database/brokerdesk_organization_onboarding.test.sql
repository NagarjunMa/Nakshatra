begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(43);

select has_table('app_private', 'organization_business_profiles', 'business details are private');
select has_table('app_private', 'organization_onboarding_states', 'onboarding state is private');
select has_table('app_private', 'organization_verification_checks', 'verification checks are private');
select has_table('app_private', 'organization_verification_documents', 'document metadata is private');
select has_table('app_private', 'brokerdesk_command_idempotency', 'command replay state is private');
select has_table('app_private', 'brokerdesk_audit_events', 'audit history is private');
select has_function('public', 'resolve_brokerdesk_bootstrap', array[]::text[], 'bootstrap resolver exists');
select has_function('public', 'create_brokerdesk_workspace', array['jsonb','text'], 'workspace command exists');
select has_function('public', 'resolve_brokerdesk_onboarding', array['text'], 'onboarding resolver exists');
select has_function('public', 'save_brokerdesk_onboarding_profile', array['text','jsonb','bigint','boolean','text'], 'save command exists');
select ok(not has_table_privilege('authenticated', 'app_private.organization_business_profiles', 'SELECT'), 'business details have no direct browser reads');
select ok(not has_table_privilege('authenticated', 'app_private.organization_verification_documents', 'SELECT'), 'document metadata has no direct browser reads');
select ok(not has_table_privilege('authenticated', 'app_private.organization_verification_documents', 'INSERT'), 'no browser document upload path exists');
select ok(not has_function_privilege('anon', 'public.create_brokerdesk_workspace(jsonb,text)', 'EXECUTE'), 'anonymous callers cannot create workspaces');
select ok(not has_table_privilege('authenticated', 'public.matchmaker_profiles', 'UPDATE'), 'business verification cannot be self-assigned directly');
select ok(not has_table_privilege('authenticated', 'public.matchmaker_profiles', 'INSERT'), 'matchmaker profiles are created only by commands');

select pg_temp.create_auth_actor('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'owner-a@onboarding.test');
select pg_temp.create_auth_actor('a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'owner-b@onboarding.test');

create temporary table onboarding_results (result jsonb);
grant select, insert, delete on onboarding_results to authenticated;

set local role authenticated;
select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');

select throws_ok(
  $$select public.create_organization_with_owner('matchmaker_agency', 'Bypass Agency', 'bypass-agency')$$,
  '22023', 'matchmaker agencies must use BrokerDesk onboarding',
  'the legacy organization command cannot bypass agency onboarding'
);

select is(public.resolve_brokerdesk_bootstrap()->>'nextAction', 'create_workspace', 'a new broker is directed to create a workspace');

insert into onboarding_results
select public.create_brokerdesk_workspace(
  '{
    "legalName":"Trusted Matches Private Limited",
    "tradingName":"Trusted Matches",
    "businessType":"private_limited",
    "registrationNumber":"REG-100",
    "registrationCountry":"in",
    "primaryCity":"Bengaluru",
    "primaryRegion":"Karnataka",
    "primaryCountry":"in"
  }'::jsonb,
  'signup:broker:0001'
);

select ok(
  (result->>'workspaceRef') ~ '^wrk_[0-9a-f]{32}$',
  'workspace creation returns an opaque reference'
) from onboarding_results;
select is(result->>'workspaceStatus', 'onboarding', 'the workspace stays private during onboarding') from onboarding_results;
select is(result->>'nextStage', 'representative', 'business details advance to representative details') from onboarding_results;
select is((result->>'version')::integer, 1, 'new onboarding starts at version one') from onboarding_results;
select is(jsonb_array_length(result->'verificationChecks'), 3, 'the exact verification checklist is created') from onboarding_results;
select is(
  (select count(*)::integer from jsonb_array_elements((select result->'verificationChecks' from onboarding_results)) as checks(item) where checks.item->>'status' = 'required'),
  3,
  'all verification checks begin as Required'
);

reset role;
select is((select type::text from public.organizations where workspace_ref = (select result->>'workspaceRef' from onboarding_results)), 'matchmaker_agency', 'organization type is server assigned');
select is((select status from public.organizations where workspace_ref = (select result->>'workspaceRef' from onboarding_results)), 'onboarding', 'organization activation is withheld');
select is(
  (select feature_value from public.entitlements where organization_id = (
    select id from public.organizations where workspace_ref = (select result->>'workspaceRef' from onboarding_results)
  ) and feature_key = 'brokerdesk.enabled' order by created_at desc, id desc limit 1),
  'false'::jsonb,
  'BrokerDesk entitlement is explicitly disabled'
);

set local role authenticated;
select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');
select is(
  public.resolve_brokerdesk_access((select result->>'workspaceRef' from onboarding_results)),
  '{"enabled":false}'::jsonb,
  'normal BrokerDesk access stays disabled during onboarding'
);
update public.organizations set status = 'active'
where workspace_ref = (select result->>'workspaceRef' from onboarding_results);
reset role;
select is(
  (select status from public.organizations where workspace_ref = (select result->>'workspaceRef' from onboarding_results)),
  'onboarding',
  'legacy RLS cannot directly activate a BrokerDesk workspace'
);
set local role authenticated;
select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');
delete from public.organizations
where workspace_ref = (select result->>'workspaceRef' from onboarding_results);
reset role;
select is(
  (select count(*)::integer from public.organizations where workspace_ref = (select result->>'workspaceRef' from onboarding_results)),
  1,
  'legacy RLS cannot directly delete an onboarding workspace'
);
set local role authenticated;
select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');
select is(
  public.create_brokerdesk_workspace(
    '{
      "legalName":"Trusted Matches Private Limited",
      "tradingName":"Trusted Matches",
      "businessType":"private_limited",
      "registrationNumber":"REG-100",
      "registrationCountry":"in",
      "primaryCity":"Bengaluru",
      "primaryRegion":"Karnataka",
      "primaryCountry":"in"
    }'::jsonb,
    'signup:broker:0001'
  ),
  (select result from onboarding_results),
  'an identical idempotent replay returns the original safe result'
);

reset role;
select is(
  (select count(*)::integer from public.organizations where created_by = 'a1000000-0000-4000-8000-000000000001' and type = 'matchmaker_agency'),
  1,
  'idempotent replay cannot duplicate a workspace'
);

set local role authenticated;
select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.create_brokerdesk_workspace(
    '{"legalName":"Unsafe","businessType":"other","primaryCity":"Pune","primaryCountry":"IN","rolePreset":"owner"}'::jsonb,
    'signup:broker:0002'
  )$$,
  '22023', 'unsupported profile field: rolePreset',
  'client-controlled authority fields are rejected'
);

select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002');
select is(
  public.resolve_brokerdesk_onboarding((select result->>'workspaceRef' from onboarding_results)),
  '{"available":false}'::jsonb,
  'another broker receives the uniform unavailable response'
);
select is(public.resolve_brokerdesk_bootstrap()->>'nextAction', 'create_workspace', 'another broker cannot discover the workspace in bootstrap');

select pg_temp.set_authenticated_claims('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');
delete from onboarding_results;
insert into onboarding_results
select public.save_brokerdesk_onboarding_profile(
  (select workspace_ref from public.organizations where created_by = 'a1000000-0000-4000-8000-000000000001' and type = 'matchmaker_agency'),
  '{
    "representativeFullName":"Anita Rao",
    "representativePosition":"Director",
    "representativeWorkEmail":"anita@trusted.example",
    "authorityContext":"I am a director authorized to represent this business.",
    "serviceRegions":["Bengaluru","Mysuru"],
    "operatingSinceYear":2014,
    "website":"https://trusted.example",
    "authorityDeclared":true,
    "termsAccepted":true
  }'::jsonb,
  1,
  true,
  'submit:broker:0001'
);

select is(result->>'onboardingStatus', 'ready_for_verification', 'complete details can be submitted for verification') from onboarding_results;
select is(result->>'nextStage', 'verification', 'submission advances to verification') from onboarding_results;
select is((result->>'version')::integer, 2, 'submission advances the optimistic version') from onboarding_results;
select throws_ok(
  format(
    'select public.save_brokerdesk_onboarding_profile(%L, %L::jsonb, 1, false, %L)',
    (select result->>'workspaceRef' from onboarding_results),
    '{"representativePosition":"Owner"}',
    'stale:broker:0001'
  ),
  '40001', 'onboarding version conflict',
  'stale writes fail instead of overwriting newer information'
);
select is(
  public.resolve_brokerdesk_access((select result->>'workspaceRef' from onboarding_results)),
  '{"enabled":false}'::jsonb,
  'submission does not self-approve or enable BrokerDesk'
);

reset role;
select is(
  (select count(*)::integer from app_private.brokerdesk_audit_events where actor_user_id = 'a1000000-0000-4000-8000-000000000001'),
  2,
  'workspace creation and onboarding submission are audited'
);
select throws_ok(
  $$update app_private.brokerdesk_audit_events set outcome = 'failed' where actor_user_id = 'a1000000-0000-4000-8000-000000000001'$$,
  '55000', 'BrokerDesk audit events are append-only',
  'audit history cannot be rewritten'
);

reset role;
delete from auth.sessions where id = 'a2000000-0000-4000-8000-000000000001';
set local role authenticated;
-- db:smoke: allow-invalid-auth-claims
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"a2000000-0000-4000-8000-000000000001"}';
select throws_ok(
  $$select public.resolve_brokerdesk_bootstrap()$$,
  '42501', 'authentication session is no longer active',
  'a revoked session cannot resume onboarding'
);

select * from finish();
rollback;
