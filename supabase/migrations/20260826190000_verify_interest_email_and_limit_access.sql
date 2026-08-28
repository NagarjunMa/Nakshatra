-- Make a verified Supabase email the identity anchor for every interest request.
-- Phone numbers remain unverified contact details in this MVP.

alter table public.interest_requests
  add column if not exists email_verified_at timestamptz,
  add column if not exists verification_channel text;

alter table public.interest_requests
  drop constraint if exists interest_requests_verification_channel_check;
alter table public.interest_requests
  add constraint interest_requests_verification_channel_check
  check (verification_channel is null or verification_channel = 'email');

update public.interest_requests request_record
set email_verified_at = account.email_confirmed_at,
    verification_channel = 'email'
from auth.users account
where request_record.requester_user_id = account.id
  and account.email_confirmed_at is not null
  and pg_catalog.lower(pg_catalog.btrim(request_record.viewer_email)) = pg_catalog.lower(account.email)
  and request_record.email_verified_at is null;

comment on column public.interest_requests.email_verified_at is
  'Snapshot of the Supabase email confirmation time used to submit this request.';
comment on column public.interest_requests.verification_channel is
  'Verification method used by the requester. MVP permits email only.';

create or replace function app_private.submit_public_interest(
  p_share_token text,
  p_name text,
  p_profile_for text,
  p_phone text,
  p_email text,
  p_location text default null,
  p_family_context text default null,
  p_message text default null,
  p_portfolio_url text default null,
  p_country text default null,
  p_state text default null,
  p_city text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := auth.uid();
  target_portfolio_id uuid;
  target_candidate_id uuid;
  owner_id uuid;
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  normalized_phone text := pg_catalog.regexp_replace(p_phone, '\D', '', 'g');
  verified_email text;
  verified_at timestamptz;
  prospect_hash text;
  request_id uuid;
begin
  if requester_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select pg_catalog.lower(account.email), account.email_confirmed_at
    into verified_email, verified_at
  from auth.users account
  where account.id = requester_id;

  if verified_email is null or verified_at is null or normalized_email <> verified_email then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  if p_share_token is null
    or pg_catalog.length(p_share_token) not between 8 and 160
    or p_share_token !~ '^[A-Za-z0-9_-]+$'
    or p_name is null
    or pg_catalog.length(pg_catalog.btrim(p_name)) not between 2 and 180
    or p_profile_for is null
    or p_profile_for not in ('self', 'son', 'daughter', 'sibling', 'relative')
    or p_phone is null
    or pg_catalog.length(normalized_phone) not between 7 and 20
    or p_email is null
    or pg_catalog.length(normalized_email) not between 3 and 180
    or (p_location is not null and pg_catalog.length(pg_catalog.btrim(p_location)) > 180)
    or (p_family_context is not null and pg_catalog.length(pg_catalog.btrim(p_family_context)) > 600)
    or (p_message is not null and pg_catalog.length(pg_catalog.btrim(p_message)) > 600)
    or (p_portfolio_url is not null and (
      pg_catalog.length(pg_catalog.btrim(p_portfolio_url)) > 500
      or pg_catalog.btrim(p_portfolio_url) !~ '^https://'
    ))
    or (p_country is not null and pg_catalog.length(pg_catalog.btrim(p_country)) > 100)
    or (p_state is not null and pg_catalog.length(pg_catalog.btrim(p_state)) > 120)
    or (p_city is not null and pg_catalog.length(pg_catalog.btrim(p_city)) > 120)
  then
    raise exception 'invalid interest request' using errcode = '22023';
  end if;

  select snapshot.portfolio_id, portfolio.candidate_id, portfolio.user_id
    into target_portfolio_id, target_candidate_id, owner_id
  from public.public_portfolio_snapshots snapshot
  join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
  where snapshot.share_token = p_share_token
    and snapshot.is_active = true
    and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
    and portfolio.share_token = snapshot.share_token
    and portfolio.is_published = true
    and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
  limit 1;

  if target_portfolio_id is null then return false; end if;
  if owner_id = requester_id then
    raise exception 'portfolio owner cannot request own portfolio' using errcode = '22023';
  end if;

  perform 1 from public.portfolios where id = target_portfolio_id for update;

  select request_record.id into request_id
  from public.interest_requests request_record
  where request_record.portfolio_id = target_portfolio_id
    and request_record.requester_user_id = requester_id
    and request_record.status in ('new', 'pending_review', 'approved', 'revealed', 'rejected')
  order by request_record.created_at desc
  limit 1;

  if request_id is not null then
    update public.interest_requests
    set viewer_email = verified_email,
        email_verified_at = verified_at,
        verification_channel = 'email',
        updated_at = pg_catalog.now()
    where id = request_id;
    return true;
  end if;

  prospect_hash := pg_catalog.encode(
    extensions.digest(verified_email || '|' || normalized_phone, 'sha256'),
    'hex'
  );

  insert into public.interest_requests (
    portfolio_id, candidate_id, requester_user_id, viewer_name, viewer_phone,
    viewer_email, email_verified_at, verification_channel,
    viewer_family_context, message, request_reason, requested_sections,
    prospect_key_hash, status, attribution_status, metadata
  ) values (
    target_portfolio_id, target_candidate_id, requester_id, pg_catalog.btrim(p_name),
    pg_catalog.btrim(p_phone), verified_email, verified_at, 'email',
    nullif(pg_catalog.btrim(p_family_context), ''),
    nullif(pg_catalog.btrim(p_message), ''),
    nullif(pg_catalog.btrim(p_message), ''), array['full']::text[],
    prospect_hash, 'new', 'unattributed',
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'profile_for', p_profile_for,
      'country', nullif(pg_catalog.btrim(p_country), ''),
      'state', nullif(pg_catalog.btrim(p_state), ''),
      'city', nullif(pg_catalog.btrim(p_city), ''),
      'location', nullif(pg_catalog.btrim(p_location), ''),
      'portfolio_url', nullif(pg_catalog.btrim(p_portfolio_url), '')
    ))
  ) returning id into request_id;

  insert into public.access_audit_events (
    portfolio_id, interest_request_id, actor_user_id, subject_user_id,
    event_type, metadata
  ) values (
    target_portfolio_id, request_id, requester_id, requester_id,
    'request_submitted', '{"verification_channel":"email"}'::jsonb
  );
  return true;
