-- Test-only helpers loaded by individual pgTAP files with \ir. This file lives
-- beside the test suites so the Supabase pg_prove container can read it, while
-- its non-.test.sql suffix prevents it from running as an executable test suite.
--
-- Fixture rows are created while the pgTAP runner still has its trusted role.
-- Runtime assertions must then switch to the role being exercised. Never use
-- service_role to inspect app_private state: reset role returns to the runner.

create or replace function pg_temp.create_auth_actor(
  p_user_id uuid,
  p_session_id uuid,
  p_email text,
  p_session_created_at timestamptz default now()
)
returns void
language plpgsql
as $$
begin
  if p_user_id is null or p_session_id is null then
    raise exception 'test actor requires user and session identifiers' using errcode = '22023';
  end if;

  insert into auth.users (
    id, aud, role, email, email_confirmed_at, created_at, updated_at
  ) values (
    p_user_id, 'authenticated', 'authenticated', p_email, now(), now(), now()
  );

  insert into auth.sessions (id, user_id, created_at, updated_at)
  values (p_session_id, p_user_id, p_session_created_at, now());
end;
$$;

create or replace function pg_temp.create_auth_session(
  p_user_id uuid,
  p_session_id uuid,
  p_session_created_at timestamptz default now()
)
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'test session user does not exist' using errcode = '22023';
  end if;

  insert into auth.sessions (id, user_id, created_at, updated_at)
  values (p_session_id, p_user_id, p_session_created_at, now());
end;
$$;

-- SECURITY DEFINER is safe here because this temporary function exists only in
-- the pgTAP connection. It prevents a test from accidentally using a JWT whose
-- session is missing or belongs to a different fixture user.
create or replace function pg_temp.set_authenticated_claims(
  p_user_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  if not exists (
    select 1
    from auth.sessions session_record
    where session_record.id = p_session_id
      and session_record.user_id = p_user_id
  ) then
    raise exception 'test JWT session is absent or belongs to another user' using errcode = '22023';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_user_id::text,
      'role', 'authenticated',
      'session_id', p_session_id::text
    )::text,
    true
  );
end;
$$;

create or replace function pg_temp.set_anon_claims()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end;
$$;

create or replace function pg_temp.set_service_role_claims()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end;
$$;
