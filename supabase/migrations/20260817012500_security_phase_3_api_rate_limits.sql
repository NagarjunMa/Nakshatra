-- Phase 3: database-backed application rate limits and short-lived private capabilities.

-- Only server-sanitized WebP outputs may enter the private application buckets.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/webp']::text[]
where id = 'photos';

update storage.buckets
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/webp']::text[]
where id = 'horoscopes';

create table if not exists app_private.api_rate_limits (
  action text not null check (pg_catalog.char_length(action) between 1 and 64),
  subject_key text not null check (pg_catalog.char_length(subject_key) between 6 and 80),
  window_started_at timestamptz not null default pg_catalog.now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (action, subject_key)
);

revoke all on table app_private.api_rate_limits from public, anon, authenticated;

create index if not exists idx_api_rate_limits_updated_at
  on app_private.api_rate_limits(updated_at);

create or replace function public.consume_api_rate_limit(
  p_action text,
  p_subject_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_limit integer;
  window_seconds integer;
  effective_subject text;
  limit_record app_private.api_rate_limits%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  select configured.limit_value, configured.window_value
    into action_limit, window_seconds
  from (values
    ('auth_google', 10, 900),
    ('auth_email', 5, 900),
    ('interest_submit', 5, 3600),
    ('interest_decision', 30, 60),
    ('grant_manage', 30, 60),
    ('dashboard_save', 30, 300),
    ('photo_upload', 12, 3600),
    ('photo_mutation', 30, 300),
    ('horoscope_upload', 6, 3600),
    ('horoscope_delete', 10, 300),
    ('portfolio_publish', 6, 3600),
    ('portfolio_renew', 6, 3600),
    ('portfolio_rotate', 6, 3600),
    ('portfolio_unpublish', 6, 3600),
    ('horoscope_view', 30, 300),
    ('location_search', 120, 60)
  ) as configured(action_name, limit_value, window_value)
  where configured.action_name = p_action;

  if action_limit is null then
    raise exception 'unsupported rate limit action' using errcode = '22023';
  end if;

  if auth.uid() is not null then
    effective_subject := 'user:' || auth.uid()::text;
  elsif p_subject_hash is not null and p_subject_hash ~ '^[a-f0-9]{64}$' then
    effective_subject := 'anonymous:' || p_subject_hash;
  else
    return '{"allowed":false,"retryAfter":60}'::jsonb;
  end if;

  insert into app_private.api_rate_limits (
    action, subject_key, window_started_at, request_count, updated_at
  ) values (
    p_action, effective_subject, v_now, 1, v_now
  )
  on conflict (action, subject_key) do update set
    window_started_at = case
      when app_private.api_rate_limits.window_started_at
        <= v_now - pg_catalog.make_interval(secs => window_seconds)
      then v_now
      else app_private.api_rate_limits.window_started_at
    end,
    request_count = case
      when app_private.api_rate_limits.window_started_at
        <= v_now - pg_catalog.make_interval(secs => window_seconds)
      then 1
      else app_private.api_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning * into limit_record;

  return pg_catalog.jsonb_build_object(
    'allowed', limit_record.request_count <= action_limit,
    'retryAfter', case
      when limit_record.request_count <= action_limit then 0
      else greatest(
        1,
        pg_catalog.ceil(
          extract(epoch from (
            limit_record.window_started_at
              + pg_catalog.make_interval(secs => window_seconds)
              - v_now
          ))
        )::integer
      )
    end
  );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text) to anon, authenticated;

comment on table app_private.api_rate_limits is
  'Hashed, bounded application quotas. Raw IP addresses and request payloads are never stored.';

-- Approved media capabilities must not remain valid longer than the grant that authorized them.
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
    'accessExpiresAt', grant_record.expires_at,
    'horoscope', (
      select pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'fileExtension', horoscope.file_extension,
        'languageLabel', horoscope.language_label,
        'pageCount', horoscope.page_count
      )) from public.portfolio_horoscopes horoscope
      where horoscope.portfolio_id = portfolio.id
        and horoscope.published_at is not null
        and horoscope.file_extension = 'webp'
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

  select pg_catalog.jsonb_build_object(
    'accessPath', horoscope.storage_path,
    'mimeType', horoscope.mime_type,
    'fileExtension', horoscope.file_extension,
    'languageLabel', horoscope.language_label,
    'pageCount', horoscope.page_count,
    'profileName', approved.data #>> '{personal,name}',
    'accessExpiresAt', grant_record.expires_at
  ) into result
  from public.approved_portfolio_snapshots approved
  join public.portfolio_horoscopes horoscope on horoscope.portfolio_id = approved.portfolio_id
  where approved.portfolio_id = grant_record.portfolio_id
    and horoscope.published_at is not null
    and horoscope.file_extension = 'webp'
  limit 1;

  if result is not null then
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
  end if;
  return result;
end;
$$;

revoke all on function public.resolve_approved_portfolio(text) from public, anon, authenticated;
revoke all on function public.resolve_approved_horoscope(text) from public, anon, authenticated;
grant execute on function public.resolve_approved_portfolio(text) to authenticated;
grant execute on function public.resolve_approved_horoscope(text) to authenticated;
