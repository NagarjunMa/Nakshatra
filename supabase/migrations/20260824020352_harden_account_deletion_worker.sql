-- Harden the asynchronous account-deletion lifecycle. Pending requests keep
-- private access through their recovery window; a service-role worker atomically
-- claims, freezes, and owns the destructive attempt with a short lease token.

alter table public.account_deletion_requests
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_stage text not null default 'pending'
    check (processing_stage in (
      'pending',
      'claimed',
      'initial_storage_cleaned',
      'database_prepared',
      'final_storage_cleaned',
      'auth_deleted',
      'failed',
      'completed',
      'canceled'
    )),
  add column if not exists retry_after timestamptz,
  add column if not exists auth_deleted_at timestamptz;

-- Older processing claims have no ownership token or lease. Treat them as a
-- recoverable retry rather than accepting an unauthenticated/stale worker after
-- deployment, and keep the original recovery deadline intact.
update public.account_deletion_requests
set status = 'failed',
    processing_stage = 'failed',
    retry_after = pg_catalog.now(),
    last_error_code = 'LEASE_MIGRATION_REQUIRED',
    updated_at = pg_catalog.now()
where status = 'processing';

update public.account_deletion_requests
set processing_stage = case status
      when 'pending' then 'pending'
      when 'failed' then 'failed'
      when 'canceled' then 'canceled'
      when 'completed' then 'completed'
      else processing_stage
    end,
    retry_after = case
      when status = 'failed' then coalesce(retry_after, pg_catalog.now())
      else retry_after
    end,
    updated_at = pg_catalog.now()
where status <> 'processing';

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_processing_lease_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_processing_lease_check
  check (
    (status = 'processing' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'processing' and lease_token is null and lease_expires_at is null)
  );

create index if not exists idx_account_deletion_requests_worker_claim
  on public.account_deletion_requests(status, scheduled_for, retry_after, lease_expires_at)
  where status in ('pending', 'failed', 'processing');

create or replace function app_private.require_deletion_worker()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function app_private.require_deletion_worker() from public, anon, authenticated;

-- A processing record is an account-level lock in addition to the existing
-- session-row check. It closes the gap where a new Auth session is issued after
-- claim/freeze but before the worker deletes the Auth user.
create or replace function public.is_current_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and not exists (
      select 1
      from public.account_deletion_requests deletion_request
      where deletion_request.user_id = auth.uid()
        and deletion_request.status = 'processing'
    )
    and exists (
      select 1
      from auth.sessions session_record
      where session_record.user_id = auth.uid()
        and session_record.id::text = coalesce(auth.jwt() ->> 'session_id', '')
    );
$$;

revoke all on function public.is_current_session_active() from public, anon, authenticated;
grant execute on function public.is_current_session_active() to authenticated;

create or replace function app_private.revoke_account_deletion_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.portfolios
  set is_published = false, published_at = null
  where user_id = p_user_id;

  update public.public_portfolio_snapshots snapshot
  set is_active = false, updated_at = pg_catalog.now()
  where exists (
    select 1
    from public.portfolios portfolio
    where portfolio.id = snapshot.portfolio_id
      and portfolio.user_id = p_user_id
  );

  update public.reveal_grants grant_record
  set revoked_at = coalesce(grant_record.revoked_at, pg_catalog.now()),
      revocation_reason = coalesce(grant_record.revocation_reason, 'account_deletion_requested')
  where grant_record.revoked_at is null
    and exists (
      select 1
      from public.portfolios portfolio
      where portfolio.id = grant_record.portfolio_id
        and portfolio.user_id = p_user_id
    );

  update public.interest_requests request_record
  set status = 'closed', updated_at = pg_catalog.now()
  where request_record.status in ('new', 'pending_review', 'approved', 'revealed')
    and exists (
      select 1
      from public.portfolios portfolio
      where portfolio.id = request_record.portfolio_id
        and portfolio.user_id = p_user_id
    );
end;
$$;

revoke all on function app_private.revoke_account_deletion_access(uuid) from public, anon, authenticated;

