-- Phase 2: identity-bound, expiring, revocable, and auditable access.

alter table public.reveal_grants
  add column if not exists renewed_at timestamptz,
  add column if not exists revocation_reason text;

update public.reveal_grants
set expires_at = greatest(created_at, pg_catalog.now()) + interval '30 days'
where expires_at is null;

alter table public.reveal_grants
  alter column expires_at set default (pg_catalog.now() + interval '30 days'),
  alter column expires_at set not null;

alter table public.reveal_grants
  drop constraint if exists reveal_grants_expiry_after_creation;
alter table public.reveal_grants
  add constraint reveal_grants_expiry_after_creation
  check (expires_at > created_at);

-- Retain only the newest active grant if legacy data contains duplicates.
with ranked as (
  select id,
    pg_catalog.row_number() over (
      partition by interest_request_id, viewer_user_id
      order by created_at desc, id desc
    ) as position
  from public.reveal_grants
  where revoked_at is null
)
update public.reveal_grants grant_record
set revoked_at = pg_catalog.now(),
    revocation_reason = 'duplicate_migration_cleanup'
from ranked
where grant_record.id = ranked.id
  and ranked.position > 1;

create unique index if not exists idx_reveal_grants_one_active_per_requester
  on public.reveal_grants(interest_request_id, viewer_user_id)
  where revoked_at is null;

create index if not exists idx_reveal_grants_active_access
  on public.reveal_grants(portfolio_id, viewer_user_id, expires_at)
  where revoked_at is null;

create index if not exists idx_interest_requests_requester_portfolio_status
  on public.interest_requests(requester_user_id, portfolio_id, status, created_at desc)
  where requester_user_id is not null;

-- Storage and approved-data policies share this predicate. A portfolio is
-- published only while its sanitized snapshot is active and token-aligned.
create or replace function public.is_published_portfolio(p_portfolio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolios portfolio
    join public.public_portfolio_snapshots snapshot
      on snapshot.portfolio_id = portfolio.id
    where portfolio.id = p_portfolio_id
      and portfolio.is_published = true
      and portfolio.share_token is not null
      and portfolio.share_token = snapshot.share_token
      and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
      and snapshot.is_active = true
      and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
  );
$$;

revoke all on function public.is_published_portfolio(uuid) from public, anon, authenticated;
grant execute on function public.is_published_portfolio(uuid) to anon, authenticated;

create table if not exists public.access_audit_events (
  id bigint generated always as identity primary key,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  interest_request_id uuid references public.interest_requests(id) on delete set null,
  grant_id uuid references public.reveal_grants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'request_submitted',
    'request_reopened',
    'request_rejected',
    'grant_created',
    'grant_renewed',
    'grant_accessed',
    'grant_revoked',
    'grant_expired',
    'portfolio_rotated',
    'portfolio_unpublished'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  check (pg_catalog.jsonb_typeof(metadata) = 'object'),
  check (not (metadata ?| array[
    'email', 'phone', 'name', 'message', 'family_context', 'share_token',
    'storage_path', 'signed_url', 'horoscope_path'
  ]))
);

alter table public.access_audit_events enable row level security;

create index if not exists idx_access_audit_events_portfolio_created
  on public.access_audit_events(portfolio_id, created_at desc);
create index if not exists idx_access_audit_events_grant_created
  on public.access_audit_events(grant_id, created_at desc)
  where grant_id is not null;
create index if not exists idx_access_audit_events_grant_type_created
  on public.access_audit_events(grant_id, event_type, created_at desc)
  where grant_id is not null;
create unique index if not exists idx_access_audit_one_expiry_per_grant
  on public.access_audit_events(grant_id, event_type)
  where grant_id is not null and event_type = 'grant_expired';

revoke all on table public.access_audit_events from anon, authenticated;
grant select on table public.access_audit_events to authenticated;
grant usage, select on sequence public.access_audit_events_id_seq to authenticated;

drop policy if exists "Portfolio managers can read access audit events"
  on public.access_audit_events;
