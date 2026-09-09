-- BrokerDesk safety foundation: customer ownership and agency access are
-- intentionally different concepts. Organization membership, record creation,
-- and legacy organization pointers must never grant ownership of a person's
-- candidate record or portfolio.

-- New private objects fail closed by default. app_private retains USAGE where
-- existing RLS helpers require it, but tables, sequences, and functions do not
-- become callable merely because a migration created them.
revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all sequences in schema app_private from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on functions from public, anon, authenticated;

create or replace function app_private.generate_public_reference(p_prefix text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
begin
  if p_prefix is null or p_prefix <> all(array['wrk', 'bcr', 'bir', 'inc', 'tsk', 'imp', 'inv']::text[]) then
    raise exception 'unsupported public reference type' using errcode = '22023';
  end if;

  return p_prefix || '_' || pg_catalog.encode(extensions.gen_random_bytes(16), 'hex');
end;
$$;

revoke all on function app_private.generate_public_reference(text) from public, anon, authenticated;

create or replace function public.owns_candidate(p_candidate_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return exists (
    select 1
    from public.candidates candidate
    where candidate.id = p_candidate_id
      and candidate.primary_owner_user_id = auth.uid()
  );
end;
$$;

create or replace function public.can_manage_portfolio(p_portfolio_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return exists (
    select 1
    from public.portfolios portfolio
    where portfolio.id = p_portfolio_id
      and (
        portfolio.user_id = auth.uid()
        or (
          portfolio.candidate_id is not null
          and public.owns_candidate(portfolio.candidate_id)
        )
      )
  );
end;
$$;

revoke all on function public.owns_candidate(uuid) from public, anon, authenticated;
revoke all on function public.can_manage_portfolio(uuid) from public, anon, authenticated;
grant execute on function public.owns_candidate(uuid) to authenticated;
grant execute on function public.can_manage_portfolio(uuid) to authenticated;

drop policy if exists "Candidate owners can manage candidates" on public.candidates;
drop policy if exists "Candidate owners can read candidates" on public.candidates;
drop policy if exists "Candidate owners can create candidates" on public.candidates;
drop policy if exists "Candidate owners can update candidates" on public.candidates;
drop policy if exists "Candidate owners can delete candidates" on public.candidates;
drop policy if exists "Candidate owners and operators can read candidates" on public.candidates;
drop policy if exists "Candidate owners and operators can create candidates" on public.candidates;
drop policy if exists "Candidate owners and operators can update candidates" on public.candidates;
drop policy if exists "Candidate owners and operators can delete candidates" on public.candidates;

create policy "Candidate owners can read candidates"
  on public.candidates for select to authenticated
  using (primary_owner_user_id = (select auth.uid()));

create policy "Candidate owners can create candidates"
  on public.candidates for insert to authenticated
  with check (primary_owner_user_id = (select auth.uid()));

create policy "Candidate owners can update candidates"
  on public.candidates for update to authenticated
  using (primary_owner_user_id = (select auth.uid()))
  with check (primary_owner_user_id = (select auth.uid()));

create policy "Candidate owners can delete candidates"
  on public.candidates for delete to authenticated
  using (primary_owner_user_id = (select auth.uid()));

-- The original owner policy on portfolios remains authoritative. Candidate
-- ownership also remains available to the relational portfolio tables through
-- can_manage_portfolio. Agency access will be introduced later through narrow,
-- consent- and mandate-aware read projections rather than direct table writes.
drop policy if exists "Organization members can manage candidate portfolios" on public.portfolios;
drop policy if exists "Organization operators can read candidate portfolios" on public.portfolios;
drop policy if exists "Organization operators can create candidate portfolios" on public.portfolios;
drop policy if exists "Organization operators can update candidate portfolios" on public.portfolios;
drop policy if exists "Organization operators can delete candidate portfolios" on public.portfolios;

comment on column public.candidates.created_by is
  'Audit attribution only. This column does not grant candidate ownership or access.';
comment on column public.candidates.current_organization_id is
  'Legacy routing metadata only. BrokerDesk authorization uses private agency-customer relationships and never this pointer.';
comment on column public.portfolios.owner_organization_id is
  'Legacy organization attribution only. It does not grant access to a customer-owned portfolio.';