end;
$$;

create or replace function app_private.decide_interest_request(
  p_interest_request_id uuid,
  p_decision text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  interest_record public.interest_requests%rowtype;
  grant_record public.reveal_grants%rowtype;
  grant_expiry timestamptz := pg_catalog.now() + interval '7 days';
begin
  if auth.uid() is null then return 'unauthorized'; end if;
  if p_decision not in ('approved', 'rejected', 'reopened') then
    raise exception 'invalid interest decision' using errcode = '22023';
  end if;

  select request_record.* into interest_record
  from public.interest_requests request_record
  where request_record.id = p_interest_request_id
    and public.can_manage_portfolio(request_record.portfolio_id)
  for update;

  if interest_record.id is null then return 'not_found'; end if;

  if p_decision = 'reopened' then
    if interest_record.status in ('new', 'pending_review') then return 'already_open'; end if;
    if interest_record.status <> 'rejected' then return 'invalid_transition'; end if;
    update public.interest_requests
    set status = 'pending_review', decided_at = null, decided_by = null,
        updated_at = pg_catalog.now()
    where id = interest_record.id;
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, actor_user_id, subject_user_id, event_type
    ) values (
      interest_record.portfolio_id, interest_record.id, auth.uid(),
      interest_record.requester_user_id, 'request_reopened'
    );
    return 'reopened';
  end if;

  if p_decision = 'approved' then
    if interest_record.requester_user_id is null then return 'signin_required'; end if;
    if interest_record.email_verified_at is null or interest_record.verification_channel <> 'email' then
      return 'verification_required';
    end if;
    if interest_record.status in ('approved', 'revealed') then return 'already_approved'; end if;
    if interest_record.status not in ('new', 'pending_review') then return 'invalid_transition'; end if;

    update public.interest_requests
    set status = 'approved', decided_at = pg_catalog.now(), decided_by = auth.uid(),
        updated_at = pg_catalog.now()
    where id = interest_record.id;

    insert into public.reveal_grants (
      interest_request_id, portfolio_id, viewer_user_id, access_level,
      granted_sections, granted_by, expires_at
    ) values (
      interest_record.id, interest_record.portfolio_id,
      interest_record.requester_user_id, 'full', array['full']::text[],
      auth.uid(), grant_expiry
    ) returning * into grant_record;

    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id,
      subject_user_id, event_type, metadata
    ) values (
      interest_record.portfolio_id, interest_record.id, grant_record.id,
      auth.uid(), interest_record.requester_user_id, 'grant_created',
      pg_catalog.jsonb_build_object('expires_at', grant_record.expires_at, 'duration_days', 7)
    );
    return 'approved';
  end if;

  if interest_record.status = 'rejected' then return 'already_rejected'; end if;
  if interest_record.status not in ('new', 'pending_review', 'approved', 'revealed') then return 'invalid_transition'; end if;

  update public.interest_requests
  set status = 'rejected', decided_at = pg_catalog.now(), decided_by = auth.uid(), updated_at = pg_catalog.now()
  where id = interest_record.id;

  for grant_record in
    update public.reveal_grants
    set revoked_at = pg_catalog.now(), revocation_reason = 'request_rejected'
    where interest_request_id = interest_record.id and revoked_at is null
    returning *
  loop
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id,
      subject_user_id, event_type, metadata
    ) values (
      interest_record.portfolio_id, interest_record.id, grant_record.id,
      auth.uid(), interest_record.requester_user_id, 'grant_revoked',
      '{"reason":"request_rejected"}'::jsonb
    );
  end loop;

  insert into public.access_audit_events (
    portfolio_id, interest_request_id, actor_user_id, subject_user_id, event_type
  ) values (
    interest_record.portfolio_id, interest_record.id, auth.uid(),
    interest_record.requester_user_id, 'request_rejected'
  );
  return 'rejected';
