-- Preserve the authenticated, live-session-guarded interest command while
-- allowing the redesigned modal's optional details and structured location.

drop function if exists public.submit_public_interest(
  text, text, text, text, text, text, text, text, text
);
drop function if exists app_private.submit_public_interest(
  text, text, text, text, text, text, text, text, text
);

create function app_private.submit_public_interest(
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
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  normalized_phone text := pg_catalog.regexp_replace(p_phone, '\D', '', 'g');
  prospect_hash text;
  request_id uuid;
begin
  if requester_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_share_token is null
    or pg_catalog.length(p_share_token) not between 8 and 160
    or p_share_token !~ '^[A-Za-z0-9_-]+$'
    or p_name is null
    or pg_catalog.length(pg_catalog.btrim(p_name)) not between 2 and 180
    or p_profile_for is null
    or p_profile_for not in ('self', 'son', 'daughter', 'sibling', 'relative')
    or p_phone is null
    or pg_catalog.length(pg_catalog.btrim(p_phone)) not between 7 and 40
    or p_email is null
    or pg_catalog.length(normalized_email) not between 3 and 180
    or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
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

  select snapshot.portfolio_id, portfolio.candidate_id
    into target_portfolio_id, target_candidate_id
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

  perform 1 from public.portfolios
  where id = target_portfolio_id
  for update;

  if exists (
    select 1 from public.interest_requests request_record
    where request_record.portfolio_id = target_portfolio_id
      and request_record.requester_user_id = requester_id
      and request_record.status in ('new', 'pending_review', 'approved', 'revealed', 'rejected')
  ) then
    return true;
  end if;

  prospect_hash := pg_catalog.encode(
    extensions.digest(normalized_email || '|' || normalized_phone, 'sha256'),
    'hex'
  );

  insert into public.interest_requests (
    portfolio_id, candidate_id, requester_user_id, viewer_name, viewer_phone,
    viewer_email, viewer_family_context, message, request_reason,
    requested_sections, prospect_key_hash, status, attribution_status, metadata
  ) values (
    target_portfolio_id, target_candidate_id, requester_id, pg_catalog.btrim(p_name),
    pg_catalog.btrim(p_phone), normalized_email,
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
    portfolio_id, interest_request_id, actor_user_id, subject_user_id, event_type
  ) values (
    target_portfolio_id, request_id, requester_id, requester_id, 'request_submitted'
  );
  return true;
end;
$$;

create function public.submit_public_interest(
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
begin
  perform app_private.require_current_session();
  return app_private.submit_public_interest(
    p_share_token, p_name, p_profile_for, p_phone, p_email, p_location,
    p_family_context, p_message, p_portfolio_url, p_country, p_state, p_city
  );
end;
$$;

revoke all on function app_private.submit_public_interest(
  text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.submit_public_interest(
  text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_public_interest(
  text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

comment on function public.submit_public_interest(
  text, text, text, text, text, text, text, text, text, text, text, text
) is 'Authenticated, live-session-guarded interest submission with optional structured introduction details.';

