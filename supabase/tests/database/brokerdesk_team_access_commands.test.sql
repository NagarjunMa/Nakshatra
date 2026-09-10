begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql
select plan(23);

select has_function('public','replace_brokerdesk_team_member_access',array['text','text','text','text','text'],'role replacement command exists');
select has_function('public','suspend_brokerdesk_team_member',array['text','text','text','text'],'suspension command exists');
select ok(has_function_privilege('authenticated','public.replace_brokerdesk_team_member_access(text,text,text,text,text)','execute'),'authenticated sessions can call the guarded role command');
select ok(has_function_privilege('authenticated','public.suspend_brokerdesk_team_member(text,text,text,text)','execute'),'authenticated sessions can call the guarded suspension command');

select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','owner@commands.test',pg_catalog.now()-interval '2 minutes');
select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','employee@commands.test',pg_catalog.now()-interval '2 minutes');
select pg_temp.create_auth_actor('d1000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000003','admin@commands.test',pg_catalog.now()-interval '2 minutes');
set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001');
create temporary table command_workspace as select result->>'workspaceRef' workspace_ref from (
  select public.create_brokerdesk_workspace('{"legalName":"Command Matchmakers","businessType":"partnership","primaryCity":"Pune","primaryCountry":"IN"}'::jsonb,'command:workspace:0001') result
) created;
reset role;
insert into public.organization_members(organization_id,user_id,role,status,invited_by)
select id,'d1000000-0000-4000-8000-000000000002','broker_agent','active','d1000000-0000-4000-8000-000000000001'
from public.organizations where workspace_ref=(select workspace_ref from command_workspace);
insert into public.organization_members(organization_id,user_id,role,status,invited_by)
select id,'d1000000-0000-4000-8000-000000000003','admin','active','d1000000-0000-4000-8000-000000000001'
from public.organizations where workspace_ref=(select workspace_ref from command_workspace);
create temporary table command_member as select member_ref from public.organization_members where user_id='d1000000-0000-4000-8000-000000000002';
create temporary table command_owner as select member_ref from public.organization_members where user_id='d1000000-0000-4000-8000-000000000001';
create temporary table command_admin as select member_ref from public.organization_members where user_id='d1000000-0000-4000-8000-000000000003';
grant select on command_member, command_owner, command_admin to authenticated;

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001');
select throws_ok(format('select public.replace_brokerdesk_team_member_access(%L,%L,%L,%L,%L)',
  (select workspace_ref from command_workspace),(select member_ref from command_member),'viewer',repeat('a',64),'command:access:0001'),
  '42501','team access change unavailable','AAL1 cannot execute a privileged role command');
create temporary table access_challenge as select (public.start_brokerdesk_action_reauth(
  (select workspace_ref from command_workspace),'team_access_replace','d2000000-0000-4000-8000-000000000001'
)->>'challengeId')::uuid id;

reset role;
select pg_temp.create_auth_session('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000004',pg_catalog.now()+interval '1 second');
set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000004','aal2');
select throws_ok(format('select public.replace_brokerdesk_team_member_access(%L,%L,%L,%L,%L)',
  (select workspace_ref from command_workspace),(select member_ref from command_owner),'viewer',repeat('a',64),'command:access:self:0001'),
  '42501','team access change unavailable','the owner cannot use generic role replacement on themselves');
select is(public.complete_brokerdesk_action_reauth((select id from access_challenge),repeat('a',64)),'verified','AAL2 verifies the role-change proof');
create temporary table access_result as select public.replace_brokerdesk_team_member_access(
  (select workspace_ref from command_workspace),(select member_ref from command_member),'admin',repeat('a',64),'command:access:0001'
) result;
select is((select result->>'rolePreset' from access_result),'admin','the owner can promote a non-owner to admin');

