begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql
select plan(31);

select has_table('app_private','broker_client_intakes','customer invitation intake stays private');
select has_function('public','create_brokerdesk_customer_invitation',array['text','text','text','text','text'],'customer invitation command exists');
select has_function('public','claim_brokerdesk_customer_invitation',array['text'],'customer claim command exists');
select has_function('public','resolve_brokerdesk_customers',array['text'],'broker customer projection exists');
select has_function('public','resolve_customer_broker_relationships',array[]::text[],'customer broker projection exists');
select ok(not has_table_privilege('authenticated','app_private.broker_client_intakes','select'),'intake hashes are unavailable through the Data API');
select ok(not has_table_privilege('authenticated','public.broker_clients','select'),'internal relationship identifiers are unavailable through the Data API');

select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','owner-a@customer-intake.test');
select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','customer@customer-intake.test');
select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000003','wrong@customer-intake.test');
select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000004','owner-b@customer-intake.test');

insert into public.organizations (id,type,name,slug,status,created_by)
values
  ('d3000000-0000-4000-8000-000000000001','matchmaker_agency','Agency A','customer-intake-a','active','d1000000-0000-4000-8000-000000000001'),
  ('d3000000-0000-4000-8000-000000000002','matchmaker_agency','Agency B','customer-intake-b','active','d1000000-0000-4000-8000-000000000004');
insert into public.organization_members (organization_id,user_id,role,status)
values
  ('d3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','owner','active'),
  ('d3000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000004','owner','active');
insert into public.entitlements (organization_id,feature_key,feature_value,source)
values
  ('d3000000-0000-4000-8000-000000000001','brokerdesk.enabled','true'::jsonb,'test'),
  ('d3000000-0000-4000-8000-000000000002','brokerdesk.enabled','true'::jsonb,'test');
insert into public.portfolios (id,user_id,draft_data,is_published)
values ('d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','{"personal":{"name":""}}',false);

create temporary table intake_refs as
select
  (select workspace_ref from public.organizations where id='d3000000-0000-4000-8000-000000000001') workspace_a,
  (select workspace_ref from public.organizations where id='d3000000-0000-4000-8000-000000000002') workspace_b;
grant select on intake_refs to authenticated;

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001');
create temporary table created_a as select public.create_brokerdesk_customer_invitation(
  (select workspace_a from intake_refs),
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('customer@customer-intake.test','UTF8'),'sha256'),'hex'),
  'cu***@customer-intake.test',repeat('a',64),'customer-invite:a:0001'
) result;
select ok((select result->>'invitationRef' from created_a) ~ '^inv_[0-9a-f]{32}$','creation returns an opaque invitation reference');
select is((select result->>'emailHint' from created_a),'cu***@customer-intake.test','creation returns only the masked audience hint');
select is(
  public.create_brokerdesk_customer_invitation(
    (select workspace_a from intake_refs),
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to('customer@customer-intake.test','UTF8'),'sha256'),'hex'),
    'cu***@customer-intake.test',repeat('a',64),'customer-invite:a:0001'
  ),
  (select result from created_a),
  'an identical network retry is idempotent'
);
select throws_ok(format(
  'select public.create_brokerdesk_customer_invitation(%L,%L,%L,%L,%L)',
  (select workspace_a from intake_refs),repeat('1',64),'ot***@customer-intake.test',repeat('b',64),'customer-invite:a:0001'
),'22023','idempotency key was already used for a different request','changed input cannot reuse an idempotency key');

reset role;
select is((select email_hash from app_private.broker_client_intakes where organization_id='d3000000-0000-4000-8000-000000000001'),pg_catalog.encode(extensions.digest(pg_catalog.convert_to('customer@customer-intake.test','UTF8'),'sha256'),'hex'),'only a deterministic audience hash is retained');
select is((select token_hash from app_private.broker_client_intakes where organization_id='d3000000-0000-4000-8000-000000000001'),repeat('a',64),'only the invitation token hash is retained');
select is((select count(*)::integer from public.candidates),0,'inviting never creates a candidate or portfolio identity');

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000003');
select is(public.claim_brokerdesk_customer_invitation(repeat('a',64)),'{"available": false}'::jsonb,'the wrong verified account receives a neutral result');
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002');
create temporary table claimed_a as select public.claim_brokerdesk_customer_invitation(repeat('a',64)) result;
select is((select result->>'status' from claimed_a),'portfolio_required','claim waits for the customer canonical portfolio identity');

reset role;
select ok((select claimed_at is not null and consented_at is not null and token_hash is null from app_private.broker_client_intakes where organization_id='d3000000-0000-4000-8000-000000000001'),'claim records consent and erases the reusable credential');
select is((select count(*)::integer from public.broker_clients),0,'a claimed intake without a candidate is not a relationship');

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001');
select is(public.resolve_brokerdesk_customers((select workspace_a from intake_refs))->'customers'->0->>'invitationStatus','portfolio_required','the broker sees only an action-safe waiting state');
select throws_ok($$select count(*) from public.broker_clients$$,'42501','permission denied for table broker_clients','the broker cannot bypass the safe projection');

reset role;
insert into public.candidates (id,primary_owner_user_id,display_name,gender,created_by)
values ('d5000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','Customer One','female','d1000000-0000-4000-8000-000000000002');
set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002');
update public.portfolios set candidate_id='d5000000-0000-4000-8000-000000000001'
where id='d4000000-0000-4000-8000-000000000001';

reset role;
select is((select count(*)::integer from public.broker_clients),1,'portfolio completion activates exactly one agency relationship');
select is((select relationship_source from public.broker_clients),'customer_invitation','the relationship retains its consented source lineage');
select is((select count(*)::integer from app_private.broker_client_mandates where revoked_at is null),1,'activation creates one current customer mandate');
select ok((select evidence_reference ~ '^inv_[0-9a-f]{32}:broker-representation-v1$' from app_private.broker_client_mandates where revoked_at is null),'mandate evidence binds the opaque invitation to the displayed consent version');

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001');
select is(public.resolve_brokerdesk_customers((select workspace_a from intake_refs))->'customers'->0->>'displayName','Customer One','the broker receives the minimal consented customer projection');
select ok(not (public.resolve_brokerdesk_customers((select workspace_a from intake_refs))->'customers'->0 ? 'candidateId'),'the broker projection never exposes the candidate UUID');

select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000004');
select public.create_brokerdesk_customer_invitation(
  (select workspace_b from intake_refs),
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('customer@customer-intake.test','UTF8'),'sha256'),'hex'),
  'cu***@customer-intake.test',repeat('b',64),'customer-invite:b:0001'
);
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002');
select is(public.claim_brokerdesk_customer_invitation(repeat('b',64))->>'status','active','the same canonical portfolio can join a second agency');
select is(pg_catalog.jsonb_array_length(public.resolve_customer_broker_relationships()->'relationships'),2,'only the customer sees both broker relationships together');

select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001');
select is(pg_catalog.jsonb_array_length(public.resolve_brokerdesk_customers((select workspace_a from intake_refs))->'customers'),1,'Broker A sees no trace or count from Broker B');
reset role;
select is((select count(*)::integer from app_private.brokerdesk_audit_events where event_name in ('customer.invitation.created','customer.invitation.claimed','customer.relationship.activated')),6,'both agencies retain their own creation, claim, and activation audit lineage');

select * from finish();
rollback;
