-- Private horoscope attachments are a single, separately viewed document per portfolio.
-- They never enter the public snapshot and are readable only by the owner or an
-- identity-bound viewer with an active reveal grant.

create table if not exists public.portfolio_horoscopes (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null unique references public.portfolios(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/webp'
  )),
  file_extension text not null check (file_extension in ('pdf', 'doc', 'docx', 'webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  language_label text check (language_label is null or char_length(language_label) between 1 and 80),
  page_count int check (page_count is null or page_count between 1 and 100),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_horoscopes enable row level security;

create policy "Portfolio managers can manage horoscope attachments"
  on public.portfolio_horoscopes
  for all
  to authenticated
  using (public.can_manage_portfolio(portfolio_id))
  with check (public.can_manage_portfolio(portfolio_id));

create policy "Approved viewers can read published horoscope attachments"
  on public.portfolio_horoscopes
  for select
  to authenticated
  using (
    published_at is not null
    and public.is_published_portfolio(portfolio_id)
    and exists (
      select 1
      from public.reveal_grants grant_record
      where grant_record.portfolio_id = portfolio_horoscopes.portfolio_id
        and grant_record.viewer_user_id = (select auth.uid())
        and grant_record.revoked_at is null
        and (grant_record.expires_at is null or grant_record.expires_at > now())
    )
  );

create trigger portfolio_horoscopes_updated_at
  before update on public.portfolio_horoscopes
  for each row execute function public.update_updated_at();

create index if not exists idx_portfolio_horoscopes_published
  on public.portfolio_horoscopes(portfolio_id, published_at)
  where published_at is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'horoscopes',
  'horoscopes',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners can upload horoscope attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'horoscopes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Owners can read horoscope attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'horoscopes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Owners can update horoscope attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'horoscopes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'horoscopes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Owners can delete horoscope attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'horoscopes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Approved viewers can read horoscope files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'horoscopes'
    and exists (
      select 1
      from public.portfolio_horoscopes horoscope
      where horoscope.storage_path = storage.objects.name
        and horoscope.published_at is not null
        and public.is_published_portfolio(horoscope.portfolio_id)
        and exists (
          select 1
          from public.reveal_grants grant_record
          where grant_record.portfolio_id = horoscope.portfolio_id
            and grant_record.viewer_user_id = (select auth.uid())
            and grant_record.revoked_at is null
            and (grant_record.expires_at is null or grant_record.expires_at > now())
        )
    )
  );

comment on table public.portfolio_horoscopes is
  'One original horoscope attachment per portfolio. Contents never enter public snapshots and require an active identity-bound reveal grant.';
