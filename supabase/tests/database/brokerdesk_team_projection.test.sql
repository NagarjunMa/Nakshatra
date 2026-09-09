begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(20);

select has_column('public', 'organization_members', 'member_ref', 'organization members have opaque references');
select has_function('public', 'resolve_brokerdesk_team', array['text'], 'minimal team projection exists');
select ok(
  has_function_privilege('authenticated', 'public.resolve_brokerdesk_team(text)', 'execute'),
  'authenticated sessions can call the guarded team projection'
);
select ok(
  not has_table_privilege('anon', 'public.organization_members', 'select'),
  'anonymous callers cannot inspect membership rows'
);

select pg_temp.create_auth_actor(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'team-owner-a@nakshatra.test'
);
select pg_temp.create_auth_actor(
  'c1000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002',
  'team-owner-b@nakshatra.test'
);
select pg_temp.create_auth_actor(
  'c1000000-0000-4000-8000-000000000003',
  'c2000000-0000-4000-8000-000000000003',
  'team-advisor@nakshatra.test'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001'
);
create temporary table team_workspace_a as
select created.result->>'workspaceRef' as workspace_ref
from (
  select public.create_brokerdesk_workspace(
    '{
      "legalName":"Team Projection Agency A",
      "businessType":"partnership",
      "registrationCountry":"in",
      "primaryCity":"Bengaluru",
      "primaryCountry":"in"
    }'::jsonb,
    'team:workspace:a:0001'
  ) as result
) created;

select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002'
);
create temporary table team_workspace_b as
select created.result->>'workspaceRef' as workspace_ref
from (
  select public.create_brokerdesk_workspace(
    '{
      "legalName":"Team Projection Agency B",
      "businessType":"sole_proprietorship",
      "registrationCountry":"in",
      "primaryCity":"Mysuru",
      "primaryCountry":"in"
    }'::jsonb,
    'team:workspace:b:0001'
  ) as result
) created;

select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001'
);
create temporary table owner_team_projection as
select public.resolve_brokerdesk_team((select workspace_ref from team_workspace_a)) as result;

select is((select result->>'available' from owner_team_projection), 'true', 'the owner can read the onboarding team');
select is(
  (select jsonb_array_length(result->'members') from owner_team_projection),
  1,
  'a new workspace initially projects only its owner'
);
select ok(
  (select result->'members'->0->>'memberRef' from owner_team_projection) ~ '^mbr_[0-9a-f]{32}$',
  'the projection exposes an opaque member reference'
);
select ok(
  not ((select result->'members'->0 from owner_team_projection) ?| array['id', 'userId', 'organizationId', 'invitedBy']),
  'the projection omits internal identity and organization identifiers'
);
select is(
  (select result->'members'->0->>'customerAccess' from owner_team_projection),
  'all_customers',
  'the owner receives the understandable organization-scope label'
);

select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002'
);
select is(
  public.resolve_brokerdesk_team((select workspace_ref from team_workspace_a)),
  '{"available":false}'::jsonb,
  'another agency owner receives the uniform unavailable result'
);

reset role;
insert into public.organization_members (organization_id, user_id, role, status, invited_by)
select organization_record.id,
       'c1000000-0000-4000-8000-000000000003',
       'broker_agent',
       'active',
       'c1000000-0000-4000-8000-000000000001'
from public.organizations organization_record
where organization_record.workspace_ref = (select workspace_ref from team_workspace_a);

select ok(
  (select member_ref from public.organization_members
   where user_id = 'c1000000-0000-4000-8000-000000000003') ~ '^mbr_[0-9a-f]{32}$',
  'new employees receive server-generated opaque references'
);
select throws_ok(
  $$update public.organization_members
    set member_ref = 'mbr_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    where user_id = 'c1000000-0000-4000-8000-000000000003'$$,
  '22023', 'member reference is immutable',
  'member references cannot be replaced after creation'
);

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000003',
  'c2000000-0000-4000-8000-000000000003'
);
select is(
  (select count(*)::integer from public.organization_members
   where organization_id = (
     select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from team_workspace_a)
   )),
  0,
  'an employee cannot bypass the BrokerDesk projection through the membership table'
);
select is(
  public.resolve_brokerdesk_team((select workspace_ref from team_workspace_a)),
  '{"available":false}'::jsonb,
  'an advisor cannot enumerate the agency team'
);

select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001'
);
select is(
  (select count(*)::integer from public.organization_members
   where organization_id = (
     select organization_record.id from public.organizations organization_record
     where organization_record.workspace_ref = (select workspace_ref from team_workspace_a)
   )),
  0,
  'an owner also uses the safe projection instead of directly reading membership rows'
);
select throws_ok(
  $$insert into public.organization_members (organization_id, user_id, role, status)
    select organization_record.id,
           'c1000000-0000-4000-8000-000000000002',
           'viewer',
           'active'
    from public.organizations organization_record
    where organization_record.workspace_ref = (select workspace_ref from team_workspace_a)$$,
  '42501', null,
  'legacy membership RLS cannot add a BrokerDesk employee directly'
);
select is_empty(
  $$update public.organization_members
    set role = 'admin'
    where user_id = 'c1000000-0000-4000-8000-000000000003'
    returning id$$,
  'legacy membership RLS cannot change BrokerDesk roles directly'
);
select is_empty(
  $$delete from public.organization_members
    where user_id = 'c1000000-0000-4000-8000-000000000003'
    returning id$$,
  'legacy membership RLS cannot remove BrokerDesk employees directly'
);

reset role;
update public.organization_members
set status = 'suspended'
where user_id = 'c1000000-0000-4000-8000-000000000003';

set local role authenticated;
select pg_temp.set_authenticated_claims(
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001'
);
select is(
  (
    select member->>'status'
    from jsonb_array_elements(
      public.resolve_brokerdesk_team((select workspace_ref from team_workspace_a))->'members'
    ) member
    where member->>'email' = 'team-advisor@nakshatra.test'
  ),
  'suspended',
  'the owner projection clearly reports immediate employee suspension'
);
select is(
  (
    select member->>'customerAccess'
    from jsonb_array_elements(
      public.resolve_brokerdesk_team((select workspace_ref from team_workspace_a))->'members'
    ) member
    where member->>'email' = 'team-advisor@nakshatra.test'
  ),
  'none',
  'a new employee has no customer access by default'
);

select * from finish();
rollback;
