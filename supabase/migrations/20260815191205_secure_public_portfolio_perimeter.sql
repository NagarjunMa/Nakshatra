-- Phase 1: make public portfolios token-scoped and non-enumerable.
-- Public callers receive only a sanitized snapshot and safe media derivatives.

-- Remove direct anonymous/authenticated discovery paths. Owner and approved-viewer
-- policies remain in place for authenticated dashboard operations.
drop policy if exists "Public can read active sanitized portfolio snapshots"
  on public.public_portfolio_snapshots;
drop policy if exists "Public can read published public or blurred sections"
  on public.portfolio_sections;
drop policy if exists "Public can read published public media"
  on public.portfolio_media;
drop policy if exists "Public can read published protected media descriptors"
  on public.portfolio_media;
drop policy if exists "Public can resolve active portfolio links"
  on public.portfolio_links;

revoke select on public.public_portfolio_snapshots from anon;
revoke select on public.portfolio_sections from anon;
revoke select on public.portfolio_media from anon;
revoke select on public.portfolio_links from anon;

-- Public writes are accepted only through the constrained functions below.
drop policy if exists "Anyone can record a view" on public.portfolio_views;
drop policy if exists "Anyone can create viewer sessions" on public.viewer_sessions;
drop policy if exists "Anyone can create portfolio events" on public.portfolio_events;
drop policy if exists "Anyone can express interest" on public.interest_requests;

revoke insert on public.portfolio_views from anon, authenticated;
revoke insert on public.viewer_sessions from anon, authenticated;
revoke insert on public.portfolio_events from anon, authenticated;
revoke insert on public.interest_requests from anon, authenticated;
revoke update, delete on public.interest_requests from authenticated;
revoke insert, update, delete on public.reveal_grants from authenticated;

-- Explicit Data API privileges complement RLS. Public workflow tables are
-- read-only to authenticated callers; all state changes use constrained RPCs.
grant select on public.portfolio_views to authenticated;
grant select on public.interest_requests to authenticated;
grant select on public.reveal_grants to authenticated;
grant select, insert, update, delete on public.portfolio_media to authenticated;
grant select, insert, update, delete on public.approved_portfolio_snapshots to authenticated;
grant select, insert, update, delete on public.portfolio_horoscopes to authenticated;

-- The old UUID-based view function let callers submit arbitrary portfolio IDs.
drop function if exists public.record_view(uuid);

-- RLS helpers run with an empty search path and fully qualified references.
create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.has_organization_role(
  p_organization_id uuid,
  p_roles public.organization_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role = any(p_roles)
  );
$$;

create or replace function public.owns_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = p_candidate_id
      and (
        c.primary_owner_user_id = auth.uid()
        or c.created_by = auth.uid()
        or (
          c.current_organization_id is not null
          and public.is_organization_member(c.current_organization_id)
        )
      )
  );
$$;

create or replace function public.can_manage_portfolio(p_portfolio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolios p
    where p.id = p_portfolio_id
      and (
        p.user_id = auth.uid()
        or (p.candidate_id is not null and public.owns_candidate(p.candidate_id))
        or (
          p.owner_organization_id is not null
          and public.is_organization_member(p.owner_organization_id)
        )
      )
  );
$$;

