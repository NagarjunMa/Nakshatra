-- Reject authenticated requests after their backing Supabase Auth session has
-- been revoked. JWT signature validation alone cannot provide immediate logout.
create or replace function public.is_current_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from auth.sessions session_record
      where session_record.user_id = auth.uid()
        and session_record.id::text = coalesce(auth.jwt() ->> 'session_id', '')
    );
$$;

revoke all on function public.is_current_session_active() from public, anon, authenticated;
grant execute on function public.is_current_session_active() to authenticated;

create or replace function app_private.require_current_session()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_current_session_active() then
    raise exception 'authentication session is no longer active' using errcode = '42501';
  end if;
end;
$$;

revoke all on function app_private.require_current_session() from public, anon, authenticated;

-- The shared timestamp trigger predates the fixed-path convention. Pinning its
-- path removes the remaining database security-advisor warning.
alter function public.update_updated_at() set search_path = '';

-- Authorization helpers are also RPC trust boundaries. Calling them directly
-- or through another SECURITY DEFINER command must require a live session.
create or replace function public.is_organization_member(p_organization_id uuid)
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
    from public.organization_members member_record
    where member_record.organization_id = p_organization_id
      and member_record.user_id = auth.uid()
      and member_record.status = 'active'
  );
end;
$$;

create or replace function public.has_organization_role(
  p_organization_id uuid,
  p_roles public.organization_member_role[]
)
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
    from public.organization_members member_record
    where member_record.organization_id = p_organization_id
      and member_record.user_id = auth.uid()
      and member_record.status = 'active'
      and member_record.role = any(p_roles)
  );
end;
$$;

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
    from public.candidates candidate_record
    where candidate_record.id = p_candidate_id
      and (
        candidate_record.primary_owner_user_id = auth.uid()
        or candidate_record.created_by = auth.uid()
        or (
          candidate_record.current_organization_id is not null
          and public.is_organization_member(candidate_record.current_organization_id)
        )
      )
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
    from public.portfolios portfolio_record
    where portfolio_record.id = p_portfolio_id
      and (
        portfolio_record.user_id = auth.uid()
        or (
          portfolio_record.candidate_id is not null
          and public.owns_candidate(portfolio_record.candidate_id)
        )
        or (
          portfolio_record.owner_organization_id is not null
          and public.is_organization_member(portfolio_record.owner_organization_id)
        )
      )
  );
end;
$$;

revoke all on function public.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function public.has_organization_role(uuid, public.organization_member_role[]) from public, anon, authenticated;
revoke all on function public.owns_candidate(uuid) from public, anon, authenticated;
revoke all on function public.can_manage_portfolio(uuid) from public, anon, authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.organization_member_role[]) to authenticated;
grant execute on function public.owns_candidate(uuid) to authenticated;
grant execute on function public.can_manage_portfolio(uuid) to authenticated;

-- A restrictive policy is combined with every existing permissive ownership
-- policy. This makes a live Auth session mandatory without weakening row-level
-- ownership, organization, grant, or privacy checks.
do $migration$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'access_audit_events',
    'account_deletion_requests',
    'approved_portfolio_snapshots',
    'attribution_records',
    'broker_clients',
    'candidate_astrology_details',
    'candidate_career_entries',
    'candidate_education_entries',
    'candidate_family_members',
    'candidate_lifestyle_details',
    'candidate_partner_preferences',
    'candidate_personal_details',
    'candidates',
    'compatibility_reports',
    'entitlements',
    'interest_requests',
    'lead_claims',
    'marketplace_listings',
    'matchmaker_profiles',
    'organization_members',
    'organizations',
    'portfolio_events',
    'portfolio_horoscopes',
    'portfolio_links',
    'portfolio_media',
    'portfolio_sections',
    'portfolio_versions',
    'portfolio_views',
    'portfolios',
    'public_portfolio_snapshots',
    'purchases',
    'reveal_grants',
    'subscriptions',
    'user_profiles',
    'verifications',
    'viewer_sessions',
    'visibility_rules'
  ]
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on public.%I',
      'Authenticated requests require a live session',
      protected_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select public.is_current_session_active())) with check ((select public.is_current_session_active()))',
      'Authenticated requests require a live session',
      protected_table
    );
    execute pg_catalog.format(
      'grant select, insert, update, delete on table public.%I to service_role',
      protected_table
    );
  end loop;