create policy "Portfolio managers can read access audit events"
  on public.access_audit_events for select
  to authenticated
  using (
    portfolio_id is not null
    and public.can_manage_portfolio(portfolio_id)
  );

create or replace function app_private.prevent_access_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'access audit events are immutable' using errcode = '55000';
end;
$$;

revoke all on function app_private.prevent_access_audit_mutation() from public;

drop trigger if exists prevent_access_audit_mutation on public.access_audit_events;
create trigger prevent_access_audit_mutation
  before update or delete on public.access_audit_events
  for each row execute function app_private.prevent_access_audit_mutation();

-- Full View can contain detailed profile, family, astrology, and financial
-- information, but direct contact, internal notes, identifiers, and media
-- locations remain owner-only even when the RPC is called outside the app.
create or replace function app_private.approved_snapshot_has_forbidden_key(p_data jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with recursive nodes(value) as (
    select p_data
    union all
    select child.value
    from nodes parent
    cross join lateral (
      select object_value as value
      from pg_catalog.jsonb_each(
        case when pg_catalog.jsonb_typeof(parent.value) = 'object' then parent.value else '{}'::jsonb end
      ) as object_child(object_key, object_value)
      union all
      select array_value as value
      from pg_catalog.jsonb_array_elements(
        case when pg_catalog.jsonb_typeof(parent.value) = 'array' then parent.value else '[]'::jsonb end
      ) as array_child(array_value)
    ) child
  )
  select exists (
    select 1
    from nodes node
    cross join lateral pg_catalog.jsonb_object_keys(
      case when pg_catalog.jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end
    ) forbidden_key
    where forbidden_key = any(array[
      'contact', 'contacts', 'phone', 'email', 'secure_note', 'private_notes',
      'photo_url', 'photo_urls', 'photo_thumb_url', 'storage_path',
      'thumbnail_path', 'public_url', 'blurPath', 'accessPath', 'signed_url',
      'horoscope_path', 'credit_score_band', 'location_preference',
      'location_preferences', 'wedding_expectations', 'gift_expectations',
      'parent_support', 'country_code', 'region_code', 'city_geoname_id',
      'current_country_code', 'current_region_code', 'current_city_geoname_id',
      'portfolio_id', 'candidate_id', 'user_id'
    ]::text[])
  );
$$;

create or replace function app_private.enforce_approved_snapshot_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app_private.approved_snapshot_has_forbidden_key(new.data) then
    raise exception 'approved snapshot contains an owner-only field' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function app_private.approved_snapshot_has_forbidden_key(jsonb) from public, anon, authenticated;
revoke all on function app_private.enforce_approved_snapshot_contract() from public, anon, authenticated;

drop trigger if exists enforce_approved_snapshot_contract on public.approved_portfolio_snapshots;
create trigger enforce_approved_snapshot_contract
  before insert or update of data on public.approved_portfolio_snapshots
  for each row execute function app_private.enforce_approved_snapshot_contract();

-- Interest requests must be bound to a verified Supabase identity. The function
-- owns status, scope, requester identity, attribution, and audit fields.
create or replace function public.submit_public_interest(
  p_share_token text,
  p_name text,
  p_profile_for text,
  p_phone text,
  p_email text,
  p_location text,
  p_family_context text,
  p_message text,
  p_portfolio_url text default null
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
    or p_location is null
    or pg_catalog.length(pg_catalog.btrim(p_location)) not between 2 and 180
    or p_family_context is null
    or pg_catalog.length(pg_catalog.btrim(p_family_context)) not between 10 and 600
    or p_message is null
    or pg_catalog.length(pg_catalog.btrim(p_message)) not between 5 and 600
    or (p_portfolio_url is not null and pg_catalog.length(p_portfolio_url) > 500)
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
    pg_catalog.btrim(p_phone), normalized_email, pg_catalog.btrim(p_family_context),
    pg_catalog.btrim(p_message), pg_catalog.btrim(p_message), array['full']::text[],
    prospect_hash, 'new', 'unattributed',
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'profile_for', p_profile_for,
      'location', pg_catalog.btrim(p_location),
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

-- Owner decisions follow an explicit state machine. Every transition and grant
-- mutation occurs under one row lock and one database transaction.
create or replace function public.decide_interest_request(
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
  grant_expiry timestamptz := pg_catalog.now() + interval '30 days';
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
      pg_catalog.jsonb_build_object('expires_at', grant_expiry)
    );
    return 'approved';
  end if;

  if interest_record.status = 'rejected' then return 'already_rejected'; end if;
  if interest_record.status not in ('new', 'pending_review', 'approved', 'revealed') then
    return 'invalid_transition';
  end if;

  update public.interest_requests
  set status = 'rejected', decided_at = pg_catalog.now(), decided_by = auth.uid(),
      updated_at = pg_catalog.now()
  where id = interest_record.id;

  for grant_record in
    update public.reveal_grants
    set revoked_at = pg_catalog.now(), revocation_reason = 'request_rejected'
    where interest_request_id = interest_record.id
      and revoked_at is null
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

create or replace function public.manage_reveal_grant(
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
  where grant_row.id = p_grant_id
    and public.can_manage_portfolio(grant_row.portfolio_id)
  for update;

  if grant_record.id is null then return '{"status":"not_found"}'::jsonb; end if;

  if p_action = 'revoke' then
    if grant_record.revoked_at is not null then
      return '{"status":"already_revoked"}'::jsonb;
    end if;
    update public.reveal_grants
    set revoked_at = pg_catalog.now(), revocation_reason = 'owner_revoked'
    where id = grant_record.id;
    update public.interest_requests
    set status = 'rejected', decided_at = pg_catalog.now(), decided_by = auth.uid(),
        updated_at = pg_catalog.now()
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

  if grant_record.revoked_at is not null then
    return '{"status":"revoked"}'::jsonb;
  end if;
  if not exists (
    select 1 from public.interest_requests request_record
    where request_record.id = grant_record.interest_request_id
      and request_record.status in ('approved', 'revealed')
  ) then
    return '{"status":"invalid_transition"}'::jsonb;
  end if;

  new_expiry := greatest(grant_record.expires_at, pg_catalog.now()) + interval '30 days';
  update public.reveal_grants
  set expires_at = new_expiry, renewed_at = pg_catalog.now()
  where id = grant_record.id;
  insert into public.access_audit_events (
    portfolio_id, interest_request_id, grant_id, actor_user_id,
    subject_user_id, event_type, metadata
  ) values (
    grant_record.portfolio_id, grant_record.interest_request_id, grant_record.id,
    auth.uid(), grant_record.viewer_user_id, 'grant_renewed',
    pg_catalog.jsonb_build_object('expires_at', new_expiry)
  );
  return pg_catalog.jsonb_build_object('status', 'renewed', 'expiresAt', new_expiry);
end;
$$;

-- Public and approved snapshots, portfolio lifecycle fields, and horoscope
-- publication state commit together or roll back together.
create or replace function public.publish_portfolio_transaction(
  p_portfolio_id uuid,
  p_draft_data jsonb,
  p_public_data jsonb,
  p_approved_data jsonb,
  p_share_token text,
  p_expires_at timestamptz,
  p_template_id integer,
  p_theme_color text,
  p_sun_sign text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portfolio_record public.portfolios%rowtype;
  effective_token text;
  effective_expiry timestamptz;
  published_time timestamptz := pg_catalog.now();
  result_action text;
begin
  if auth.uid() is null then return '{"status":"unauthorized"}'::jsonb; end if;

  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.id = p_portfolio_id
    and public.can_manage_portfolio(portfolio.id)
  for update;
  if portfolio_record.id is null then return '{"status":"not_found"}'::jsonb; end if;

  effective_token := coalesce(portfolio_record.share_token, p_share_token);
  effective_expiry := coalesce(portfolio_record.expires_at, p_expires_at);
  if effective_token is null
    or pg_catalog.length(effective_token) <> 21
    or effective_token !~ '^[A-Za-z0-9_-]+$'
    or effective_expiry is null
  then
    raise exception 'invalid publication lifecycle values' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.portfolio_media media
    where media.portfolio_id = portfolio_record.id
      and media.media_type = 'hero'
      and media.visibility = 'public'
  ) then
    return '{"status":"not_ready"}'::jsonb;
  end if;

  result_action := case when portfolio_record.is_published then 'updated' else 'created' end;
  update public.portfolios
  set draft_data = p_draft_data,
      published_data = p_draft_data,
      is_published = true,
      published_at = published_time,
      sun_sign = p_sun_sign,
      theme_color = p_theme_color,
      template_id = p_template_id,
      share_token = effective_token,
      expires_at = effective_expiry
  where id = portfolio_record.id;

  insert into public.public_portfolio_snapshots (
    portfolio_id, share_token, data, template_id, theme_color, sun_sign,
    expires_at, published_at, is_active
  ) values (
    portfolio_record.id, effective_token, p_public_data, p_template_id,
    p_theme_color, p_sun_sign, effective_expiry, published_time, true
  ) on conflict (portfolio_id) do update set
    share_token = excluded.share_token,
    data = excluded.data,
    template_id = excluded.template_id,
    theme_color = excluded.theme_color,
    sun_sign = excluded.sun_sign,
    expires_at = excluded.expires_at,
    published_at = excluded.published_at,
    is_active = true;

  insert into public.approved_portfolio_snapshots (
    portfolio_id, data, template_id, theme_color, sun_sign, published_at
  ) values (
    portfolio_record.id, p_approved_data, p_template_id, p_theme_color,
    p_sun_sign, published_time
  ) on conflict (portfolio_id) do update set
    data = excluded.data,
    template_id = excluded.template_id,
    theme_color = excluded.theme_color,
    sun_sign = excluded.sun_sign,
    published_at = excluded.published_at;

  update public.portfolio_horoscopes
  set published_at = published_time
  where portfolio_id = portfolio_record.id;

  return pg_catalog.jsonb_build_object(
    'status', 'ok',
    'action', result_action,
    'shareToken', effective_token,
    'expiresAt', effective_expiry
  );
end;
$$;

create or replace function public.renew_portfolio_transaction(p_expires_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portfolio_record public.portfolios%rowtype;
  affected_rows integer;
begin
  if auth.uid() is null then return '{"status":"unauthorized"}'::jsonb; end if;
  if p_expires_at is null or p_expires_at <= pg_catalog.now() then
    raise exception 'invalid portfolio expiry' using errcode = '22023';
  end if;
  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.user_id = auth.uid()
  for update;
  if portfolio_record.id is null or not portfolio_record.is_published then
    return '{"status":"not_published"}'::jsonb;
  end if;

  update public.portfolios
  set expires_at = p_expires_at, last_renewed_at = pg_catalog.now()
  where id = portfolio_record.id;
  update public.public_portfolio_snapshots
  set expires_at = p_expires_at, is_active = true
  where portfolio_id = portfolio_record.id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'public snapshot missing' using errcode = 'P0001';
  end if;
  return pg_catalog.jsonb_build_object('status', 'renewed', 'expiresAt', p_expires_at);
end;
$$;

create or replace function public.rotate_portfolio_transaction(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portfolio_record public.portfolios%rowtype;
  grant_record public.reveal_grants%rowtype;
  affected_rows integer;
begin
  if auth.uid() is null then return '{"status":"unauthorized"}'::jsonb; end if;
  if p_share_token is null or pg_catalog.length(p_share_token) <> 21
    or p_share_token !~ '^[A-Za-z0-9_-]+$'
  then
    raise exception 'invalid share token' using errcode = '22023';
  end if;
  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.user_id = auth.uid()
  for update;
  if portfolio_record.id is null or not portfolio_record.is_published then
    return '{"status":"not_published"}'::jsonb;
  end if;

  update public.portfolios set share_token = p_share_token
  where id = portfolio_record.id;
  update public.public_portfolio_snapshots
  set share_token = p_share_token, is_active = true
  where portfolio_id = portfolio_record.id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'public snapshot missing' using errcode = 'P0001';
  end if;

  for grant_record in
    update public.reveal_grants
    set revoked_at = pg_catalog.now(), revocation_reason = 'portfolio_rotated'
    where portfolio_id = portfolio_record.id and revoked_at is null
    returning *
  loop
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id,
      subject_user_id, event_type, metadata
    ) values (
      portfolio_record.id, grant_record.interest_request_id, grant_record.id,
      auth.uid(), grant_record.viewer_user_id, 'grant_revoked',
      '{"reason":"portfolio_rotated"}'::jsonb
    );
  end loop;
  update public.interest_requests
  set status = 'closed', updated_at = pg_catalog.now()
  where portfolio_id = portfolio_record.id and status in ('approved', 'revealed');
  insert into public.access_audit_events (
    portfolio_id, actor_user_id, event_type
  ) values (portfolio_record.id, auth.uid(), 'portfolio_rotated');
  return pg_catalog.jsonb_build_object('status', 'rotated', 'shareToken', p_share_token);
end;
$$;

create or replace function public.unpublish_portfolio_transaction()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portfolio_record public.portfolios%rowtype;
  grant_record public.reveal_grants%rowtype;
  affected_rows integer;
begin
  if auth.uid() is null then return '{"status":"unauthorized"}'::jsonb; end if;
  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.user_id = auth.uid()
  for update;
  if portfolio_record.id is null then return '{"status":"not_found"}'::jsonb; end if;
  if not portfolio_record.is_published then return '{"status":"already_unpublished"}'::jsonb; end if;

  update public.portfolios set is_published = false
  where id = portfolio_record.id;
  update public.public_portfolio_snapshots set is_active = false
  where portfolio_id = portfolio_record.id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'public snapshot missing' using errcode = 'P0001';
  end if;

  for grant_record in
    update public.reveal_grants
    set revoked_at = pg_catalog.now(), revocation_reason = 'portfolio_unpublished'
    where portfolio_id = portfolio_record.id and revoked_at is null
    returning *
  loop
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id,
      subject_user_id, event_type, metadata
    ) values (
      portfolio_record.id, grant_record.interest_request_id, grant_record.id,
      auth.uid(), grant_record.viewer_user_id, 'grant_revoked',
      '{"reason":"portfolio_unpublished"}'::jsonb
    );
  end loop;
  update public.interest_requests
  set status = 'closed', updated_at = pg_catalog.now()
  where portfolio_id = portfolio_record.id and status in ('approved', 'revealed');
  insert into public.access_audit_events (
    portfolio_id, actor_user_id, event_type
  ) values (portfolio_record.id, auth.uid(), 'portfolio_unpublished');
  return '{"status":"unpublished"}'::jsonb;
end;
$$;

-- Family and timeline replacements share one transaction. Any invalid insert
-- rolls the preceding deletes back and preserves the last known-good records.
create or replace function public.replace_candidate_relationships_and_timeline(
  p_candidate_id uuid,
  p_family_members jsonb,
  p_education jsonb,
  p_career jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  member jsonb;
begin
  if auth.uid() is null then return 'unauthorized'; end if;
  if not exists (select 1 from public.candidates where id = p_candidate_id) then
    return 'not_found';
  end if;
  if not public.owns_candidate(p_candidate_id) then return 'unauthorized'; end if;
  perform 1 from public.candidates where id = p_candidate_id for update;

  if p_family_members is null or pg_catalog.jsonb_typeof(p_family_members) <> 'array'
    or pg_catalog.jsonb_array_length(p_family_members) > 12
    or (p_education is not null and pg_catalog.jsonb_typeof(p_education) <> 'object')
    or (p_career is not null and pg_catalog.jsonb_typeof(p_career) <> 'object')
  then
    raise exception 'invalid candidate replacement payload' using errcode = '22023';
  end if;

  delete from public.candidate_family_members where candidate_id = p_candidate_id;
  delete from public.candidate_education_entries where candidate_id = p_candidate_id;
  delete from public.candidate_career_entries where candidate_id = p_candidate_id;

  for member in select value from pg_catalog.jsonb_array_elements(p_family_members)
  loop
    if member ->> 'relationship' not in ('father', 'mother', 'sibling')
      or pg_catalog.length(coalesce(member ->> 'name', '')) > 180
      or pg_catalog.length(coalesce(member ->> 'occupation', '')) > 180
      or pg_catalog.length(coalesce(member ->> 'location', '')) > 180
      or pg_catalog.length(coalesce(member ->> 'marital_status', '')) > 80
    then
      raise exception 'invalid family member payload' using errcode = '22023';
    end if;
    insert into public.candidate_family_members (
      candidate_id, relationship, name, occupation, location, marital_status, sort_order
    ) values (
      p_candidate_id, member ->> 'relationship', nullif(member ->> 'name', ''),
      nullif(member ->> 'occupation', ''), nullif(member ->> 'location', ''),
      nullif(member ->> 'marital_status', ''),
      (select count(*) from public.candidate_family_members where candidate_id = p_candidate_id)
    );
  end loop;

  if p_education is not null then
    insert into public.candidate_education_entries (
      candidate_id, degree, qualification_level, institution, location, end_year, sort_order
    ) values (
      p_candidate_id, nullif(p_education ->> 'degree', ''),
      nullif(p_education ->> 'qualification_level', ''),
      nullif(p_education ->> 'institution', ''), nullif(p_education ->> 'location', ''),
      nullif(p_education ->> 'end_year', '')::integer,
      coalesce(nullif(p_education ->> 'sort_order', '')::integer, 0)
    );
  end if;

  if p_career is not null then
    insert into public.candidate_career_entries (
      candidate_id, title, company, industry, job_type, annual_income,
      income_currency, wealth_stage, career_goals, location, is_current, sort_order
    ) values (
      p_candidate_id, nullif(p_career ->> 'title', ''), nullif(p_career ->> 'company', ''),
      nullif(p_career ->> 'industry', ''), nullif(p_career ->> 'job_type', ''),
      nullif(p_career ->> 'annual_income', ''), nullif(p_career ->> 'income_currency', ''),
      nullif(p_career ->> 'wealth_stage', ''), nullif(p_career ->> 'career_goals', ''),
      nullif(p_career ->> 'location', ''), coalesce((p_career ->> 'is_current')::boolean, true),
      coalesce(nullif(p_career ->> 'sort_order', '')::integer, 0)
    );
  end if;
  return 'updated';
end;
$$;

create or replace function public.list_portfolio_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'grants', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', grant_record.id,
        'interestRequestId', grant_record.interest_request_id,
        'viewerName', request_record.viewer_name,
        'status', case
          when grant_record.revoked_at is not null then 'revoked'
          when grant_record.expires_at <= pg_catalog.now() then 'expired'
          else 'active'
        end,
        'expiresAt', grant_record.expires_at,
        'renewedAt', grant_record.renewed_at,
        'revokedAt', grant_record.revoked_at,
        'lastAccessedAt', grant_record.last_accessed_at
      ) order by grant_record.created_at desc)
      from lateral (
        select * from public.reveal_grants
        where portfolio_id = portfolio.id
        order by created_at desc
        limit 50
      ) grant_record
      join public.interest_requests request_record on request_record.id = grant_record.interest_request_id
    ), '[]'::jsonb),
    'events', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', event_record.id,
        'eventType', event_record.event_type,
        'viewerName', request_record.viewer_name,
        'createdAt', event_record.created_at,
        'metadata', event_record.metadata
      ) order by event_record.created_at desc)
      from lateral (
        select * from public.access_audit_events
        where portfolio_id = portfolio.id
        order by created_at desc
        limit 50
      ) event_record
      left join public.interest_requests request_record on request_record.id = event_record.interest_request_id
    ), '[]'::jsonb)
  )
  from public.portfolios portfolio
  where portfolio.user_id = auth.uid()
  limit 1;