reset role;
select is((select role::text from public.organization_members where member_ref=(select member_ref from command_member)),'admin','the existing membership source of truth is updated');
select is((select role_preset::text from app_private.organization_member_access access join public.organization_members member on member.id=access.member_id where member.member_ref=(select member_ref from command_member)),'admin','the existing RBAC access preset is synchronized');
select is((select granted_by::text from app_private.organization_member_access access join public.organization_members member on member.id=access.member_id where member.member_ref=(select member_ref from command_member)),'d1000000-0000-4000-8000-000000000001','the changing owner is retained as access grantor');
select is((select count(*)::integer from app_private.brokerdesk_audit_events where event_name='team.member.access_replaced'),1,'role replacement is audited once');

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','aal2');
select throws_ok(format('select public.replace_brokerdesk_team_member_access(%L,%L,%L,%L,%L)',
  (select workspace_ref from command_workspace),(select member_ref from command_admin),'viewer',repeat('c',64),'command:admin-peer:0001'),
  '42501','team access change unavailable','an admin cannot modify another admin');
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000004','aal2');
select is(public.replace_brokerdesk_team_member_access(
  (select workspace_ref from command_workspace),(select member_ref from command_member),'admin',repeat('a',64),'command:access:0001'
),(select result from access_result),'an identical role retry succeeds without replaying its proof');
select throws_ok(format('select public.replace_brokerdesk_team_member_access(%L,%L,%L,%L,%L)',
  (select workspace_ref from command_workspace),(select member_ref from command_member),'viewer',repeat('a',64),'command:access:0001'),
  '22023','idempotency key was already used for a different request','changed role input cannot reuse an idempotency key');
select throws_ok(format('select public.replace_brokerdesk_team_member_access(%L,%L,%L,%L,%L)',
  (select workspace_ref from command_workspace),(select member_ref from command_member),'viewer',repeat('a',64),'command:access:0002'),
  '42501','team access change unavailable','a consumed role proof cannot authorize a second command');

select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002');
create temporary table target_challenge as select (public.start_brokerdesk_action_reauth(
  (select workspace_ref from command_workspace),'team_invite','d2000000-0000-4000-8000-000000000002'
)->>'challengeId')::uuid id;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000004','aal2');
create temporary table suspend_challenge as select (public.start_brokerdesk_action_reauth(
  (select workspace_ref from command_workspace),'team_suspend','d2000000-0000-4000-8000-000000000004'
)->>'challengeId')::uuid id;
reset role;
select pg_temp.create_auth_session('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000005',pg_catalog.now()+interval '2 seconds');
set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000005','aal2');
select is(public.complete_brokerdesk_action_reauth((select id from suspend_challenge),repeat('b',64)),'verified','AAL2 verifies the independently scoped suspension proof');
create temporary table suspend_result as select public.suspend_brokerdesk_team_member(
  (select workspace_ref from command_workspace),(select member_ref from command_member),repeat('b',64),'command:suspend:0001'
) result;
select is((select result->>'status' from suspend_result),'suspended','the suspension command returns only a safe result');

reset role;
select is((select status::text from public.organization_members where member_ref=(select member_ref from command_member)),'suspended','agency access stops immediately at the membership source of truth');
select ok((select invalidated_at is not null from app_private.brokerdesk_action_reauth_challenges where id=(select id from target_challenge)),'pending privileged proofs for the suspended employee are invalidated');
select is((select count(*)::integer from auth.sessions where user_id='d1000000-0000-4000-8000-000000000002'),1,'suspension preserves the shared identity session for B2C and other agencies');
select is((select count(*)::integer from app_private.brokerdesk_audit_events where event_name='team.member.suspended'),1,'suspension is audited once');

set local role authenticated;
select pg_temp.set_authenticated_claims('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000005','aal2');
select is(public.suspend_brokerdesk_team_member(
  (select workspace_ref from command_workspace),(select member_ref from command_member),repeat('b',64),'command:suspend:0001'
),(select result from suspend_result),'an identical suspension retry remains idempotent');

select * from finish();
rollback;
