begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(17);

select pg_temp.create_auth_actor(
  '71000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001',
  'invited@pilot.test'
);
select pg_temp.create_auth_actor(
  '71000000-0000-4000-8000-000000000002',
  '72000000-0000-4000-8000-000000000002',
  'viewer@pilot.test'
);

insert into public.candidates (id, primary_owner_user_id, display_name, created_by)
values (
  '73000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  'Pilot Owner',
  '71000000-0000-4000-8000-000000000001'
);

insert into public.portfolios (
  id, user_id, candidate_id, share_token, draft_data, published_data,
  is_published, template_id, theme_color
) values (
  '74000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  'pilot_policy_token_01',
  '{"personal":{"name":"Pilot Owner"}}',
  '{}', false, 1, '#17151c'
);

insert into public.portfolio_media (
  portfolio_id, candidate_id, media_type, storage_path, visibility, sort_order, metadata
) values (
  '74000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  'hero',
  '71000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/hero.webp',
  'public', 0, '{}'
);

select has_table('app_private', 'b2c_creator_entitlements', 'the private creator allowlist exists');
select ok(
  not has_table_privilege('authenticated', 'app_private.b2c_creator_entitlements', 'SELECT'),
  'authenticated users cannot enumerate creator entitlements'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '71000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001'
);
select ok(not public.current_user_can_create_portfolio(), 'a signed-in viewer is not a creator by default');
select is(
  public.save_dashboard_draft_transaction('{}') ->> 'status',
  'creator_entitlement_required',
  'an uninvited viewer receives a safe draft-save status'
);
select is(
  public.publish_portfolio_transaction(
    '74000000-0000-4000-8000-000000000001', '{}', '{}', '{}',
    'pilot_policy_token_01', now() + interval '90 days', 1, '#17151c', null
  ) ->> 'status',
  'creator_entitlement_required',
  'an uninvited viewer cannot publish an existing draft'
);

reset role;
insert into app_private.b2c_creator_entitlements (email_hash)
values (app_private.normalized_email_hash('invited@pilot.test'));

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '71000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001'
);
select ok(public.current_user_can_create_portfolio(), 'a confirmed allowlisted account receives creator access');
select is(
  public.publish_portfolio_transaction(
    '74000000-0000-4000-8000-000000000001',
    '{"personal":{"name":"Pilot Owner"}}',
    '{"personal":{"name":"Pilot Owner"}}',
    '{"personal":{"name":"Pilot Owner"}}',
    'pilot_policy_token_01', now() + interval '90 days', 1, '#17151c', null
  ) ->> 'status',
  'verification_required',
  'publication fails closed until current identity verification exists'
);

reset role;
update app_private.identity_verification_subjects
set status = 'verified', verified_at = now(), expires_at = now() + interval '365 days'
where candidate_id = '73000000-0000-4000-8000-000000000001';

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '71000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001'
);
select is(
  public.publish_portfolio_transaction(
    '74000000-0000-4000-8000-000000000001',
    '{"personal":{"name":"Pilot Owner"}}',
    '{"personal":{"name":"Pilot Owner"}}',
    '{"personal":{"name":"Pilot Owner"}}',
    'pilot_policy_token_01', now() + interval '90 days', 1, '#17151c', null
  ) ->> 'status',
  'ok',
  'an invited and currently verified owner can publish'
);
select ok(
  (select expires_at between now() + interval '29 days' and now() + interval '31 days'
   from public.portfolios where id = '74000000-0000-4000-8000-000000000001'),
  'the database replaces the caller expiry with a 30-day public window'
);

reset role;
update public.portfolios
set expires_at = now() - interval '1 minute'
where id = '74000000-0000-4000-8000-000000000001';
update public.public_portfolio_snapshots
set expires_at = now() - interval '1 minute'
where portfolio_id = '74000000-0000-4000-8000-000000000001';

set local role anon;
select pg_temp.set_anon_claims();
select is(public.resolve_public_portfolio_status('pilot_policy_token_01'), 'expired', 'an exact expired link gets the expired state');
select is(public.resolve_public_portfolio_status('malformed token'), 'unavailable', 'malformed links remain non-enumerating');

reset role;
update public.portfolios
set expires_at = now() + interval '30 days'
where id = '74000000-0000-4000-8000-000000000001';
update public.public_portfolio_snapshots
set expires_at = now() + interval '30 days'
where portfolio_id = '74000000-0000-4000-8000-000000000001';

insert into public.interest_requests (
  id, portfolio_id, candidate_id, requester_user_id, viewer_name, viewer_email,
  status, email_verified_at, verification_channel
) values (
  '75000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  'Pilot Viewer', 'viewer@pilot.test', 'approved', now(), 'email'
);
insert into public.reveal_grants (
  id, interest_request_id, portfolio_id, viewer_user_id, access_level,
  granted_sections, granted_by, expires_at
) values (
  '76000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  'full', array['full']::text[],
  '71000000-0000-4000-8000-000000000001', now() + interval '7 days'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  '71000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001'
);
select is(
  public.manage_reveal_grant('76000000-0000-4000-8000-000000000001', 'renew') ->> 'status',
  'renewed',
  'Full View renewal succeeds through the owner command'
);
select ok(
  (select expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days'
   from public.reveal_grants where id = '76000000-0000-4000-8000-000000000001'),
  'Full View renewal resets to no more than seven days'
);
select is(public.unpublish_portfolio_transaction() ->> 'status', 'unpublished', 'unpublish succeeds');

reset role;
select is((select count(*)::integer from public.interest_requests where portfolio_id = '74000000-0000-4000-8000-000000000001'), 1, 'unpublish preserves interest requests');
select is((select count(*)::integer from public.reveal_grants where portfolio_id = '74000000-0000-4000-8000-000000000001'), 1, 'unpublish preserves Full View grants');
select ok(
  exists (select 1 from public.access_audit_events where portfolio_id = '74000000-0000-4000-8000-000000000001' and event_type = 'portfolio_unpublished'),
  'unpublish writes an immutable audit event'
);

select * from finish();
rollback;
