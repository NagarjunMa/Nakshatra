-- Organization-member RLS calls this helper directly, so it must enforce the
-- same live-session boundary as the authorization helpers it delegates to.
create or replace function public.can_manage_organization_member(
  p_organization_id uuid,
  p_target_role public.organization_member_role
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return
    public.has_organization_role(
      p_organization_id,
      array['owner']::public.organization_member_role[]
    )
    or (
      p_target_role <> 'owner'
      and public.has_organization_role(
        p_organization_id,
        array['admin']::public.organization_member_role[]
      )
    );
end;
$$;

revoke all on function public.can_manage_organization_member(uuid, public.organization_member_role)
  from public, anon, authenticated;
grant execute on function public.can_manage_organization_member(uuid, public.organization_member_role)
  to authenticated;

