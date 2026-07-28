-- Hybrid blueprint v1: structured profile fields plus identity-bound reveal access.
-- Existing JSON drafts remain the compatibility source of truth while these
-- columns make broker filtering and future CRM queries deterministic.

alter table public.candidate_personal_details
  add column if not exists profile_for text,
  add column if not exists citizenship text,
  add column if not exists religion text,
  add column if not exists community text,
  add column if not exists sub_community text,
  add column if not exists long_term_goals text,
  add column if not exists shared_life_plans text,
  add column if not exists sibling_count int,
  add column if not exists sibling_position text,
  add column if not exists parents_location text;

alter table public.candidate_education_entries
  add column if not exists qualification_level text;

alter table public.candidate_career_entries
  add column if not exists job_type text,
  add column if not exists annual_income text,
  add column if not exists income_currency text,
  add column if not exists wealth_stage text,
  add column if not exists career_goals text;

alter table public.interest_requests
  add column if not exists requester_user_id uuid references auth.users(id) on delete set null,
  add column if not exists requested_sections text[] not null default '{}',
  add column if not exists request_reason text,
  add column if not exists decided_at timestamptz,
  add column if not exists decided_by uuid references auth.users(id) on delete set null;

create index if not exists idx_interest_requests_requester_user_id
  on public.interest_requests(requester_user_id, created_at desc)
  where requester_user_id is not null;

alter table public.reveal_grants
  add column if not exists viewer_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists access_level text not null default 'selected',
  add column if not exists granted_field_keys text[] not null default '{}',
  add column if not exists last_accessed_at timestamptz;

create index if not exists idx_reveal_grants_viewer_user_id
  on public.reveal_grants(viewer_user_id, created_at desc)
  where viewer_user_id is not null and revoked_at is null;

create policy "Requesters can read own interest requests"
  on public.interest_requests
  for select
  using (requester_user_id = auth.uid());

create policy "Approved viewers can read own active reveal grants"
  on public.reveal_grants
  for select
  using (
    viewer_user_id = auth.uid()
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  );

comment on column public.portfolios.visibility_settings is
  'Section audience defaults for public, approved-viewer, broker, and owner-only blueprint projections.';

comment on table public.reveal_grants is
  'Revocable, identity-bound access from an approved interest request to selected blueprint sections, fields, and media.';
