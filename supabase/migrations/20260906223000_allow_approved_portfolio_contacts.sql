-- Approved viewers may receive the owner-selected contact block. Keep contact
-- data forbidden everywhere else in the approved snapshot and preserve the
-- stricter public-snapshot contract.
create or replace function app_private.approved_snapshot_contact_is_safe(p_contact jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    pg_catalog.jsonb_typeof(p_contact) = 'object'
    and not exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_contact) contact_key
      where contact_key <> all(array['contact_person', 'phone', 'email', 'contacts']::text[])
    )
    and not exists (
      select 1
      from pg_catalog.jsonb_each(p_contact) contact_field(key, value)
      where contact_field.key <> 'contacts'
        and pg_catalog.jsonb_typeof(contact_field.value) not in ('string', 'null')
    )
    and pg_catalog.length(coalesce(p_contact ->> 'contact_person', '')) <= 100
    and pg_catalog.length(coalesce(p_contact ->> 'phone', '')) <= 50
    and pg_catalog.length(coalesce(p_contact ->> 'email', '')) <= 320
    and case
      when not (p_contact ? 'contacts') then true
      when pg_catalog.jsonb_typeof(p_contact -> 'contacts') <> 'array' then false
      else
        pg_catalog.jsonb_array_length(p_contact -> 'contacts') <= 5
        and not exists (
          select 1
          from pg_catalog.jsonb_array_elements(p_contact -> 'contacts') contact_entry
          where pg_catalog.jsonb_typeof(contact_entry) <> 'object'
            or exists (
              select 1
              from pg_catalog.jsonb_object_keys(contact_entry) entry_key
              where entry_key <> all(array['relationship', 'name', 'phone', 'email']::text[])
            )
            or exists (
              select 1
              from pg_catalog.jsonb_each(contact_entry) entry_field(key, value)
              where pg_catalog.jsonb_typeof(entry_field.value) not in ('string', 'null')
            )
            or pg_catalog.length(coalesce(contact_entry ->> 'relationship', '')) > 50
            or pg_catalog.length(coalesce(contact_entry ->> 'name', '')) > 100
            or pg_catalog.length(coalesce(contact_entry ->> 'phone', '')) > 50
            or pg_catalog.length(coalesce(contact_entry ->> 'email', '')) > 320
        )
    end;
$$;

create or replace function app_private.enforce_approved_snapshot_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app_private.approved_snapshot_has_forbidden_key(new.data - 'contact')
    or (
      new.data ? 'contact'
      and not app_private.approved_snapshot_contact_is_safe(new.data -> 'contact')
    )
  then
    raise exception 'approved snapshot contains an owner-only field' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function app_private.approved_snapshot_contact_is_safe(jsonb) from public, anon, authenticated;
revoke all on function app_private.enforce_approved_snapshot_contract() from public, anon, authenticated;

comment on function app_private.approved_snapshot_contact_is_safe(jsonb) is
  'Validates the bounded contact block that an owner may reveal to an approved viewer.';
comment on function app_private.enforce_approved_snapshot_contract() is
  'Allows validated top-level approved contacts while rejecting contact data elsewhere and all other owner-only fields.';
