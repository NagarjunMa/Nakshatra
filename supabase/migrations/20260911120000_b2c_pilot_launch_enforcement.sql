-- B2C pilot launch policy: invited creators, current identity verification,
-- 30-day public links, seven-day Full View grants, and non-destructive unpublish.

create table app_private.b2c_creator_entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  email_hash text not null unique check (email_hash ~ '^[a-f0-9]{64}$'),
  granted_at timestamptz not null default pg_catalog.now(),
  granted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check ((revoked_at is null and revoked_by is null) or revoked_at is not null)
);

comment on table app_private.b2c_creator_entitlements is
  'Hashed-email allowlist for direct B2C portfolio creators during the private pilot.';

revoke all on table app_private.b2c_creator_entitlements from public, anon, authenticated;
grant select, insert, update, delete on table app_private.b2c_creator_entitlements to service_role;

create function app_private.normalized_email_hash(p_email text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_email is null or pg_catalog.length(pg_catalog.btrim(p_email)) not between 3 and 180
      then null
    else pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(pg_catalog.lower(pg_catalog.btrim(p_email)), 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  end
$$;

create function app_private.actor_has_broker_customer_path(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor_id is not null and exists (
    select 1
    from app_private.broker_client_intakes intake
    where intake.claimed_by = p_actor_id
      and intake.claimed_at is not null
      and intake.consented_at is not null
      and intake.revoked_at is null
      and intake.consented_at + interval '1 year' > pg_catalog.now()
  )
$$;

create function app_private.actor_can_create_portfolio(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor_id is not null and (
    exists (
      select 1
      from auth.users account
      join app_private.b2c_creator_entitlements entitlement
        on entitlement.email_hash = app_private.normalized_email_hash(account.email)
      where account.id = p_actor_id
        and account.email_confirmed_at is not null
        and entitlement.revoked_at is null
    )
    or app_private.actor_has_broker_customer_path(p_actor_id)
  )
$$;

create function public.current_user_can_create_portfolio()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.actor_can_create_portfolio(auth.uid());
end;
$$;

create function public.manage_b2c_creator_entitlement(p_email text, p_action text default 'grant')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  selected_hash text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_action not in ('grant', 'revoke') then
    raise exception 'invalid entitlement action' using errcode = '22023';
  end if;
  selected_hash := app_private.normalized_email_hash(p_email);
  if selected_hash is null or pg_catalog.strpos(pg_catalog.btrim(p_email), '@') <= 1 then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  if p_action = 'grant' then
    insert into app_private.b2c_creator_entitlements (
      email_hash, granted_at, granted_by, revoked_at, revoked_by, updated_at
    ) values (
      selected_hash, pg_catalog.now(), actor_id, null, null, pg_catalog.now()
    ) on conflict (email_hash) do update set
      granted_at = excluded.granted_at,
      granted_by = excluded.granted_by,
      revoked_at = null,
      revoked_by = null,
      updated_at = pg_catalog.now();
  else
    update app_private.b2c_creator_entitlements
    set revoked_at = pg_catalog.now(), revoked_by = actor_id,
        updated_at = pg_catalog.now()
    where email_hash = selected_hash and revoked_at is null;
  end if;

  return pg_catalog.jsonb_build_object('status', case when p_action = 'grant' then 'granted' else 'revoked' end);
end;
$$;

revoke all on function app_private.normalized_email_hash(text) from public, anon, authenticated;
revoke all on function app_private.actor_has_broker_customer_path(uuid) from public, anon, authenticated;
revoke all on function app_private.actor_can_create_portfolio(uuid) from public, anon, authenticated;
revoke all on function public.current_user_can_create_portfolio() from public, anon;
grant execute on function public.current_user_can_create_portfolio() to authenticated;
revoke all on function public.manage_b2c_creator_entitlement(text, text) from public, anon, authenticated;
grant execute on function public.manage_b2c_creator_entitlement(text, text) to service_role;

create function app_private.enforce_b2c_creator_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  protected_transition boolean;
begin
  protected_transition := tg_op = 'INSERT'
    or (tg_op = 'UPDATE' and new.draft_data is distinct from old.draft_data)
    or (tg_op = 'UPDATE' and new.is_published = true and old.is_published is distinct from true);

  if protected_transition
    and actor_id is not null
    and new.user_id = actor_id
    and not app_private.actor_can_create_portfolio(actor_id)
  then
    raise exception 'pilot creator entitlement required' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger enforce_b2c_creator_entitlement
  before insert or update of draft_data, is_published on public.portfolios
  for each row execute function app_private.enforce_b2c_creator_entitlement();

revoke all on function app_private.enforce_b2c_creator_entitlement() from public, anon, authenticated;

-- Return a safe entitlement status before entering the large atomic draft writer.
create or replace function public.save_dashboard_draft_transaction(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  if not app_private.actor_can_create_portfolio(auth.uid()) then
    return '{"status":"creator_entitlement_required"}'::jsonb;
  end if;
  return app_private.save_dashboard_draft_transaction(p_payload);
end;
$$;

-- Publication is authoritative at the database boundary. Active publications
-- keep their current window; first publication, republish, and expired links
-- receive a fresh 30-day window. Current Didit verification is required on
-- every publication transaction and again by the transition trigger below.
create or replace function app_private.publish_portfolio_transaction(
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
  actor_id uuid := auth.uid();
  portfolio_record public.portfolios%rowtype;
  effective_token text;
  effective_expiry timestamptz;
  published_time timestamptz := pg_catalog.now();
  result_action text;
begin
  if actor_id is null then return '{"status":"unauthorized"}'::jsonb; end if;
  if not app_private.actor_can_create_portfolio(actor_id) then
    return '{"status":"creator_entitlement_required"}'::jsonb;
  end if;

  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.id = p_portfolio_id
    and public.can_manage_portfolio(portfolio.id)
  for update;
  if portfolio_record.id is null then return '{"status":"not_found"}'::jsonb; end if;

  if not exists (
    select 1 from app_private.current_identity_verification(portfolio_record.candidate_id)
  ) then
    return '{"status":"verification_required"}'::jsonb;
  end if;

  effective_token := coalesce(portfolio_record.share_token, p_share_token);
  effective_expiry := case
    when portfolio_record.is_published
      and portfolio_record.expires_at is not null
      and portfolio_record.expires_at > published_time
      then portfolio_record.expires_at
    else published_time + interval '30 days'
  end;
  if effective_token is null
    or pg_catalog.length(effective_token) <> 21
    or effective_token !~ '^[A-Za-z0-9_-]+$'
  then
    raise exception 'invalid publication lifecycle values' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.portfolio_media media
    where media.portfolio_id = portfolio_record.id
      and media.media_type = 'hero'
      and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only')
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
    'status', 'ok', 'action', result_action, 'shareToken', effective_token,
    'expiresAt', effective_expiry
  );
end;
$$;

create or replace function app_private.renew_portfolio_transaction(p_expires_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portfolio_record public.portfolios%rowtype;
  effective_expiry timestamptz := pg_catalog.now() + interval '30 days';
  affected_rows integer;
begin
  if auth.uid() is null then return '{"status":"unauthorized"}'::jsonb; end if;
  if not app_private.actor_can_create_portfolio(auth.uid()) then
    return '{"status":"creator_entitlement_required"}'::jsonb;
  end if;
  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.user_id = auth.uid()
  for update;
  if portfolio_record.id is null or not portfolio_record.is_published then
    return '{"status":"not_published"}'::jsonb;
  end if;

  update public.portfolios
  set expires_at = effective_expiry, last_renewed_at = pg_catalog.now()
  where id = portfolio_record.id;
  update public.public_portfolio_snapshots
  set expires_at = effective_expiry, is_active = true
  where portfolio_id = portfolio_record.id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'public snapshot missing' using errcode = 'P0001';
  end if;
  return pg_catalog.jsonb_build_object('status', 'renewed', 'expiresAt', effective_expiry);
end;
$$;

-- Unpublishing suspends resolution only. Interest, grants, counters, and audit
-- history remain intact for owner review and a later verified republish.
create or replace function app_private.unpublish_portfolio_transaction()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portfolio_record public.portfolios%rowtype;
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
  insert into public.access_audit_events (
    portfolio_id, actor_user_id, event_type, metadata
  ) values (
    portfolio_record.id, auth.uid(), 'portfolio_unpublished',
    '{"preserved_interests":true,"preserved_grants":true}'::jsonb
  );
  return '{"status":"unpublished"}'::jsonb;
end;
$$;

-- Defense in depth for direct writes outside the publication RPC.
create or replace function app_private.enforce_identity_verification_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_published = true
    and (tg_op = 'INSERT' or old.is_published is distinct from true)
    and not exists (
      select 1 from app_private.current_identity_verification(new.candidate_id)
    )
  then
    raise exception 'current candidate identity verification required' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Normalize existing pilot windows and make seven days the invariant for every
-- Full View grant, including direct inserts outside the owner decision RPC.
update public.portfolios
set expires_at = least(
  coalesce(expires_at, pg_catalog.now() + interval '30 days'),
  pg_catalog.now() + interval '30 days'
)
where is_published = true;

update public.public_portfolio_snapshots snapshot
set expires_at = portfolio.expires_at
from public.portfolios portfolio
where portfolio.id = snapshot.portfolio_id and portfolio.is_published = true;

alter table public.reveal_grants
  alter column expires_at set default (pg_catalog.now() + interval '7 days');

update public.reveal_grants
set expires_at = least(expires_at, pg_catalog.now() + interval '7 days')
where revoked_at is null and expires_at > pg_catalog.now() + interval '7 days';

-- Own the grant-creation and grant-renewal clocks in this migration as well as
-- enforcing them with the trigger below. This prevents a future environment
-- from retaining the historical 30-day implementations while adopting only
-- the new table invariant.
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
  where grant_row.id = p_grant_id
    and public.can_manage_portfolio(grant_row.portfolio_id)
  for update;
  if grant_record.id is null then return '{"status":"not_found"}'::jsonb; end if;

  if p_action = 'revoke' then
    if grant_record.revoked_at is not null then return '{"status":"already_revoked"}'::jsonb; end if;
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

revoke all on function app_private.decide_interest_request(uuid, text) from public, anon, authenticated;
revoke all on function app_private.manage_reveal_grant(uuid, text) from public, anon, authenticated;

create function app_private.enforce_full_view_lifetime()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_start timestamptz := coalesce(new.renewed_at, new.created_at, pg_catalog.now());
begin
  if new.expires_at is null or new.expires_at > window_start + interval '7 days' then
    raise exception 'full view grants cannot exceed seven days' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enforce_full_view_lifetime
  before insert or update of expires_at, renewed_at on public.reveal_grants
  for each row execute function app_private.enforce_full_view_lifetime();

revoke all on function app_private.enforce_full_view_lifetime() from public, anon, authenticated;

-- The active resolver remains deliberately opaque. This companion exposes only
-- whether the exact canonical, still-published token expired.
create function public.resolve_public_portfolio_status(p_share_token text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_share_token is null
      or pg_catalog.length(p_share_token) not between 8 and 160
      or p_share_token !~ '^[A-Za-z0-9_-]+$'
      then 'unavailable'
    when exists (
      select 1
      from public.public_portfolio_snapshots snapshot
      join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
      where snapshot.share_token = p_share_token
        and portfolio.share_token = p_share_token
        and snapshot.is_active = true
        and portfolio.is_published = true
        and (snapshot.expires_at <= pg_catalog.now() or portfolio.expires_at <= pg_catalog.now())
    ) then 'expired'
    else 'unavailable'
  end
$$;

revoke all on function public.resolve_public_portfolio_status(text) from public;
grant execute on function public.resolve_public_portfolio_status(text) to anon, authenticated;

revoke all on function app_private.publish_portfolio_transaction(uuid, jsonb, jsonb, jsonb, text, timestamptz, integer, text, text) from public, anon, authenticated;
revoke all on function app_private.renew_portfolio_transaction(timestamptz) from public, anon, authenticated;
revoke all on function app_private.unpublish_portfolio_transaction() from public, anon, authenticated;

comment on function public.current_user_can_create_portfolio() is
  'True only for a confirmed, allowlisted B2C creator or an active BrokerDesk customer intake participant.';
comment on function public.manage_b2c_creator_entitlement(text, text) is
  'Service-role-only pilot allowlist operation. The normalized email is stored only as a SHA-256 hash.';
comment on function public.resolve_public_portfolio_status(text) is
  'Returns expired only for an exact canonical published link; all other unavailable tokens are indistinguishable.';
