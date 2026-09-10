begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(39);

select has_column('app_private','identity_verification_subjects','id','verification subjects have a domain-neutral primary key');
select has_column('app_private','identity_verification_subjects','subject_type','verification subjects identify their source domain');
select has_column('app_private','identity_verification_subjects','organization_id','representative subjects bind to one organization');
select has_column('app_private','identity_verification_subjects','subject_user_id','representative subjects bind to one authenticated user');
select has_column('app_private','identity_verification_subjects','expected_birth_date_hash','representative matching stores a keyed digest');
select ok(
  not exists(select 1 from information_schema.columns where table_schema='app_private'
    and table_name='identity_verification_subjects' and column_name='expected_birth_date'),
  'the representative subject has no raw birth-date column'
);
select has_function(
  'public','begin_brokerdesk_representative_verification',array['text','text','text','text'],
  'the representative start command exists'
);
select ok(
  has_function_privilege('authenticated','public.begin_brokerdesk_representative_verification(text,text,text,text)','execute'),
  'authenticated server requests may invoke the guarded start command'
);
select ok(
  not has_function_privilege('anon','public.begin_brokerdesk_representative_verification(text,text,text,text)','execute'),
  'anonymous callers cannot start representative verification'
);
select ok(
  not has_table_privilege('authenticated','app_private.identity_verification_subjects','select'),
  'browser sessions cannot read private identity subjects'
);

select pg_temp.create_auth_actor(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'representative-a@nakshatra.test'
);
select pg_temp.create_auth_actor(
  'c1000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002',
  'representative-b@nakshatra.test'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001'
);
create temporary table representative_workspace as
select created.result->>'workspaceRef' as workspace_ref
from (
  select public.create_brokerdesk_workspace(
    '{"legalName":"Representative Test Matchmakers","businessType":"partnership","primaryCity":"Pune","primaryCountry":"IN"}'::jsonb,
    'representative:workspace:0001'
  ) as result
) created;
create temporary table candidate_count_before as select count(*)::integer as total from public.candidates;
select public.save_brokerdesk_onboarding_profile(
  (select workspace_ref from representative_workspace),
  '{"representativeFullName":"Anita Rao","representativePosition":"Owner","representativeWorkEmail":"anita@representative.test","authorityContext":"I own and represent this matchmaking business.","serviceRegions":["Pune"],"operatingSinceYear":2014,"authorityDeclared":true,"termsAccepted":true}'::jsonb,
  1,true,'representative:submit:0001'
);
select is(
  public.resolve_brokerdesk_onboarding((select workspace_ref from representative_workspace))->>'onboardingStatus',
  'ready_for_verification',
  'completed onboarding is ready for a real identity check'
);

select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002',
  'aal2'
);
select throws_ok(
  format(
    'select * from public.begin_brokerdesk_representative_verification(%L,%L,%L,%L)',
    (select workspace_ref from representative_workspace),repeat('d',64),repeat('c',64),repeat('a',64)
  ),
  '42501','workspace unavailable',
  'another broker cannot discover or verify the representative for this workspace'
);

reset role;
select pg_temp.create_auth_session(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000003',
  pg_catalog.now()+interval '1 second'
);
insert into app_private.brokerdesk_action_reauth_challenges(
  organization_id,user_id,purpose,initiating_session_id,created_at,expires_at,
  verified_session_id,verified_at,verified_aal,proof_hash,proof_expires_at
)
select organization_record.id,'c1000000-0000-4000-8000-000000000001','verification_manage',
  'c2000000-0000-4000-8000-000000000001',pg_catalog.now()-interval '10 seconds',
  pg_catalog.now()+interval '10 minutes','c2000000-0000-4000-8000-000000000003',
  pg_catalog.now(),'aal2',repeat('a',64),pg_catalog.now()+interval '10 minutes'
