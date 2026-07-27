-- Replace the broad candidate policy with operation-specific policies.
-- Direct row predicates make INSERT ... RETURNING/SELECT deterministic and
-- preserve access for the candidate owner, creator, or active organization member.

drop policy if exists "Candidate owners can manage candidates" on public.candidates;
drop policy if exists "Candidate owners can read candidates" on public.candidates;
drop policy if exists "Candidate owners can create candidates" on public.candidates;
drop policy if exists "Candidate owners can update candidates" on public.candidates;
drop policy if exists "Candidate owners can delete candidates" on public.candidates;

create policy "Candidate owners can read candidates"
  on public.candidates
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (
      primary_owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or (
        current_organization_id is not null
        and public.is_organization_member(current_organization_id)
      )
    )
  );

create policy "Candidate owners can create candidates"
  on public.candidates
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (
      primary_owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or (
        current_organization_id is not null
        and public.is_organization_member(current_organization_id)
      )
    )
  );

create policy "Candidate owners can update candidates"
  on public.candidates
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (
      primary_owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or (
        current_organization_id is not null
        and public.is_organization_member(current_organization_id)
      )
    )
  )
  with check (
    (select auth.uid()) is not null
    and (
      primary_owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or (
        current_organization_id is not null
        and public.is_organization_member(current_organization_id)
      )
    )
  );

create policy "Candidate owners can delete candidates"
  on public.candidates
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and (
      primary_owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or (
        current_organization_id is not null
        and public.is_organization_member(current_organization_id)
      )
    )
  );

-- Data API object privileges and RLS are separate authorization layers.
-- Grant the authenticated role access to the tables used by dashboard saves;
-- the policies on each table continue to restrict access to authorized rows.
grant select, insert, update, delete on table
  public.portfolios,
  public.candidates,
  public.candidate_personal_details,
  public.candidate_astrology_details,
  public.candidate_family_members,
  public.candidate_education_entries,
  public.candidate_career_entries,
  public.candidate_lifestyle_details,
  public.candidate_partner_preferences,
  public.visibility_rules
to authenticated;