create or replace function app_private.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  deletion_record public.account_deletion_requests%rowtype;
  blocked_organizations integer;
  must_schedule boolean := false;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select pg_catalog.count(*)::integer into blocked_organizations
  from public.organization_members owner_membership
  where owner_membership.user_id = actor_id
    and owner_membership.role = 'owner'
    and owner_membership.status = 'active'
    and exists (
      select 1
      from public.organization_members other_member
      where other_member.organization_id = owner_membership.organization_id
        and other_member.user_id <> actor_id
        and other_member.status = 'active'
    )
    and not exists (
      select 1
      from public.organization_members other_owner
      where other_owner.organization_id = owner_membership.organization_id
        and other_owner.user_id <> actor_id
        and other_owner.role = 'owner'
        and other_owner.status = 'active'
    );

  if blocked_organizations > 0 then
    return pg_catalog.jsonb_build_object(
      'status', 'ownership_transfer_required',
      'organizationCount', blocked_organizations
    );
  end if;

  select * into deletion_record
  from public.account_deletion_requests
  where user_id = actor_id
  for update;

  if found then
    if deletion_record.status = 'pending' then
      return pg_catalog.jsonb_build_object(
        'status', 'pending',
        'scheduledFor', deletion_record.scheduled_for
      );
    end if;

    if deletion_record.status = 'processing' then
      return pg_catalog.jsonb_build_object('status', 'processing');
    end if;

    if deletion_record.status = 'completed' then
      return pg_catalog.jsonb_build_object('status', 'completed');
    end if;

    if deletion_record.status not in ('canceled', 'failed') then
      return pg_catalog.jsonb_build_object('status', 'unavailable');
    end if;

    update public.account_deletion_requests
    set status = 'pending',
        requested_at = pg_catalog.now(),
        scheduled_for = pg_catalog.now() + interval '24 hours',
        claimed_at = null,
        processing_started_at = null,
        processing_stage = 'pending',
        retry_after = null,
        auth_deleted_at = null,
        completed_at = null,
        retention_until = null,
        attempts = 0,
        last_error_code = null,
        updated_at = pg_catalog.now()
    where id = deletion_record.id
    returning * into deletion_record;
    must_schedule := true;
  else
    insert into public.account_deletion_requests (
      user_id, subject_hash, status, requested_at, scheduled_for, processing_stage
    ) values (
      actor_id,
      pg_catalog.encode(extensions.digest(actor_id::text, 'sha256'), 'hex'),
      'pending', pg_catalog.now(), pg_catalog.now() + interval '24 hours', 'pending'
    )
    returning * into deletion_record;
    must_schedule := true;
  end if;

  if must_schedule then
    perform app_private.revoke_account_deletion_access(actor_id);
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'pending',
    'scheduledFor', deletion_record.scheduled_for
  );
end;
$$;

create or replace function app_private.cancel_account_deletion()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_deletion_requests
  set status = 'canceled',
      processing_stage = 'canceled',
      retry_after = null,
      last_error_code = null,
      updated_at = pg_catalog.now()
  where user_id = auth.uid()
    and status in ('pending', 'failed');

  if not found then
    return 'not_cancelable';
  end if;
  return 'canceled';
end;
$$;

create or replace function public.request_account_deletion()
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

create or replace function public.cancel_account_deletion()
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

drop function if exists public.claim_account_deletion_batch(integer);
drop function if exists public.prepare_account_deletion(uuid, uuid);

