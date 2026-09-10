begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql
select plan(26);

select has_table('app_private','brokerdesk_team_invitations','team invitations stay private');
select has_function('public','create_brokerdesk_team_invitation',array['text','text','text','text','text','text','text'],'audited invitation command exists');
select has_function('public','accept_brokerdesk_team_invitation',array['text'],'single-use acceptance command exists');
select ok(not has_table_privilege('authenticated','app_private.brokerdesk_team_invitations','select'),'invitation hashes cannot be read through the Data API');

select pg_temp.create_auth_actor('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','owner@invite.test',pg_catalog.now()-interval '1 minute');
select pg_temp.create_auth_actor('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','employee@invite.test',pg_catalog.now()-interval '1 minute');
select pg_temp.create_auth_actor('c1000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003','wrong@invite.test',pg_catalog.now()-interval '1 minute');
set local role authenticated;
select pg_temp.set_authenticated_claims('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001');

create temporary table invitation_workspace as select result->>'workspaceRef' workspace_ref from (
  select public.create_brokerdesk_workspace('{"legalName":"Invitation Matchmakers","businessType":"partnership","primaryCity":"Pune","primaryCountry":"IN"}'::jsonb,'invite:workspace:0001') result
) created;
create temporary table invitation_challenge as select (public.start_brokerdesk_action_reauth(
  (select workspace_ref from invitation_workspace),'team_invite','c2000000-0000-4000-8000-000000000001'
)->>'challengeId')::uuid id;

reset role;
select pg_temp.create_auth_session('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000004',pg_catalog.now()+interval '1 second');
set local role authenticated;
select pg_temp.set_authenticated_claims('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000004','aal2');
select is(public.complete_brokerdesk_action_reauth((select id from invitation_challenge),repeat('a',64)),'verified','AAL2 verifies the exact invitation proof');

select throws_ok(format(
  'select public.create_brokerdesk_team_invitation(%L,%L,%L,%L,%L,%L,%L)',
  (select workspace_ref from invitation_workspace),'owner',repeat('1',64),'ow***@invite.test',repeat('2',64),repeat('a',64),'invite:owner-role:0001'
),'22023','invalid team invitation','another owner cannot be invited');

create temporary table created_invitation as select public.create_brokerdesk_team_invitation(
  (select workspace_ref from invitation_workspace),'advisor',
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('employee@invite.test','UTF8'),'sha256'),'hex'),
  'em***@invite.test',repeat('b',64),repeat('a',64),'invite:employee:0001'
) result;
select like((select result->>'invitationRef' from created_invitation),'inv\_%','creation returns only an opaque invitation reference');
select is((select result->>'rolePreset' from created_invitation),'advisor','creation returns the safe role preset');
select is(
  public.create_brokerdesk_team_invitation(
    (select workspace_ref from invitation_workspace),'advisor',
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to('employee@invite.test','UTF8'),'sha256'),'hex'),
    'em***@invite.test',repeat('b',64),repeat('a',64),'invite:employee:0001'
  ),
  (select result from created_invitation),
  'an identical retry succeeds after its one-time proof was consumed'
);
select throws_ok(format(
  'select public.create_brokerdesk_team_invitation(%L,%L,%L,%L,%L,%L,%L)',
  (select workspace_ref from invitation_workspace),'viewer',
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('employee@invite.test','UTF8'),'sha256'),'hex'),
  'em***@invite.test',repeat('c',64),repeat('a',64),'invite:employee:0001'
),'22023','idempotency key was already used for a different request','idempotency scope rejects changed commands');
select throws_ok(format(
  'select public.create_brokerdesk_team_invitation(%L,%L,%L,%L,%L,%L,%L)',
  (select workspace_ref from invitation_workspace),'viewer',repeat('3',64),'ne***@invite.test',repeat('c',64),repeat('a',64),'invite:employee:0002'
),'42501','team invitation unavailable','a consumed proof cannot create another invitation');

reset role;
select is((select email_hash from app_private.brokerdesk_team_invitations limit 1),pg_catalog.encode(extensions.digest(pg_catalog.convert_to('employee@invite.test','UTF8'),'sha256'),'hex'),'only the email hash is retained');
select is((select token_hash from app_private.brokerdesk_team_invitations limit 1),repeat('b',64),'only the token hash is retained');
select ok((select consumed_at is null from app_private.brokerdesk_team_invitations limit 1),'link scanners and creation do not consume the invitation');

set local role authenticated;
select pg_temp.set_authenticated_claims('c1000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003');
select is(public.accept_brokerdesk_team_invitation(repeat('b',64)),'{"available": false}'::jsonb,'another verified account receives the neutral unavailable result');
select pg_temp.set_authenticated_claims('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002');
create temporary table accepted_invitation as select public.accept_brokerdesk_team_invitation(repeat('b',64)) result;
select is((select result->>'available' from accepted_invitation),'true','the intended verified account accepts once');
select is((select result->>'rolePreset' from accepted_invitation),'advisor','acceptance preserves the restricted preset');
select like((select result->>'memberRef' from accepted_invitation),'mbr\_%','acceptance exposes no internal membership UUID');
select is(public.accept_brokerdesk_team_invitation(repeat('b',64)),'{"available": false}'::jsonb,'an accepted token cannot be replayed');

reset role;
select is((select status::text from public.organization_members where user_id='c1000000-0000-4000-8000-000000000002'),'active','acceptance creates the existing membership source of truth');
select is((select role_preset::text from app_private.organization_member_access access join public.organization_members member on member.id=access.member_id where member.user_id='c1000000-0000-4000-8000-000000000002'),'advisor','the existing RBAC trigger applies the invited preset');
select is((select count(*)::integer from app_private.broker_client_assignments assignment join public.organization_members member on member.id=assignment.member_id where member.user_id='c1000000-0000-4000-8000-000000000002'),0,'a new employee receives no customer assignments');
select is((select count(*)::integer from app_private.brokerdesk_audit_events where event_name in ('team.invitation.created','team.invitation.accepted')),2,'creation and acceptance are both audited');

update public.organization_members set status='suspended'
where user_id='c1000000-0000-4000-8000-000000000002';
insert into app_private.brokerdesk_team_invitations(
  organization_id,email_hash,email_hint,role_preset,token_hash,invited_by,expires_at
) select organization.id,
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('employee@invite.test','UTF8'),'sha256'),'hex'),
  'em***@invite.test','viewer',repeat('d',64),'c1000000-0000-4000-8000-000000000001',pg_catalog.now()+interval '7 days'
from public.organizations organization where organization.workspace_ref=(select workspace_ref from invitation_workspace);
set local role authenticated;
select pg_temp.set_authenticated_claims('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002');
select is(public.accept_brokerdesk_team_invitation(repeat('d',64)),'{"available": false}'::jsonb,'an invitation cannot reactivate an existing suspended employee');
reset role;
select is((select status::text from public.organization_members where user_id='c1000000-0000-4000-8000-000000000002'),'suspended','suspension remains effective after the rejected invitation');

update public.organization_members set status='suspended'
where user_id='c1000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.set_authenticated_claims('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000004','aal2');
select throws_ok(format(
  'select public.create_brokerdesk_team_invitation(%L,%L,%L,%L,%L,%L,%L)',
  (select workspace_ref from invitation_workspace),'advisor',
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('employee@invite.test','UTF8'),'sha256'),'hex'),
  'em***@invite.test',repeat('b',64),repeat('a',64),'invite:employee:0001'
),'42501','team invitation unavailable','an idempotent retry cannot bypass immediate actor suspension');

select * from finish();
rollback;