end;
$migration$;

-- The helper intentionally answers only whether an object is already public.
-- It cannot distinguish private objects from missing objects, and its
-- SECURITY DEFINER context avoids private-table RLS hiding public media while
-- the restrictive Storage policy is evaluating a revoked authenticated JWT.
create or replace function public.is_public_portfolio_media_path(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_bucket_id = 'photos'
    and exists (
      select 1
      from public.portfolio_media media
      join public.public_portfolio_snapshots snapshot on snapshot.portfolio_id = media.portfolio_id
      join public.portfolios portfolio on portfolio.id = media.portfolio_id
      where (
          (
            media.storage_path = p_object_name
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
          )
          or (
            media.metadata ->> 'blurPath' = p_object_name
            and media.media_type in ('hero', 'gallery')
          )
        )
        and snapshot.is_active = true
        and (snapshot.expires_at is null or snapshot.expires_at > pg_catalog.now())
        and portfolio.share_token = snapshot.share_token
        and portfolio.is_published = true
        and (portfolio.expires_at is null or portfolio.expires_at > pg_catalog.now())
    );
$$;

revoke all on function public.is_public_portfolio_media_path(text, text) from public, anon, authenticated;
grant execute on function public.is_public_portfolio_media_path(text, text) to authenticated;
comment on function public.is_public_portfolio_media_path(text, text) is
  'Storage-policy allowlist: returns true only for an already public active portfolio image or generated preview.';

-- SELECT keeps the same public-photo exception as the existing public Storage
-- policy. All private reads and every write operation require a live session.
drop policy if exists "Authenticated storage reads require a live session" on storage.objects;
create policy "Authenticated storage reads require a live session"
  on storage.objects as restrictive for select
  to authenticated
  using (
    (select public.is_current_session_active())
    or public.is_public_portfolio_media_path(bucket_id, name)
  );

drop policy if exists "Authenticated storage inserts require a live session" on storage.objects;
create policy "Authenticated storage inserts require a live session"
  on storage.objects as restrictive for insert
  to authenticated
  with check ((select public.is_current_session_active()));

drop policy if exists "Authenticated storage updates require a live session" on storage.objects;
create policy "Authenticated storage updates require a live session"
  on storage.objects as restrictive for update
  to authenticated
  using ((select public.is_current_session_active()))
  with check ((select public.is_current_session_active()));

drop policy if exists "Authenticated storage deletes require a live session" on storage.objects;
create policy "Authenticated storage deletes require a live session"
  on storage.objects as restrictive for delete
  to authenticated
  using ((select public.is_current_session_active()));

-- Move privileged implementations behind an unexposed schema and retain the
-- public RPC signatures as guarded entry points. This prevents callers from
-- reaching an unguarded SECURITY DEFINER body directly.
alter function public.submit_public_interest(text, text, text, text, text, text, text, text, text)
  set schema app_private;
alter function public.decide_interest_request(uuid, text)
  set schema app_private;
alter function public.manage_reveal_grant(uuid, text)
  set schema app_private;
alter function public.publish_portfolio_transaction(uuid, jsonb, jsonb, jsonb, text, timestamptz, integer, text, text)
  set schema app_private;
alter function public.renew_portfolio_transaction(timestamptz)
  set schema app_private;
alter function public.rotate_portfolio_transaction(text)
  set schema app_private;
alter function public.unpublish_portfolio_transaction()
  set schema app_private;
alter function public.replace_candidate_relationships_and_timeline(uuid, jsonb, jsonb, jsonb)
  set schema app_private;
alter function public.list_portfolio_access()
  set schema app_private;
alter function public.resolve_approved_portfolio(text)
  set schema app_private;
alter function public.resolve_approved_horoscope(text)
  set schema app_private;
alter function public.set_portfolio_hero(uuid)
  set schema app_private;
alter function public.create_organization_with_owner(public.organization_type, text, text)
  set schema app_private;
alter function public.request_account_deletion()
  set schema app_private;
alter function public.cancel_account_deletion()
  set schema app_private;
alter function public.export_my_account_data()
  set schema app_private;

revoke all on function app_private.submit_public_interest(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function app_private.decide_interest_request(uuid, text) from public, anon, authenticated;
revoke all on function app_private.manage_reveal_grant(uuid, text) from public, anon, authenticated;
revoke all on function app_private.publish_portfolio_transaction(uuid, jsonb, jsonb, jsonb, text, timestamptz, integer, text, text) from public, anon, authenticated;
revoke all on function app_private.renew_portfolio_transaction(timestamptz) from public, anon, authenticated;
revoke all on function app_private.rotate_portfolio_transaction(text) from public, anon, authenticated;
revoke all on function app_private.unpublish_portfolio_transaction() from public, anon, authenticated;
revoke all on function app_private.replace_candidate_relationships_and_timeline(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function app_private.list_portfolio_access() from public, anon, authenticated;
revoke all on function app_private.resolve_approved_portfolio(text) from public, anon, authenticated;
revoke all on function app_private.resolve_approved_horoscope(text) from public, anon, authenticated;
revoke all on function app_private.set_portfolio_hero(uuid) from public, anon, authenticated;
revoke all on function app_private.create_organization_with_owner(public.organization_type, text, text) from public, anon, authenticated;
revoke all on function app_private.request_account_deletion() from public, anon, authenticated;
revoke all on function app_private.cancel_account_deletion() from public, anon, authenticated;
revoke all on function app_private.export_my_account_data() from public, anon, authenticated;

create function public.submit_public_interest(
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
begin
  perform app_private.require_current_session();
  return app_private.submit_public_interest(
    p_share_token, p_name, p_profile_for, p_phone, p_email, p_location,
    p_family_context, p_message, p_portfolio_url
  );
end;
$$;

create function public.decide_interest_request(
  p_interest_request_id uuid,
  p_decision text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.decide_interest_request(p_interest_request_id, p_decision);
end;
$$;

create function public.manage_reveal_grant(p_grant_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.manage_reveal_grant(p_grant_id, p_action);
end;
$$;

create function public.publish_portfolio_transaction(
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
begin
  perform app_private.require_current_session();
  return app_private.publish_portfolio_transaction(
    p_portfolio_id, p_draft_data, p_public_data, p_approved_data,
    p_share_token, p_expires_at, p_template_id, p_theme_color, p_sun_sign
  );
end;
$$;

create function public.renew_portfolio_transaction(p_expires_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.renew_portfolio_transaction(p_expires_at);
end;
$$;

create function public.rotate_portfolio_transaction(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.rotate_portfolio_transaction(p_share_token);
end;
$$;

create function public.unpublish_portfolio_transaction()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.unpublish_portfolio_transaction();
end;
$$;

create function public.replace_candidate_relationships_and_timeline(
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
begin
  perform app_private.require_current_session();
  return app_private.replace_candidate_relationships_and_timeline(
    p_candidate_id, p_family_members, p_education, p_career
  );
end;
$$;

create function public.list_portfolio_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.list_portfolio_access();
end;
$$;

create function public.resolve_approved_portfolio(p_share_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.resolve_approved_portfolio(p_share_token);
end;
$$;

create function public.resolve_approved_horoscope(p_share_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.resolve_approved_horoscope(p_share_token);
end;
$$;

create function public.set_portfolio_hero(p_media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.set_portfolio_hero(p_media_id);
end;
$$;

create function public.create_organization_with_owner(
  p_type public.organization_type,
  p_name text,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.create_organization_with_owner(p_type, p_name, p_slug);
end;
$$;

create function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.request_account_deletion();
end;
$$;

create function public.cancel_account_deletion()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.cancel_account_deletion();
end;
$$;

create function public.export_my_account_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.export_my_account_data();
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
revoke all on function public.set_portfolio_hero(uuid) from public, anon, authenticated;
revoke all on function public.create_organization_with_owner(public.organization_type, text, text) from public, anon, authenticated;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
revoke all on function public.cancel_account_deletion() from public, anon, authenticated;
revoke all on function public.export_my_account_data() from public, anon, authenticated;

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
grant execute on function public.set_portfolio_hero(uuid) to authenticated;
grant execute on function public.create_organization_with_owner(public.organization_type, text, text) to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.export_my_account_data() to authenticated;