create or replace function public.is_published_portfolio(p_portfolio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolios p
    where p.id = p_portfolio_id
      and p.is_published = true
      and p.share_token is not null
      and (p.expires_at is null or p.expires_at > pg_catalog.now())
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.has_organization_role(uuid, public.organization_member_role[]) from public;
revoke all on function public.owns_candidate(uuid) from public;
revoke all on function public.can_manage_portfolio(uuid) from public;
revoke all on function public.is_published_portfolio(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.organization_member_role[]) to authenticated;
grant execute on function public.owns_candidate(uuid) to authenticated;
grant execute on function public.can_manage_portfolio(uuid) to authenticated;
grant execute on function public.is_published_portfolio(uuid) to anon, authenticated;

-- The previous snapshot helper existed only for a direct table-read policy.
drop function if exists app_private.is_current_public_snapshot(uuid, text);
revoke usage on schema app_private from anon, authenticated;

-- Remove fields permitted by the earliest backfill but forbidden by the
-- current public contract. Future writes are guarded by the trigger below.
update public.public_portfolio_snapshots
set data = data
  - 'contact'
  - 'access'
  #- '{personal,dob}'
  #- '{personal,place_of_birth}'
  #- '{personal,photo_url}'
  #- '{personal,photo_thumb_url}'
  #- '{personal,country_code}'
  #- '{personal,region_code}'
  #- '{personal,city_geoname_id}'
  #- '{vitals,complexion}'
  #- '{astrology,time_of_birth}'
  #- '{astrology,lagnam}'
  #- '{career,company}'
  #- '{career,annual_income}'
  #- '{career,income_currency}'
  #- '{career,wealth_stage}'
  #- '{family,father}'
  #- '{family,mother}'
  #- '{family,siblings}'
  #- '{family,family_note}'
  #- '{family,parents_location}'
  #- '{lifestyle,credit_score_band}'
  #- '{preferences,private_notes}';

create or replace function app_private.public_snapshot_has_forbidden_key(p_data jsonb)
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
      'contacts', 'phone', 'email', 'secure_note',
      'photo_url', 'photo_thumb_url', 'storage_path', 'thumbnail_path',
      'public_url', 'blurPath', 'accessPath',
      'dob', 'time_of_birth', 'place_of_birth', 'birth_place', 'lagnam',
      'father', 'mother', 'siblings', 'family_note', 'parents_location',
      'annual_income', 'income_currency', 'wealth_stage', 'credit_score_band',
      'private_notes', 'country_code', 'region_code', 'city_geoname_id',
      'current_country_code', 'current_region_code', 'current_city_geoname_id',
      'portfolio_id', 'candidate_id', 'user_id'
    ]::text[])
  );
$$;

create or replace function app_private.enforce_public_snapshot_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.data ? 'contact' or app_private.public_snapshot_has_forbidden_key(new.data) then
    raise exception 'public snapshot contains a restricted field' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function app_private.public_snapshot_has_forbidden_key(jsonb) from public;
revoke all on function app_private.enforce_public_snapshot_contract() from public;

drop trigger if exists enforce_public_snapshot_contract on public.public_portfolio_snapshots;
create trigger enforce_public_snapshot_contract
  before insert or update of data on public.public_portfolio_snapshots
  for each row execute function app_private.enforce_public_snapshot_contract();

-- Resolve exactly one active portfolio. No portfolio UUID, media-row UUID,
-- private original path, thumbnail path, or horoscope descriptor is returned.
create or replace function public.resolve_public_portfolio(p_share_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'data', snapshot.data,
    'templateId', snapshot.template_id,
    'themeColor', snapshot.theme_color,
    'sunSign', snapshot.sun_sign,
    'media', coalesce(media.items, '[]'::jsonb)
  )
  from public.public_portfolio_snapshots snapshot
  join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
  left join lateral (
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'key', pg_catalog.substr(pg_catalog.md5(ranked.storage_path), 1, 24),
        'accessPath', ranked.access_path,
        'altText', ranked.alt_text,
        'mediaType', ranked.media_type::text,
        'sortOrder', ranked.sort_order,
        'width', ranked.metadata -> 'width',
        'height', ranked.metadata -> 'height',
        'aspectRatio', ranked.metadata -> 'aspectRatio',
        'orientation', ranked.metadata ->> 'orientation',
        'presentation', ranked.presentation
      )) order by (ranked.media_type = 'hero') desc, ranked.sort_order, ranked.storage_path
    ) as items
    from (
      select
        media.*,
        case
          when media.visibility = 'public'
            and not (
              snapshot.data ->> 'privacy_mode' = 'private'
              and media.media_type = 'gallery'
              and pg_catalog.row_number() over (
                partition by media.portfolio_id, media.media_type, media.visibility
                order by media.sort_order, media.created_at, media.id
              ) > 1
            )
            then media.storage_path
          else media.metadata ->> 'blurPath'
        end as access_path,
        case
          when media.visibility = 'public'
            and not (
              snapshot.data ->> 'privacy_mode' = 'private'
              and media.media_type = 'gallery'
              and pg_catalog.row_number() over (
                partition by media.portfolio_id, media.media_type, media.visibility
                order by media.sort_order, media.created_at, media.id
              ) > 1
            )
            then 'clear'
          else 'blurred'
        end as presentation
      from public.portfolio_media media
      where media.portfolio_id = snapshot.portfolio_id
        and media.media_type in ('hero', 'gallery')
        and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only')
    ) ranked
    where ranked.access_path is not null
  ) media on true
  where p_share_token is not null
    and pg_catalog.length(p_share_token) between 8 and 160
    and p_share_token ~ '^[A-Za-z0-9_-]+$'
    and snapshot.share_token = p_share_token
    and snapshot.is_active = true
    and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
    and portfolio.share_token = snapshot.share_token
    and portfolio.is_published = true
    and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
  limit 1;