from public.organizations organization_record
where organization_record.workspace_ref=(select workspace_ref from representative_workspace);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000003',
  'aal2'
);
create temporary table representative_start as
select * from public.begin_brokerdesk_representative_verification(
  (select workspace_ref from representative_workspace),repeat('d',64),repeat('c',64),repeat('a',64)
);
select ok((select attempt_id is not null from representative_start),'the guarded command prepares one normalized attempt');
select is(
  (select count(*)::integer from public.candidates),
  (select total from candidate_count_before),
  'representative verification does not create a synthetic customer candidate'
);

reset role;
select ok(
  (select subject_type='organization_representative' and candidate_id is null
      and organization_id is not null and subject_user_id='c1000000-0000-4000-8000-000000000001'
      and expected_birth_date_hash=repeat('d',64)
    from app_private.identity_verification_subjects where provider_subject_ref=(select provider_subject_ref from representative_start)),
  'the subject is bound to the organization and representative, with only the keyed date digest'
);
select ok(
  (select candidate_id is null and subject_id is not null
    from app_private.identity_verification_attempts where id=(select attempt_id from representative_start)),
  'the shared attempt is subject-backed and candidate-free'
);
select ok(
  (select candidate_id is null and subject_id is not null
    from app_private.identity_verification_management_tokens where token_hash=repeat('c',64)),
  'the shared consent-management token is subject-backed and candidate-free'
);
select throws_ok(
  format('update app_private.identity_verification_attempts set candidate_id=%L::uuid where id=%L::uuid',
    'c3000000-0000-4000-8000-000000000001',(select attempt_id from representative_start)),
  '23514','identity verification subject binding is invalid',
  'an attempt cannot be rebound to a candidate outside its representative subject'
);
select throws_ok(
  $$update app_private.identity_verification_management_tokens
    set candidate_id='c3000000-0000-4000-8000-000000000001'
    where token_hash=repeat('c',64)$$,
  '23514','identity verification subject binding is invalid',
  'a management token cannot be rebound to a candidate outside its representative subject'
);
select ok(
  (select consumed_at is not null from app_private.brokerdesk_action_reauth_challenges where proof_hash=repeat('a',64)),
  'the exact AAL2 action proof is consumed once in the start transaction'
);
select ok(
  not exists(
    select 1 from app_private.brokerdesk_audit_events
    where event_name='representative.identity_verification_prepared'
      and safe_details::text like '%1985-05-12%'
  ),
  'audit details contain no raw representative birth date'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000003',
  'aal2'
);
select throws_ok(
  format(
    'select * from public.begin_brokerdesk_representative_verification(%L,%L,%L,%L)',
    (select workspace_ref from representative_workspace),repeat('d',64),repeat('e',64),repeat('a',64)
  ),
  '42501','fresh verification proof required',
  'a consumed proof cannot start or replay another representative session'
);
select lives_ok(
  format(
    'select public.attach_identity_verification_provider_session(%L::uuid,%L,%L)',
    (select attempt_id from representative_start),'c4000000-0000-4000-8000-000000000001',repeat('c',64)
  ),
  'the representative attempt reuses the existing provider-session attachment'
);

reset role;
select is(
  (select status::text from app_private.organization_verification_checks verification
    join public.organizations organization_record on organization_record.id=verification.organization_id
    where organization_record.workspace_ref=(select workspace_ref from representative_workspace)
      and verification.verification_type='representative_identity'),
  'under_review',
  'provider attachment advances only the representative check to under review'
);
select throws_ok(
  $$update app_private.identity_verification_worker_state
    set candidate_id='c3000000-0000-4000-8000-000000000001'
    where attempt_id=(select attempt_id from representative_start) and task_type='reconcile'$$,
  '23514','identity verification worker binding is invalid',
  'a worker lease cannot be rebound outside its representative subject'
);
update app_private.identity_verification_worker_state set run_after=pg_catalog.now()-interval '1 second'
where attempt_id=(select attempt_id from representative_start) and task_type='reconcile';
-- db:smoke: allow-invalid-auth-claims
set local request.jwt.claims='{"role":"service_role"}';
set local role service_role;
create temporary table representative_claim as select * from public.claim_identity_verification_work(1);
select is((select subject_type from representative_claim),'organization_representative','the shared worker identifies the representative subject type');
select is((select birth_date from representative_claim),null::date,'the shared worker receives no raw representative birth date');
select is((select birth_date_hash from representative_claim),repeat('d',64),'the shared worker receives only the keyed comparison value');
select is((select legal_name from representative_claim),'Anita Rao','the worker uses the submitted representative name without creating a candidate');
select ok(
  public.complete_identity_verification_reconciliation(
    (select attempt_id from representative_claim),(select claim_token from representative_claim),
    'verified',true,true,true,true,true
  ),
  'the existing reconciliation command completes the representative decision'
);