$$;

-- Approved reads log use and observe the same non-null expiry contract used by
-- RLS and Storage. Expiry is recorded once when first observed.
create or replace function public.resolve_approved_portfolio(p_share_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  grant_record public.reveal_grants%rowtype;
  result jsonb;
begin
  if auth.uid() is null then return null; end if;
  select grant_row.* into grant_record
  from public.public_portfolio_snapshots snapshot
  join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
  join public.reveal_grants grant_row on grant_row.portfolio_id = portfolio.id
  where snapshot.share_token = p_share_token
    and snapshot.is_active = true
    and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
    and portfolio.share_token = snapshot.share_token
    and portfolio.is_published = true
    and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    and grant_row.viewer_user_id = auth.uid()
    and grant_row.access_level = 'full'
    and grant_row.revoked_at is null
  order by grant_row.created_at desc
  limit 1;
  if grant_record.id is null then return null; end if;
  if grant_record.expires_at <= pg_catalog.now() then
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, subject_user_id, event_type
    ) values (
      grant_record.portfolio_id, grant_record.interest_request_id,
      grant_record.id, grant_record.viewer_user_id, 'grant_expired'
    ) on conflict (grant_id, event_type) where grant_id is not null and event_type = 'grant_expired'
      do nothing;
    return null;
  end if;

  select pg_catalog.jsonb_build_object(
    'data', approved.data,
    'templateId', approved.template_id,
    'themeColor', approved.theme_color,
    'sunSign', approved.sun_sign,
    'horoscope', (
      select pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'fileExtension', horoscope.file_extension,
        'languageLabel', horoscope.language_label,
        'pageCount', horoscope.page_count
      )) from public.portfolio_horoscopes horoscope
      where horoscope.portfolio_id = portfolio.id and horoscope.published_at is not null
      limit 1
    ),
    'media', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
          'key', pg_catalog.substr(pg_catalog.md5(media.storage_path), 1, 24),
          'accessPath', media.storage_path,
          'altText', media.alt_text,
          'mediaType', media.media_type::text,
          'sortOrder', media.sort_order,
          'width', media.metadata -> 'width',
          'height', media.metadata -> 'height',
          'aspectRatio', media.metadata -> 'aspectRatio',
          'orientation', media.metadata ->> 'orientation',
          'presentation', 'clear'
        )) order by (media.media_type = 'hero') desc, media.sort_order, media.storage_path
      ) from public.portfolio_media media
      where media.portfolio_id = portfolio.id
        and media.media_type in ('hero', 'gallery')
        and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only')
    ), '[]'::jsonb)
  ) into result
  from public.portfolios portfolio
  join public.approved_portfolio_snapshots approved on approved.portfolio_id = portfolio.id
  where portfolio.id = grant_record.portfolio_id;

  update public.reveal_grants set last_accessed_at = pg_catalog.now()
  where id = grant_record.id;
  if not exists (
    select 1 from public.access_audit_events event_record
    where event_record.grant_id = grant_record.id
      and event_record.event_type = 'grant_accessed'
      and event_record.created_at > pg_catalog.now() - interval '1 hour'
  ) then
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id, subject_user_id, event_type
    ) values (
      grant_record.portfolio_id, grant_record.interest_request_id, grant_record.id,
      auth.uid(), grant_record.viewer_user_id, 'grant_accessed'
    );
  end if;
  return result;