$$;

-- Approved viewers receive the approved projection and original photo paths only
-- after an identity-bound, active full-access grant is verified.
create or replace function public.resolve_approved_portfolio(p_share_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
      ))
      from public.portfolio_horoscopes horoscope
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
      )
      from public.portfolio_media media
      where media.portfolio_id = portfolio.id
        and media.media_type in ('hero', 'gallery')
        and media.visibility in ('public', 'blurred', 'interest_required', 'approved_only')
    ), '[]'::jsonb)
  )
  from public.public_portfolio_snapshots snapshot
  join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
  join public.approved_portfolio_snapshots approved on approved.portfolio_id = portfolio.id
  where auth.uid() is not null
    and snapshot.share_token = p_share_token
    and snapshot.is_active = true
    and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
    and portfolio.share_token = snapshot.share_token
    and portfolio.is_published = true
    and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    and exists (
      select 1
      from public.reveal_grants grant_record
      where grant_record.portfolio_id = portfolio.id
        and grant_record.viewer_user_id = auth.uid()
        and grant_record.access_level = 'full'
        and grant_record.revoked_at is null
        and (grant_record.expires_at is null or grant_record.expires_at > pg_catalog.now())
    )
  limit 1;
$$;

create or replace function public.resolve_approved_horoscope(p_share_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'accessPath', horoscope.storage_path,
    'mimeType', horoscope.mime_type,
    'fileExtension', horoscope.file_extension,
    'languageLabel', horoscope.language_label,
    'pageCount', horoscope.page_count,
    'profileName', approved.data #>> '{personal,name}'
  ))
  from public.public_portfolio_snapshots snapshot
  join public.portfolios portfolio on portfolio.id = snapshot.portfolio_id
  join public.approved_portfolio_snapshots approved on approved.portfolio_id = portfolio.id
  join public.portfolio_horoscopes horoscope on horoscope.portfolio_id = portfolio.id
  where auth.uid() is not null
    and snapshot.share_token = p_share_token
    and snapshot.is_active = true
    and portfolio.share_token = snapshot.share_token
    and portfolio.is_published = true
    and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
    and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    and horoscope.published_at is not null
    and exists (
      select 1 from public.reveal_grants grant_record
      where grant_record.portfolio_id = portfolio.id
        and grant_record.viewer_user_id = auth.uid()
        and grant_record.access_level = 'full'
        and grant_record.revoked_at is null
        and (grant_record.expires_at is null or grant_record.expires_at > pg_catalog.now())
    )
  limit 1;
$$;

create or replace function public.record_public_portfolio_view(p_share_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_portfolio_id uuid;
begin
  select snapshot.portfolio_id into target_portfolio_id
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
  if not exists (
    select 1 from public.portfolio_views view_record
    where view_record.portfolio_id = target_portfolio_id
      and view_record.viewed_at > pg_catalog.now() - interval '1 hour'
  ) then
    insert into public.portfolio_views (portfolio_id) values (target_portfolio_id);
  end if;
  return true;
end;
$$;

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
  target_portfolio_id uuid;
  target_candidate_id uuid;
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  normalized_phone text := pg_catalog.regexp_replace(p_phone, '\D', '', 'g');
  prospect_hash text;
begin
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

  prospect_hash := pg_catalog.encode(
    extensions.digest(normalized_email || '|' || normalized_phone, 'sha256'),
    'hex'
  );

  if exists (
    select 1 from public.interest_requests request_record
    where request_record.portfolio_id = target_portfolio_id
      and request_record.prospect_key_hash = prospect_hash
      and request_record.created_at > pg_catalog.now() - interval '15 minutes'
  ) then
    return true;
  end if;

  insert into public.interest_requests (
    portfolio_id, candidate_id, requester_user_id, viewer_name, viewer_phone,
    viewer_email, viewer_family_context, message, request_reason,
    requested_sections, prospect_key_hash, status, attribution_status, metadata
  ) values (
    target_portfolio_id, target_candidate_id, auth.uid(), pg_catalog.btrim(p_name),
    pg_catalog.btrim(p_phone), normalized_email, pg_catalog.btrim(p_family_context),
    pg_catalog.btrim(p_message), pg_catalog.btrim(p_message), array['full']::text[],
    prospect_hash, 'new', 'unattributed',
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'profile_for', p_profile_for,
      'location', pg_catalog.btrim(p_location),
      'portfolio_url', nullif(pg_catalog.btrim(p_portfolio_url), '')
    ))
  );
  return true;