reset role;
select is(
  (select status from app_private.identity_verification_subjects where provider_subject_ref=(select provider_subject_ref from representative_start)),
  'verified',
  'the normalized representative subject holds the verified result'
);
select is(
  (select expected_birth_date_hash from app_private.identity_verification_subjects
    where provider_subject_ref=(select provider_subject_ref from representative_start)),
  null::text,
  'the keyed birth-date comparison is erased after the verification decision'
);
select is(
  (select status::text from app_private.organization_verification_checks verification
    join public.organizations organization_record on organization_record.id=verification.organization_id
    where organization_record.workspace_ref=(select workspace_ref from representative_workspace)
      and verification.verification_type='representative_identity'),
  'verified',
  'the verified result updates only the representative organization check'
);
select is(
  (select status from public.organizations where workspace_ref=(select workspace_ref from representative_workspace)),
  'onboarding',
  'representative verification alone cannot activate the business workspace'
);
select is(
  (select feature_value from public.entitlements entitlement
    join public.organizations organization_record on organization_record.id=entitlement.organization_id
    where organization_record.workspace_ref=(select workspace_ref from representative_workspace)
      and entitlement.feature_key='brokerdesk.enabled' order by entitlement.created_at desc,entitlement.id desc limit 1),
  'false'::jsonb,
  'representative verification alone cannot enable BrokerDesk'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000003',
  'aal2'
);
select is(
  public.get_identity_verification_link_status(repeat('c',64))->>'canRetry',
  'false',
  'representative retry requires a fresh security check and a newly entered date'
);
select ok(
  not(public.get_identity_verification_link_status(repeat('c',64)) ?| array['candidateId','organizationId','subjectUserId']),
  'the private management link reveals no customer, organization, or representative identifier'
);

reset role;
update app_private.organization_business_profiles
set representative_full_name='Anita Rao Updated'
where organization_id=(select id from public.organizations
  where workspace_ref=(select workspace_ref from representative_workspace));
select ok(
  (select status='revoked' and revocation_reason='representative name changed'
    from app_private.identity_verification_subjects
    where provider_subject_ref=(select provider_subject_ref from representative_start)),
  'changing the representative name invalidates the previous identity result'
);
select is(
  (select status::text from app_private.organization_verification_checks verification
    join public.organizations organization_record on organization_record.id=verification.organization_id
    where organization_record.workspace_ref=(select workspace_ref from representative_workspace)
      and verification.verification_type='representative_identity'),
  'required',
  'the updated representative must complete identity verification again'
);
select ok(
  (select revoked_at is not null from app_private.identity_verification_management_tokens
    where token_hash=repeat('c',64)),
  'a management credential for the prior representative identity is revoked'
);
select ok(
  (select feature_value='false'::jsonb and source='representative_identity_invalidated'
    from public.entitlements entitlement
    join public.organizations organization_record on organization_record.id=entitlement.organization_id
    where organization_record.workspace_ref=(select workspace_ref from representative_workspace)
      and entitlement.feature_key='brokerdesk.enabled'
    order by entitlement.created_at desc,entitlement.id desc limit 1),
  'a representative identity change fails BrokerDesk access closed'
);

select * from finish();
rollback;
