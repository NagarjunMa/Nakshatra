-- GeoNames-backed reference data for dependent country, region, and city fields.
-- Data is loaded separately with scripts/import-geonames.mjs so schema migrations
-- remain small and repeatable.

create table if not exists public.reference_countries (
  country_code text primary key check (char_length(country_code) = 2),
  name text not null,
  geoname_id bigint unique,
  phone_code text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.reference_regions (
  geoname_id bigint primary key,
  country_code text not null references public.reference_countries(country_code)
    on update cascade on delete restrict,
  region_code text not null,
  name text not null,
  ascii_name text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (country_code, region_code)
);

create table if not exists public.reference_cities (
  geoname_id bigint primary key,
  country_code text not null references public.reference_countries(country_code)
    on update cascade on delete restrict,
  region_code text,
  name text not null,
  ascii_name text,
  alternative_names text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  population bigint not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists reference_regions_country_name_idx
  on public.reference_regions (country_code, name);
create index if not exists reference_cities_country_region_population_idx
  on public.reference_cities (country_code, region_code, population desc);
create index if not exists reference_cities_country_name_idx
  on public.reference_cities (country_code, name);

alter table public.reference_countries enable row level security;
alter table public.reference_regions enable row level security;
alter table public.reference_cities enable row level security;

drop policy if exists "Authenticated users can read reference countries"
  on public.reference_countries;
create policy "Authenticated users can read reference countries"
  on public.reference_countries for select
  to authenticated
  using (is_active);

drop policy if exists "Authenticated users can read reference regions"
  on public.reference_regions;
create policy "Authenticated users can read reference regions"
  on public.reference_regions for select
  to authenticated
  using (is_active);

drop policy if exists "Authenticated users can read reference cities"
  on public.reference_cities;
create policy "Authenticated users can read reference cities"
  on public.reference_cities for select
  to authenticated
  using (is_active);

grant select on public.reference_countries to authenticated;
grant select on public.reference_regions to authenticated;
grant select on public.reference_cities to authenticated;

comment on table public.reference_countries is
  'Country reference records imported from GeoNames countryInfo.txt.';
comment on table public.reference_regions is
  'First-level administrative divisions imported from GeoNames admin1CodesASCII.txt.';
comment on table public.reference_cities is
  'Populated places imported from GeoNames cities500.zip.';