end;
$$;

create or replace function public.resolve_approved_horoscope(p_share_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  grant_record public.reveal_grants%rowtype;
  result jsonb;
begin
  if auth.uid() is null then return null; end if;
  select grant_row.* into grant_record
  from public.public_portfolio_snapshots snapshot
  join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
  join public.reveal_grants grant_row on grant_row.portfolio_id = portfolio.id
  where snapshot.share_token = p_share_token
    and snapshot.is_active = true
    and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
    and portfolio.share_token = snapshot.share_token
    and portfolio.is_published = true
    and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    and grant_row.viewer_user_id = auth.uid()
    and grant_row.access_level = 'full'
    and grant_row.revoked_at is null
  order by grant_row.created_at desc
  limit 1;
  if grant_record.id is null or grant_record.expires_at <= pg_catalog.now() then
    return null;
  end if;

  select pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'accessPath', horoscope.storage_path,
    'mimeType', horoscope.mime_type,
    'fileExtension', horoscope.file_extension,
    'languageLabel', horoscope.language_label,
    'pageCount', horoscope.page_count,
    'profileName', approved.data #>> '{personal,name}'
  )) into result
  from public.approved_portfolio_snapshots approved
  join public.portfolio_horoscopes horoscope on horoscope.portfolio_id = approved.portfolio_id
  where approved.portfolio_id = grant_record.portfolio_id
    and horoscope.published_at is not null;
  if result is null then return null; end if;

  update public.reveal_grants set last_accessed_at = pg_catalog.now()
  where id = grant_record.id;
  if not exists (
    select 1 from public.access_audit_events event_record
    where event_record.grant_id = grant_record.id
      and event_record.event_type = 'grant_accessed'
      and event_record.created_at > pg_catalog.now() - interval '1 hour'
  ) then
    insert into public.access_audit_events (
      portfolio_id, interest_request_id, grant_id, actor_user_id, subject_user_id, event_type
    ) values (
      grant_record.portfolio_id, grant_record.interest_request_id, grant_record.id,
      auth.uid(), grant_record.viewer_user_id, 'grant_accessed'
    );
  end if;
  return result;
