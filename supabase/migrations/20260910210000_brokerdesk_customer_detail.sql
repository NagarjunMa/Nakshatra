-- One BrokerDesk customer page resolves both opaque references inside the
-- database and returns only mandate-approved summary fields. Missing,
-- cross-agency, unassigned and expired-mandate lookups share one response.
create or replace function public.resolve_brokerdesk_customer(
  p_workspace_ref text,
  p_relationship_ref text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  relationship_record record;
begin
  perform app_private.require_current_session();
  if actor_id is null
    or p_workspace_ref !~ '^wrk_[0-9a-f]{32}$'
    or p_relationship_ref !~ '^bcr_[0-9a-f]{32}$'
    or not app_private.member_has_brokerdesk_capability(
      actor_id, p_workspace_ref, 'customers.read', p_relationship_ref
    )
    or not app_private.relationship_has_active_mandate(
      p_workspace_ref, p_relationship_ref, 'customers.read'
    ) then
    return '{"available":false}'::jsonb;
  end if;

  select relationship.relationship_ref as relationship_ref,
         case
           when portfolio.is_published and portfolio.published_data is not null then
             coalesce(nullif(pg_catalog.btrim(portfolio.published_data #>> '{personal,name}'), ''), 'Customer')
           else 'Customer' end as display_name,
         case
           when portfolio.is_published and portfolio.published_data is not null
             then portfolio.published_data #>> '{personal,gender}'
           else null end as gender,
         case
           when portfolio.is_published and portfolio.published_data is not null then
             coalesce(
               nullif(pg_catalog.btrim(portfolio.published_data #>> '{personal,current_location}'), ''),
               nullif(pg_catalog.concat_ws(', ',
                 nullif(pg_catalog.btrim(portfolio.published_data #>> '{personal,city}'), ''),
                 nullif(pg_catalog.btrim(portfolio.published_data #>> '{personal,country}'), '')
               ), '')
             )
           else null end as location,
         relationship.relationship_status as relationship_status,
         relationship.starts_at as starts_at,
         relationship.ends_at as ends_at,
         relationship.row_version as row_version,
         portfolio.is_published as is_published,
         portfolio.published_at as published_at,
         organization.id as organization_id
  into relationship_record
  from public.organizations organization
  join public.broker_clients relationship
    on relationship.organization_id = organization.id
   and relationship.relationship_ref = p_relationship_ref
  left join public.portfolios portfolio on portfolio.candidate_id = relationship.candidate_id
  where organization.workspace_ref = p_workspace_ref
    and organization.type = 'matchmaker_agency'
    and organization.status = 'active'
    and app_private.brokerdesk_entitlement_enabled(organization.id);

  if relationship_record.relationship_ref is null then
    return '{"available":false}'::jsonb;
  end if;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'workspaceRef', p_workspace_ref,
    'relationshipRef', relationship_record.relationship_ref,
    'displayName', relationship_record.display_name,
    'gender', relationship_record.gender,
    'location', relationship_record.location,
    'relationshipStatus', case
      when relationship_record.ends_at is not null
        and relationship_record.ends_at <= pg_catalog.now() then 'expired'
      else relationship_record.relationship_status end,
    'startsAt', relationship_record.starts_at,
    'endsAt', relationship_record.ends_at,
    'version', relationship_record.row_version,
    'portfolio', pg_catalog.jsonb_build_object(
      'status', case when relationship_record.is_published then 'published' else 'completing' end,
      'publishedAt', relationship_record.published_at
    ),
    'assignedTeam', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'memberRef', member.member_ref,
        'displayName', coalesce(
          nullif(pg_catalog.btrim(user_record.raw_user_meta_data ->> 'full_name'), ''),
          nullif(pg_catalog.split_part(user_record.email, '@', 1), ''),
          'Team member'
        ),
        'rolePreset', access.role_preset::text
      ) order by member.created_at)
      from app_private.broker_client_assignments assignment
      join public.organization_members member
        on member.id = assignment.member_id
       and member.organization_id = assignment.organization_id
       and member.status = 'active'
      join app_private.organization_member_access access
        on access.member_id = member.id
       and access.organization_id = member.organization_id
       and access.revoked_at is null
       and access.starts_at <= pg_catalog.now()
       and (access.ends_at is null or access.ends_at > pg_catalog.now())
      left join auth.users user_record on user_record.id = member.user_id
      join public.broker_clients relationship
        on relationship.id = assignment.broker_client_id
       and relationship.organization_id = assignment.organization_id
      where assignment.organization_id = relationship_record.organization_id
        and relationship.relationship_ref = p_relationship_ref
        and assignment.revoked_at is null
        and assignment.starts_at <= pg_catalog.now()
        and (assignment.ends_at is null or assignment.ends_at > pg_catalog.now())
    ), '[]'::jsonb),
    'actions', pg_catalog.jsonb_build_object(
      'canReviewPortfolio',
        app_private.member_has_brokerdesk_capability(
          actor_id, p_workspace_ref, 'portfolio.review', p_relationship_ref
        ) and app_private.relationship_has_active_mandate(
          p_workspace_ref, p_relationship_ref, 'portfolio.review'
        ),
      'canCreateIntroduction',
        app_private.member_has_brokerdesk_capability(
          actor_id, p_workspace_ref, 'introductions.create', p_relationship_ref
        ) and app_private.relationship_has_active_mandate(
          p_workspace_ref, p_relationship_ref, 'introductions.create'
        )
    )
  );
end;
$$;

revoke all on function public.resolve_brokerdesk_customer(text,text) from public, anon, authenticated;
grant execute on function public.resolve_brokerdesk_customer(text,text) to authenticated;

comment on function public.resolve_brokerdesk_customer(text,text) is
  'Returns one mandate-approved BrokerDesk relationship summary after workspace, capability, scope, assignment and relationship authorization.';
