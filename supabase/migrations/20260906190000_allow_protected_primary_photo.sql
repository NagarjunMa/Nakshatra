-- A primary photo may be presented clearly or through its generated protected
-- preview. Owner-only and hidden media still cannot satisfy publish readiness.
create or replace function app_private.enforce_publication_media_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shareable_primary_count integer;
begin
  if new.is_published = true and tg_op = 'INSERT' then
    select pg_catalog.count(*) into shareable_primary_count
    from public.portfolio_media media
    where media.portfolio_id = new.id
      and media.media_type = 'hero'
      and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only');
  elsif new.is_published = true and old.is_published is distinct from true then
    select pg_catalog.count(*) into shareable_primary_count
    from public.portfolio_media media
    where media.portfolio_id = new.id
      and media.media_type = 'hero'
      and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only');
  else
    return new;
  end if;

  if shareable_primary_count <> 1 then
    raise exception 'publishing requires exactly one shareable primary photo' using errcode = '23514';
  end if;
  return new;
end;
$$;

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
    'status', 'ok',
    'action', result_action,
    'shareToken', effective_token,
    'expiresAt', effective_expiry
  );
end;
$$;

revoke all on function app_private.enforce_publication_media_contract() from public, anon, authenticated;
revoke all on function app_private.publish_portfolio_transaction(uuid, jsonb, jsonb, jsonb, text, timestamptz, integer, text, text) from public, anon, authenticated;

comment on function app_private.enforce_publication_media_contract() is
  'Requires exactly one clear or protected primary photo before publication.';
