begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(39);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner@phase4.test', now(), now()),
  ('41000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@phase4.test', now(), now()),
  ('41000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'editor@phase4.test', now(), now()),
  ('41000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'viewer@phase4.test', now(), now()),
  ('41000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'broker@phase4.test', now(), now()),
  ('41000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'delete@phase4.test', now(), now());

select has_function('public', 'is_current_session_active', array[]::text[], 'live Auth session predicate exists');

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', now(), now()),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', now(), now()),
  ('42000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-000000000003', now(), now()),
  ('42000000-0000-4000-8000-000000000004', '41000000-0000-4000-8000-000000000004', now(), now()),
  ('42000000-0000-4000-8000-000000000005', '41000000-0000-4000-8000-000000000005', now(), now()),
  ('42000000-0000-4000-8000-000000000006', '41000000-0000-4000-8000-000000000006', now(), now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000001"}';
select ok(public.is_current_session_active(), 'a JWT bound to a live Auth session is active');
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000099"}';
select ok(not public.is_current_session_active(), 'a JWT without its backing Auth session is rejected');

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000001"}';
select is(
  public.create_organization_with_owner('matchmaker_agency', 'Phase Four Agency', 'phase-four-agency') ->> 'role',
  'owner',
  'organization creation atomically returns the owner role'
);
select is(
  (select count(*)::integer from public.organization_members where user_id = '41000000-0000-4000-8000-000000000001'),
  1,
  'organization creation atomically persists its first owner'
);
select ok(
  not has_table_privilege('authenticated', 'public.organizations', 'INSERT'),
  'authenticated users cannot bypass atomic organization creation'
);

reset role;
insert into public.organization_members (organization_id, user_id, role, status)
select id, '41000000-0000-4000-8000-000000000002', 'admin', 'active' from public.organizations where slug = 'phase-four-agency';
insert into public.organization_members (organization_id, user_id, role, status)
select id, '41000000-0000-4000-8000-000000000004', 'viewer', 'active' from public.organizations where slug = 'phase-four-agency';
insert into public.organization_members (organization_id, user_id, role, status)
select id, '41000000-0000-4000-8000-000000000005', 'broker_agent', 'active' from public.organizations where slug = 'phase-four-agency';
insert into public.candidates (id, current_organization_id, display_name, created_by)
select '43000000-0000-4000-8000-000000000001', id, 'Organization Candidate', '41000000-0000-4000-8000-000000000001'
from public.organizations where slug = 'phase-four-agency';

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000004"}';
select ok(
  public.has_organization_role(
    (select id from public.organizations where slug = 'phase-four-agency'),
    array['viewer']::public.organization_member_role[]
  ),
  'the explicit role helper recognizes an active viewer'
);
select is(
  (select count(*)::integer from public.candidates where id = '43000000-0000-4000-8000-000000000001'),
  0,
  'an organization viewer cannot read private candidate rows'
);
select lives_ok(
  $$update public.candidates set display_name = 'Viewer Mutation' where id = '43000000-0000-4000-8000-000000000001'$$,
  'a viewer update is filtered without exposing the protected row'
);
reset role;
select is(
  (select display_name from public.candidates where id = '43000000-0000-4000-8000-000000000001'),
  'Organization Candidate',
  'a viewer cannot modify candidate data'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000004"}';
select throws_ok(
  $$insert into public.candidates (current_organization_id, display_name)
    select id, 'Viewer Candidate' from public.organizations where slug = 'phase-four-agency'$$,
  '42501', null,
  'a viewer cannot create candidate data'
);

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000005","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000005"}';
select lives_ok(
  $$update public.candidates set display_name = 'Broker Mutation' where id = '43000000-0000-4000-8000-000000000001'$$,
  'a broker-agent can perform candidate operations'
);
reset role;
select is(
  (select display_name from public.candidates where id = '43000000-0000-4000-8000-000000000001'),
  'Broker Mutation',
  'the broker-agent operation persists'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000002"}';
select lives_ok(
  $$insert into public.organization_members (organization_id, user_id, role, status)
    select id, '41000000-0000-4000-8000-000000000003', 'editor', 'active'
    from public.organizations where slug = 'phase-four-agency'$$,
  'an admin can add a non-owner organization member'
);
select throws_ok(
  $$update public.organization_members set role = 'owner'
    where user_id = '41000000-0000-4000-8000-000000000003'$$,
  '42501', null,
  'an admin cannot grant the owner role'
);

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000001"}';
set constraints enforce_organization_owner_invariant immediate;
select throws_ok(
  $$delete from public.organization_members where user_id = '41000000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'the final active owner cannot be removed'
);

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000004"}';
select throws_ok(
  $$insert into public.broker_clients (organization_id, candidate_id)
    select id, '43000000-0000-4000-8000-000000000001'
    from public.organizations where slug = 'phase-four-agency'$$,
  '42501', null,
  'a viewer cannot manage broker clients'
);

reset role;
insert into public.plans (id, code, name, audience) values (
  '45000000-0000-4000-8000-000000000001', 'phase4-plan', 'Phase 4 Plan', 'b2b'
);
insert into public.subscriptions (id, organization_id, plan_id)
select '46000000-0000-4000-8000-000000000001', id, '45000000-0000-4000-8000-000000000001'
from public.organizations where slug = 'phase-four-agency';

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000002"}';
select is((select count(*)::integer from public.subscriptions), 1, 'an organization admin can read billing records');
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000004"}';
select is((select count(*)::integer from public.subscriptions), 0, 'an organization viewer cannot read billing records');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000006","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000006"}';
select throws_ok(
  $$insert into public.portfolios (user_id, draft_data, is_published)
    values ('41000000-0000-4000-8000-000000000006', '{"personal":{}}', true)$$,
  '23514', null,
  'a direct portfolio insert cannot bypass the public hero requirement'
);
reset role;
insert into public.portfolios (id, user_id, share_token, draft_data, published_data, is_published, expires_at)
values (
  '44000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000006',
  'phase4_delete_token01',
  '{"personal":{"name":"Delete Subject"}}',
  '{"personal":{"name":"Delete Subject"}}',
  false,
  now() + interval '90 days'
);
insert into public.portfolio_media (portfolio_id, media_type, storage_path, visibility, sort_order)
values (
  '44000000-0000-4000-8000-000000000001',
  'hero',
  '41000000-0000-4000-8000-000000000006/44000000-0000-4000-8000-000000000001/hero.webp',
  'public',
  0
);
update public.portfolios set is_published = true
where id = '44000000-0000-4000-8000-000000000001';
insert into public.interest_requests (
  id, portfolio_id, viewer_name, viewer_email, message, requester_user_id, status, updated_at
) values (
  '47000000-0000-4000-8000-000000000001',
  '44000000-0000-4000-8000-000000000001',
  'Viewer Secret', 'viewer-secret@phase4.test', 'Private request text',
  '41000000-0000-4000-8000-000000000004', 'closed', now() - interval '181 days'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000006","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000006"}';
select is(public.request_account_deletion() ->> 'status', 'pending', 'account deletion enters the recovery window');
reset role;
select ok(not (select is_published from public.portfolios where id = '44000000-0000-4000-8000-000000000001'), 'deletion immediately unpublishes the portfolio');
select is((select status from public.account_deletion_requests where user_id = '41000000-0000-4000-8000-000000000006'), 'pending', 'the deletion request is persisted');
select is((select count(*)::integer from auth.sessions where user_id = '41000000-0000-4000-8000-000000000006'), 1, 'pending deletion preserves every Auth session through the recovery window');
insert into auth.sessions (id, user_id, created_at, updated_at)
values (
  '42000000-0000-4000-8000-000000000016',
  '41000000-0000-4000-8000-000000000006',
  now(), now()
);
set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000006","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000016"}';
select is(public.cancel_account_deletion(), 'canceled', 'the subject can cancel before processing begins');

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000001"}';
select is(public.request_account_deletion() ->> 'status', 'ownership_transfer_required', 'sole owners must transfer organizations with other active members');
select is((select count(*)::integer from public.account_deletion_requests where user_id = '41000000-0000-4000-8000-000000000001'), 0, 'a blocked deletion request is not scheduled');
select ok(position('viewer-secret@phase4.test' in public.export_my_account_data()::text) = 0, 'an owner export excludes another requester''s submitted PII');

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"42000000-0000-4000-8000-000000000004"}';
select ok(position('viewer-secret@phase4.test' in public.export_my_account_data()::text) > 0, 'a requester export includes that requester''s own submitted record');

reset role;
select ok(not has_function_privilege('anon', 'public.export_my_account_data()', 'EXECUTE'), 'anonymous callers cannot export account data');
select ok(not has_function_privilege('authenticated', 'public.prepare_account_deletion(uuid,uuid,uuid)', 'EXECUTE'), 'application users cannot execute destructive maintenance');
select ok(has_function_privilege('service_role', 'public.prepare_account_deletion(uuid,uuid,uuid)', 'EXECUTE'), 'only the maintenance role can prepare destructive deletion');

insert into public.portfolio_views (portfolio_id, viewed_at)
values ('44000000-0000-4000-8000-000000000001', now() - interval '396 days');
insert into public.access_audit_events (portfolio_id, event_type, created_at)
values
  ('44000000-0000-4000-8000-000000000001', 'portfolio_unpublished', now() - interval '731 days'),
  ('44000000-0000-4000-8000-000000000001', 'portfolio_unpublished', now());
insert into public.account_deletion_requests (
  subject_hash, status, requested_at, scheduled_for, updated_at
) values (
  repeat('f', 64), 'failed', now() - interval '31 days',
  now() - interval '31 days', now() - interval '31 days'
);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select is((public.run_data_retention() ->> 'portfolioViewsDeleted')::integer, 1, 'retention removes expired portfolio analytics');
reset role;
select is((select count(*)::integer from public.portfolio_views where portfolio_id = '44000000-0000-4000-8000-000000000001'), 0, 'expired portfolio views are gone');
select ok((select viewer_email is null and viewer_name is null and message is null from public.interest_requests where id = '47000000-0000-4000-8000-000000000001'), 'retention anonymizes closed requester PII');
select is((select count(*)::integer from public.access_audit_events where created_at < now() - interval '730 days'), 0, 'retention removes access audits beyond the investigation window');
select is((select count(*)::integer from public.access_audit_events), 1, 'retention preserves recent access audits');
select is((select count(*)::integer from public.account_deletion_requests where subject_hash = repeat('f', 64)), 0, 'retention removes orphaned deletion receipts');
select ok(
  exists (select 1 from app_private.data_retention_policies where data_class = 'database_backups' and action = 'provider_managed'),
  'provider-managed backup retention is explicitly recorded'
);

select * from finish();
rollback;