end;
$$;

-- Approval and grant creation happen in one database transaction. A failed
-- status update can never leave an active grant behind.
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
begin
  if auth.uid() is null then return 'unauthorized'; end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid interest decision' using errcode = '22023';
  end if;

  select request_record.* into interest_record
  from public.interest_requests request_record
  where request_record.id = p_interest_request_id
    and public.can_manage_portfolio(request_record.portfolio_id)
  for update;

  if interest_record.id is null then return 'not_found'; end if;
  if p_decision = 'approved' and interest_record.requester_user_id is null then
    return 'signin_required';
  end if;

  update public.interest_requests
  set status = p_decision::public.interest_status,
      decided_at = pg_catalog.now(),
      decided_by = auth.uid()
  where id = interest_record.id;

  if p_decision = 'approved' then
    if not exists (
      select 1 from public.reveal_grants grant_record
      where grant_record.interest_request_id = interest_record.id
        and grant_record.viewer_user_id = interest_record.requester_user_id
        and grant_record.revoked_at is null
    ) then
      insert into public.reveal_grants (
        interest_request_id, portfolio_id, viewer_user_id, access_level,
        granted_sections, granted_by
      ) values (
        interest_record.id, interest_record.portfolio_id,
        interest_record.requester_user_id, 'full', array['full']::text[], auth.uid()
      );
    end if;
  else
    update public.reveal_grants
    set revoked_at = pg_catalog.now()
    where interest_request_id = interest_record.id
      and revoked_at is null;
  end if;

  return p_decision;
end;
$$;

create or replace function public.set_portfolio_hero(p_media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_portfolio_id uuid;
begin
  select media.portfolio_id into target_portfolio_id
  from public.portfolio_media media
  where media.id = p_media_id
  for update;

  if target_portfolio_id is null or not public.can_manage_portfolio(target_portfolio_id) then
    return false;
  end if;

  update public.portfolio_media
  set media_type = 'gallery'
  where portfolio_id = target_portfolio_id
    and media_type = 'hero'
    and id <> p_media_id;

  update public.portfolio_media
  set media_type = 'hero'
  where id = p_media_id;
  return found;
end;
$$;

revoke all on function public.resolve_public_portfolio(text) from public;
revoke all on function public.resolve_approved_portfolio(text) from public;
revoke all on function public.resolve_approved_horoscope(text) from public;
revoke all on function public.record_public_portfolio_view(text) from public;
revoke all on function public.submit_public_interest(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.decide_interest_request(uuid, text) from public;
revoke all on function public.set_portfolio_hero(uuid) from public;

grant execute on function public.resolve_public_portfolio(text) to anon, authenticated;
grant execute on function public.resolve_approved_portfolio(text) to authenticated;
grant execute on function public.resolve_approved_horoscope(text) to authenticated;
grant execute on function public.record_public_portfolio_view(text) to anon, authenticated;
grant execute on function public.submit_public_interest(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.decide_interest_request(uuid, text) to authenticated;
grant execute on function public.set_portfolio_hero(uuid) to authenticated;

-- Storage remains private. These policies authorize only an active token's
-- explicit public original or generated low-detail derivative.
drop policy if exists "Published public portfolio photos are readable" on storage.objects;
drop policy if exists "Published protected photo previews are readable" on storage.objects;

create policy "Active portfolio public photos are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      join public.public_portfolio_snapshots snapshot on snapshot.portfolio_id = media.portfolio_id
      join public.portfolios portfolio on portfolio.id = media.portfolio_id
      where media.storage_path = storage.objects.name
        and media.visibility = 'public'
        and media.media_type in ('hero', 'gallery')
        and (
          snapshot.data ->> 'privacy_mode' <> 'private'
          or media.media_type = 'hero'
          or media.id = (
            select first_gallery.id
            from public.portfolio_media first_gallery
            where first_gallery.portfolio_id = media.portfolio_id
              and first_gallery.media_type = 'gallery'
              and first_gallery.visibility = 'public'
            order by first_gallery.sort_order, first_gallery.created_at, first_gallery.id
            limit 1
          )
        )
        and snapshot.is_active = true
        and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
        and portfolio.share_token = snapshot.share_token
        and portfolio.is_published = true
        and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    )
  );

create policy "Active portfolio protected previews are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      join public.public_portfolio_snapshots snapshot on snapshot.portfolio_id = media.portfolio_id
      join public.portfolios portfolio on portfolio.id = media.portfolio_id
      where media.metadata ->> 'blurPath' = storage.objects.name
        and media.media_type in ('hero', 'gallery')
        and snapshot.is_active = true
        and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
        and portfolio.share_token = snapshot.share_token
        and portfolio.is_published = true
        and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    )
  );