end;
$$;

revoke all on function public.submit_public_interest(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.decide_interest_request(uuid, text) from public, anon, authenticated;
revoke all on function public.manage_reveal_grant(uuid, text) from public, anon, authenticated;
revoke all on function public.publish_portfolio_transaction(uuid, jsonb, jsonb, jsonb, text, timestamptz, integer, text, text) from public, anon, authenticated;
revoke all on function public.renew_portfolio_transaction(timestamptz) from public, anon, authenticated;
revoke all on function public.rotate_portfolio_transaction(text) from public, anon, authenticated;
revoke all on function public.unpublish_portfolio_transaction() from public, anon, authenticated;
revoke all on function public.replace_candidate_relationships_and_timeline(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.list_portfolio_access() from public, anon, authenticated;
revoke all on function public.resolve_approved_portfolio(text) from public, anon, authenticated;
revoke all on function public.resolve_approved_horoscope(text) from public, anon, authenticated;

grant execute on function public.submit_public_interest(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.decide_interest_request(uuid, text) to authenticated;
grant execute on function public.manage_reveal_grant(uuid, text) to authenticated;
grant execute on function public.publish_portfolio_transaction(uuid, jsonb, jsonb, jsonb, text, timestamptz, integer, text, text) to authenticated;
grant execute on function public.renew_portfolio_transaction(timestamptz) to authenticated;
grant execute on function public.rotate_portfolio_transaction(text) to authenticated;
grant execute on function public.unpublish_portfolio_transaction() to authenticated;
grant execute on function public.replace_candidate_relationships_and_timeline(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.list_portfolio_access() to authenticated;
grant execute on function public.resolve_approved_portfolio(text) to authenticated;
grant execute on function public.resolve_approved_horoscope(text) to authenticated;

comment on table public.access_audit_events is
  'Immutable, non-sensitive history of identity-bound portfolio access decisions and use.';
comment on column public.reveal_grants.expires_at is
  'Required Full View expiry. New approvals last 30 days and owner renewal extends by 30 days.';