end;
$$;

create or replace function app_private.manage_reveal_grant(
  p_grant_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  grant_record public.reveal_grants%rowtype;
  new_expiry timestamptz;
begin
  if auth.uid() is null then return '{"status":"unauthorized"}'::jsonb; end if;
  if p_action not in ('renew', 'revoke') then
    raise exception 'invalid grant action' using errcode = '22023';
  end if;

  select grant_row.* into grant_record
  from public.reveal_grants grant_row
  where grant_row.id = p_grant_id and public.can_manage_portfolio(grant_row.portfolio_id)
  for update;
  if grant_record.id is null then return '{"status":"not_found"}'::jsonb; end if;

  if p_action = 'revoke' then
    if grant_record.revoked_at is not null then return '{"status":"already_revoked"}'::jsonb; end if;
    update public.reveal_grants
    set revoked_at = pg_catalog.now(), revocation_reason = 'owner_revoked'
    where id = grant_record.id;
    update public.interest_requests
    set status = 'rejected', decided_at = pg_catalog.now(), decided_by = auth.uid(), updated_at = pg_catalog.now()
    where id = grant_record.interest_request_id;
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id,
      subject_user_id, event_type, metadata
    ) values (
      grant_record.portfolio_id, grant_record.interest_request_id, grant_record.id,
      auth.uid(), grant_record.viewer_user_id, 'grant_revoked',
      '{"reason":"owner_revoked"}'::jsonb
    );
    return '{"status":"revoked"}'::jsonb;
  end if;

  if grant_record.revoked_at is not null then return '{"status":"revoked"}'::jsonb; end if;
  if not exists (
    select 1 from public.interest_requests request_record
    where request_record.id = grant_record.interest_request_id
      and request_record.status in ('approved', 'revealed')
      and request_record.email_verified_at is not null
  ) then
    return '{"status":"invalid_transition"}'::jsonb;
  end if;

  new_expiry := pg_catalog.now() + interval '7 days';
  update public.reveal_grants
  set expires_at = new_expiry, renewed_at = pg_catalog.now()
  where id = grant_record.id;
  insert into public.access_audit_events (
    portfolio_id, interest_request_id, grant_id, actor_user_id,
    subject_user_id, event_type, metadata
  ) values (
    grant_record.portfolio_id, grant_record.interest_request_id, grant_record.id,
    auth.uid(), grant_record.viewer_user_id, 'grant_renewed',
    pg_catalog.jsonb_build_object('expires_at', new_expiry, 'duration_days', 7)
  );
  return pg_catalog.jsonb_build_object('status', 'renewed', 'expiresAt', new_expiry);
end;
$$;

revoke all on function app_private.submit_public_interest(
  text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function app_private.decide_interest_request(uuid, text) from public, anon, authenticated;
revoke all on function app_private.manage_reveal_grant(uuid, text) from public, anon, authenticated;

comment on function public.submit_public_interest(
  text, text, text, text, text, text, text, text, text, text, text, text
) is 'Verified-email interest submission; phone is retained as unverified contact information.';
comment on function public.decide_interest_request(uuid, text) is
  'Owner decision command. Approval requires a verified email and creates seven days of Full View access.';
comment on function public.manage_reveal_grant(uuid, text) is
  'Owner grant command. Renewal resets Full View access to seven days from the action time.';