-- Keep media relationships and publish readiness enforceable in the database.
create unique index if not exists idx_portfolio_media_single_hero
  on public.portfolio_media(portfolio_id)
  where media_type = 'hero';

create or replace function app_private.enforce_portfolio_media_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_candidate_id uuid;
  expected_user_id uuid;
  profile_photo_count integer;
begin
  select portfolio.candidate_id, portfolio.user_id
    into expected_candidate_id, expected_user_id
  from public.portfolios portfolio
  where portfolio.id = new.portfolio_id;

  if expected_user_id is null then
    raise exception 'portfolio media requires an existing portfolio' using errcode = '23503';
  end if;
  if new.candidate_id is not null and new.candidate_id is distinct from expected_candidate_id then
    raise exception 'portfolio media candidate does not match portfolio' using errcode = '23514';
  end if;
  if pg_catalog.split_part(new.storage_path, '/', 1) <> expected_user_id::text
    or (new.thumbnail_path is not null and pg_catalog.split_part(new.thumbnail_path, '/', 1) <> expected_user_id::text)
    or (new.metadata ? 'blurPath' and pg_catalog.split_part(new.metadata ->> 'blurPath', '/', 1) <> expected_user_id::text)
  then
    raise exception 'portfolio media path is outside the owner namespace' using errcode = '23514';
  end if;

  select pg_catalog.count(*) into profile_photo_count
  from public.portfolio_media media
  where media.portfolio_id = new.portfolio_id
    and media.media_type in ('hero', 'gallery')
    and (tg_op = 'INSERT' or media.id <> new.id);
  if new.media_type in ('hero', 'gallery') and profile_photo_count >= 8 then
    raise exception 'a portfolio can contain at most 8 profile photos' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function app_private.enforce_publication_media_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  public_hero_count integer;
begin
  if new.is_published = true and (old.is_published is distinct from true) then
    select pg_catalog.count(*) into public_hero_count
    from public.portfolio_media media
    where media.portfolio_id = new.id
      and media.media_type = 'hero'
      and media.visibility = 'public';
    if public_hero_count <> 1 then
      raise exception 'publishing requires exactly one public hero photo' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_portfolio_media_contract() from public;
revoke all on function app_private.enforce_publication_media_contract() from public;

drop trigger if exists enforce_portfolio_media_contract on public.portfolio_media;
create trigger enforce_portfolio_media_contract
  before insert or update of portfolio_id, candidate_id, media_type, storage_path, thumbnail_path, metadata
  on public.portfolio_media
  for each row execute function app_private.enforce_portfolio_media_contract();

drop trigger if exists enforce_publication_media_contract on public.portfolios;
create trigger enforce_publication_media_contract
  before update of is_published on public.portfolios
  for each row execute function app_private.enforce_publication_media_contract();

-- Replace legacy short links now that every public lookup is token-scoped.
with rotated as (
  select portfolio.id, pg_catalog.substr(pg_catalog.encode(extensions.gen_random_bytes(16), 'hex'), 1, 21) as new_token
  from public.portfolios portfolio
  where portfolio.share_token is not null
    and pg_catalog.length(portfolio.share_token) < 21
)
update public.portfolios portfolio
set share_token = rotated.new_token
from rotated
where portfolio.id = rotated.id;

update public.public_portfolio_snapshots snapshot
set share_token = portfolio.share_token,
    is_active = portfolio.is_published
      and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
from public.portfolios portfolio
where portfolio.id = snapshot.portfolio_id
  and snapshot.share_token is distinct from portfolio.share_token;

comment on function public.resolve_public_portfolio(text) is
  'Returns one active sanitized snapshot plus public-safe media descriptors for an exact share token.';
comment on function public.submit_public_interest(text, text, text, text, text, text, text, text, text) is
  'Validates an active share token and inserts only server-owned interest request fields.';