create function app_private.claim_account_deletion_batch(p_limit integer default 10)
returns table(request_id uuid, user_id uuid, claim_token uuid, processing_stage text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();

  return query
  with due_request as (
    select deletion_request.id
    from public.account_deletion_requests deletion_request
    where (
      (deletion_request.status = 'pending' and deletion_request.scheduled_for <= pg_catalog.now())
      or (deletion_request.status = 'failed' and deletion_request.retry_after <= pg_catalog.now())
      or (deletion_request.status = 'processing' and deletion_request.lease_expires_at <= pg_catalog.now())
    )
    and (deletion_request.user_id is not null or deletion_request.status = 'processing')
    order by coalesce(deletion_request.retry_after, deletion_request.scheduled_for, deletion_request.lease_expires_at), deletion_request.id
    for update skip locked
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
  ), claimed as (
    update public.account_deletion_requests deletion_request
    set status = 'processing',
        claimed_at = pg_catalog.now(),
        processing_started_at = coalesce(deletion_request.processing_started_at, pg_catalog.now()),
        processing_stage = case
          when deletion_request.user_id is null then 'auth_deleted'
          when deletion_request.status = 'processing' then deletion_request.processing_stage
          else 'claimed'
        end,
        lease_token = gen_random_uuid(),
        lease_expires_at = pg_catalog.now() + interval '30 minutes',
        retry_after = null,
        attempts = deletion_request.attempts + 1,
        last_error_code = null,
        updated_at = pg_catalog.now()
    where deletion_request.id in (select due_request.id from due_request)
    returning deletion_request.id, deletion_request.user_id, deletion_request.lease_token, deletion_request.processing_stage
  ), revoked as (
    delete from auth.sessions session_record
    using claimed
    where session_record.user_id = claimed.user_id
      and claimed.user_id is not null
    returning session_record.id
  )
  select claimed.id, claimed.user_id, claimed.lease_token, claimed.processing_stage
  from claimed;
end;
$$;

create function public.claim_account_deletion_batch(p_limit integer default 10)
returns table(request_id uuid, user_id uuid, claim_token uuid, processing_stage text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();
  return query select * from app_private.claim_account_deletion_batch(p_limit);
end;
$$;

create function app_private.advance_account_deletion_stage(
  p_request_id uuid,
  p_claim_token uuid,
  p_stage text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();

  update public.account_deletion_requests deletion_request
  set processing_stage = p_stage,
      updated_at = pg_catalog.now()
  where deletion_request.id = p_request_id
    and deletion_request.status = 'processing'
    and deletion_request.lease_token = p_claim_token
    and deletion_request.lease_expires_at > pg_catalog.now()
    and (
      (deletion_request.processing_stage = 'claimed' and p_stage = 'initial_storage_cleaned')
      or (deletion_request.processing_stage = 'database_prepared' and p_stage = 'final_storage_cleaned')
    );

  return found;
end;
$$;

create function public.advance_account_deletion_stage(
  p_request_id uuid,
  p_claim_token uuid,
  p_stage text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();
  return app_private.advance_account_deletion_stage(p_request_id, p_claim_token, p_stage);
end;
$$;

create function app_private.prepare_account_deletion(
  p_request_id uuid,
  p_user_id uuid,
  p_claim_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_candidates integer := 0;
  deleted_organizations integer := 0;
  anonymized_requests integer := 0;
begin
  perform app_private.require_deletion_worker();

  if not exists (
    select 1
    from public.account_deletion_requests deletion_request
    where deletion_request.id = p_request_id
      and deletion_request.user_id = p_user_id
      and deletion_request.status = 'processing'
      and deletion_request.processing_stage = 'initial_storage_cleaned'
      and deletion_request.lease_token = p_claim_token
      and deletion_request.lease_expires_at > pg_catalog.now()
  ) then
    raise exception 'deletion request claim is invalid' using errcode = '22023';
  end if;

  update public.interest_requests request_record
  set viewer_name = null,
      viewer_phone = null,
      viewer_email = null,
      viewer_family_context = null,
      message = null,
      requester_user_id = null,
      prospect_key_hash = null,
      metadata = '{}'::jsonb,
      updated_at = pg_catalog.now()
  where request_record.requester_user_id = p_user_id;
  get diagnostics anonymized_requests = row_count;

  delete from public.candidates candidate
  where candidate.current_organization_id is null
    and (candidate.primary_owner_user_id = p_user_id or candidate.created_by = p_user_id);
  get diagnostics deleted_candidates = row_count;

  delete from public.organizations organization_record
  where exists (
    select 1
    from public.organization_members actor_membership
    where actor_membership.organization_id = organization_record.id
      and actor_membership.user_id = p_user_id
      and actor_membership.role = 'owner'
      and actor_membership.status = 'active'
  )
  and not exists (
    select 1
    from public.organization_members other_member
    where other_member.organization_id = organization_record.id
      and other_member.user_id <> p_user_id
      and other_member.status = 'active'
  );
  get diagnostics deleted_organizations = row_count;

  update public.account_deletion_requests deletion_request
  set processing_stage = 'database_prepared', updated_at = pg_catalog.now()
  where deletion_request.id = p_request_id
    and deletion_request.status = 'processing'
    and deletion_request.processing_stage = 'initial_storage_cleaned'
    and deletion_request.lease_token = p_claim_token
    and deletion_request.lease_expires_at > pg_catalog.now();

  if not found then
    raise exception 'deletion request claim was lost' using errcode = '22023';
  end if;

  return pg_catalog.jsonb_build_object(
    'candidatesDeleted', deleted_candidates,
    'organizationsDeleted', deleted_organizations,
    'requestsAnonymized', anonymized_requests
  );
end;
$$;

create function public.prepare_account_deletion(
  p_request_id uuid,
  p_user_id uuid,
  p_claim_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();
  return app_private.prepare_account_deletion(p_request_id, p_user_id, p_claim_token);
end;
$$;

create function app_private.record_account_deletion_auth_deleted(
  p_request_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();

  update public.account_deletion_requests deletion_request
  set processing_stage = 'auth_deleted',
      auth_deleted_at = coalesce(deletion_request.auth_deleted_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where deletion_request.id = p_request_id
    and deletion_request.status = 'processing'
    and deletion_request.lease_token = p_claim_token
    and deletion_request.lease_expires_at > pg_catalog.now()
    and deletion_request.user_id is null
    and deletion_request.processing_stage in ('final_storage_cleaned', 'auth_deleted');

  return found;
end;
$$;

create function public.record_account_deletion_auth_deleted(
  p_request_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();
  return app_private.record_account_deletion_auth_deleted(p_request_id, p_claim_token);
end;
$$;

create function app_private.complete_account_deletion(
  p_request_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();

  update public.account_deletion_requests deletion_request
  set status = 'completed',
      processing_stage = 'completed',
      completed_at = pg_catalog.now(),
      retention_until = pg_catalog.now() + interval '30 days',
      lease_token = null,
      lease_expires_at = null,
      retry_after = null,
      last_error_code = null,
      updated_at = pg_catalog.now()
  where deletion_request.id = p_request_id
    and deletion_request.status = 'processing'
    and deletion_request.lease_token = p_claim_token
    and deletion_request.lease_expires_at > pg_catalog.now()
    and deletion_request.user_id is null
    and deletion_request.processing_stage = 'auth_deleted';

  return found;
end;
$$;

create function public.complete_account_deletion(
  p_request_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();
  return app_private.complete_account_deletion(p_request_id, p_claim_token);
end;
$$;

create function app_private.fail_account_deletion(
  p_request_id uuid,
  p_claim_token uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();

  if p_error_code !~ '^[A-Z_]{3,64}$' then
    raise exception 'invalid deletion failure code' using errcode = '22023';
  end if;

  update public.account_deletion_requests deletion_request
  set status = 'failed',
      processing_stage = 'failed',
      claimed_at = null,
      lease_token = null,
      lease_expires_at = null,
      retry_after = pg_catalog.now() + interval '1 hour',
      last_error_code = p_error_code,
      updated_at = pg_catalog.now()
  where deletion_request.id = p_request_id
    and deletion_request.status = 'processing'
    and deletion_request.lease_token = p_claim_token
    and deletion_request.lease_expires_at > pg_catalog.now()
    and deletion_request.user_id is not null
    and deletion_request.processing_stage <> 'auth_deleted';

  return found;
end;
$$;

create function public.fail_account_deletion(
  p_request_id uuid,
  p_claim_token uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_deletion_worker();
  return app_private.fail_account_deletion(p_request_id, p_claim_token, p_error_code);
end;
$$;

revoke all on function app_private.request_account_deletion() from public, anon, authenticated;
revoke all on function app_private.cancel_account_deletion() from public, anon, authenticated;
revoke all on function app_private.claim_account_deletion_batch(integer) from public, anon, authenticated;
revoke all on function app_private.advance_account_deletion_stage(uuid, uuid, text) from public, anon, authenticated;
revoke all on function app_private.prepare_account_deletion(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.record_account_deletion_auth_deleted(uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.complete_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.fail_account_deletion(uuid, uuid, text) from public, anon, authenticated;

revoke all on function public.request_account_deletion() from public, anon, authenticated;
revoke all on function public.cancel_account_deletion() from public, anon, authenticated;
revoke all on function public.claim_account_deletion_batch(integer) from public, anon, authenticated;
revoke all on function public.advance_account_deletion_stage(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.prepare_account_deletion(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_account_deletion_auth_deleted(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fail_account_deletion(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.claim_account_deletion_batch(integer) to service_role;
grant execute on function public.advance_account_deletion_stage(uuid, uuid, text) to service_role;
grant execute on function public.prepare_account_deletion(uuid, uuid, uuid) to service_role;
grant execute on function public.record_account_deletion_auth_deleted(uuid, uuid) to service_role;
grant execute on function public.complete_account_deletion(uuid, uuid) to service_role;
grant execute on function public.fail_account_deletion(uuid, uuid, text) to service_role;
