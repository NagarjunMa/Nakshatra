-- Persist a dashboard draft and its relational projection as one transaction.
-- The implementation is private; the public RPC is a live-session guard only.

create or replace function app_private.save_dashboard_draft_transaction(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  portfolio_payload jsonb;
  candidate_payload jsonb;
  details_payload jsonb;
  personal_payload jsonb;
  astrology_payload jsonb;
  lifestyle_payload jsonb;
  preferences_payload jsonb;
  visibility_payload jsonb;
  family_payload jsonb;
  education_payload jsonb;
  career_payload jsonb;
  portfolio_record public.portfolios%rowtype;
  candidate_record public.candidates%rowtype;
  visibility_rule jsonb;
  replacement_status text;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid dashboard draft payload' using errcode = '22023';
  end if;

  portfolio_payload := p_payload -> 'portfolio';
  candidate_payload := p_payload -> 'candidate';
  details_payload := p_payload -> 'details';
  visibility_payload := coalesce(p_payload -> 'visibilityRules', '[]'::jsonb);
  family_payload := coalesce(p_payload -> 'familyMembers', '[]'::jsonb);
  education_payload := p_payload -> 'education';
  career_payload := p_payload -> 'career';

  if portfolio_payload is null
    or coalesce(pg_catalog.jsonb_typeof(portfolio_payload), '') <> 'object'
    or coalesce(pg_catalog.jsonb_typeof(portfolio_payload -> 'draft_data'), '') <> 'object'
    or coalesce(pg_catalog.jsonb_typeof(portfolio_payload -> 'visibility_settings'), '') <> 'object'
    or coalesce((portfolio_payload ->> 'template_id')::integer, 0) < 1
    or portfolio_payload ->> 'privacy_mode' not in ('open', 'balanced', 'private')
    or pg_catalog.octet_length((portfolio_payload -> 'draft_data')::text) > 1048576
    or pg_catalog.length(coalesce(portfolio_payload ->> 'theme_color', '')) > 80
    or pg_catalog.length(coalesce(portfolio_payload ->> 'sun_sign', '')) > 80
  then
    raise exception 'invalid portfolio draft payload' using errcode = '22023';
  end if;

  if coalesce(pg_catalog.jsonb_typeof(visibility_payload), '') <> 'array'
    or pg_catalog.jsonb_array_length(visibility_payload) > 16
    or coalesce(pg_catalog.jsonb_typeof(family_payload), '') <> 'array'
    or (education_payload is not null and education_payload <> 'null'::jsonb
      and pg_catalog.jsonb_typeof(education_payload) <> 'object')
    or (career_payload is not null and career_payload <> 'null'::jsonb
      and pg_catalog.jsonb_typeof(career_payload) <> 'object')
  then
    raise exception 'invalid dashboard relationship payload' using errcode = '22023';
  end if;

  -- Serialize first-save races for one account before selecting or inserting
  -- its unique portfolio row.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_id::text || ':dashboard_draft', 0)
  );

  select portfolio.* into portfolio_record
  from public.portfolios portfolio
  where portfolio.user_id = actor_id
  for update;

  if portfolio_record.id is null then
    insert into public.portfolios (
      user_id, draft_data, template_id, theme_color, sun_sign,
      privacy_mode, visibility_settings
    ) values (
      actor_id,
      portfolio_payload -> 'draft_data',
      (portfolio_payload ->> 'template_id')::integer,
      nullif(portfolio_payload ->> 'theme_color', ''),
      nullif(portfolio_payload ->> 'sun_sign', ''),
      (portfolio_payload ->> 'privacy_mode')::public.portfolio_privacy_mode,
      portfolio_payload -> 'visibility_settings'
    ) returning * into portfolio_record;
  else
    update public.portfolios
    set draft_data = portfolio_payload -> 'draft_data',
        template_id = (portfolio_payload ->> 'template_id')::integer,
        theme_color = coalesce(
          nullif(portfolio_payload ->> 'theme_color', ''),
          portfolio_record.theme_color
        ),
        sun_sign = nullif(portfolio_payload ->> 'sun_sign', ''),
        privacy_mode = (portfolio_payload ->> 'privacy_mode')::public.portfolio_privacy_mode,
        visibility_settings = portfolio_payload -> 'visibility_settings'
    where id = portfolio_record.id
    returning * into portfolio_record;
  end if;

  -- A blank first step intentionally saves only the JSON draft, matching the
  -- existing guided-editor behavior.
  if candidate_payload is null or candidate_payload = 'null'::jsonb then
    return pg_catalog.jsonb_build_object(
      'status', 'saved',
      'portfolioId', portfolio_record.id,
      'candidateId', null
    );
  end if;

  if coalesce(pg_catalog.jsonb_typeof(candidate_payload), '') <> 'object'
    or details_payload is null
    or coalesce(pg_catalog.jsonb_typeof(details_payload), '') <> 'object'
    or pg_catalog.length(pg_catalog.btrim(coalesce(candidate_payload ->> 'display_name', ''))) not between 1 and 180
    or pg_catalog.length(coalesce(candidate_payload ->> 'legal_name', '')) > 180
    or pg_catalog.length(coalesce(candidate_payload ->> 'gender', '')) > 80
    or pg_catalog.length(coalesce(candidate_payload ->> 'current_city', '')) > 180
    or pg_catalog.length(coalesce(candidate_payload ->> 'current_region', '')) > 180
    or pg_catalog.length(coalesce(candidate_payload ->> 'current_country', '')) > 180
  then
    raise exception 'invalid candidate draft payload' using errcode = '22023';
  end if;

  personal_payload := details_payload -> 'personal';
  astrology_payload := details_payload -> 'astrology';
  lifestyle_payload := details_payload -> 'lifestyle';
  preferences_payload := details_payload -> 'preferences';

  if coalesce(pg_catalog.jsonb_typeof(personal_payload), '') <> 'object'
    or coalesce(pg_catalog.jsonb_typeof(astrology_payload), '') <> 'object'
    or coalesce(pg_catalog.jsonb_typeof(lifestyle_payload), '') <> 'object'
    or coalesce(pg_catalog.jsonb_typeof(preferences_payload), '') <> 'object'
    or pg_catalog.jsonb_typeof(coalesce(lifestyle_payload -> 'languages', '[]'::jsonb)) <> 'array'
    or pg_catalog.jsonb_typeof(coalesce(lifestyle_payload -> 'hobbies', '[]'::jsonb)) <> 'array'
    or pg_catalog.jsonb_typeof(coalesce(lifestyle_payload -> 'lifestyle_payload', '{}'::jsonb)) <> 'object'
    or pg_catalog.jsonb_typeof(coalesce(preferences_payload -> 'preferences_payload', '{}'::jsonb)) <> 'object'
  then
    raise exception 'invalid candidate details payload' using errcode = '22023';
  end if;

  if portfolio_record.candidate_id is null then
    insert into public.candidates (
      display_name, legal_name, gender, birth_date, current_city,
      current_region, current_country, primary_owner_user_id, created_by
    ) values (
      pg_catalog.btrim(candidate_payload ->> 'display_name'),
      nullif(candidate_payload ->> 'legal_name', ''),
      nullif(candidate_payload ->> 'gender', ''),
      nullif(candidate_payload ->> 'birth_date', '')::date,
      nullif(candidate_payload ->> 'current_city', ''),
      nullif(candidate_payload ->> 'current_region', ''),
      nullif(candidate_payload ->> 'current_country', ''),
      actor_id,
      actor_id
    ) returning * into candidate_record;

    update public.portfolios
    set candidate_id = candidate_record.id
    where id = portfolio_record.id;
  else
    select candidate.* into candidate_record
    from public.candidates candidate
    where candidate.id = portfolio_record.candidate_id
      and public.owns_candidate(candidate.id)
    for update;

    if candidate_record.id is null then
      raise exception 'candidate is not managed by portfolio owner' using errcode = '42501';
    end if;

    update public.candidates
    set display_name = pg_catalog.btrim(candidate_payload ->> 'display_name'),
        legal_name = nullif(candidate_payload ->> 'legal_name', ''),
        gender = nullif(candidate_payload ->> 'gender', ''),
        birth_date = nullif(candidate_payload ->> 'birth_date', '')::date,
        current_city = nullif(candidate_payload ->> 'current_city', ''),
        current_region = nullif(candidate_payload ->> 'current_region', ''),
        current_country = nullif(candidate_payload ->> 'current_country', '')
    where id = candidate_record.id
    returning * into candidate_record;
  end if;

  insert into public.candidate_personal_details (
    candidate_id, preferred_name, marital_status, height_text, complexion,
    birthplace, immigration_status, relocation_preference, about,
    values_statement, profile_for, citizenship, religion, community,
    sub_community, long_term_goals, shared_life_plans, sibling_count,
    sibling_position, parents_location
  ) values (
    candidate_record.id,
    nullif(personal_payload ->> 'preferred_name', ''),
    nullif(personal_payload ->> 'marital_status', ''),
    nullif(personal_payload ->> 'height_text', ''),
    nullif(personal_payload ->> 'complexion', ''),
    nullif(personal_payload ->> 'birthplace', ''),
    nullif(personal_payload ->> 'immigration_status', ''),
    nullif(personal_payload ->> 'relocation_preference', ''),
    nullif(personal_payload ->> 'about', ''),
    nullif(personal_payload ->> 'values_statement', ''),
    nullif(personal_payload ->> 'profile_for', ''),
    nullif(personal_payload ->> 'citizenship', ''),
    nullif(personal_payload ->> 'religion', ''),
    nullif(personal_payload ->> 'community', ''),
    nullif(personal_payload ->> 'sub_community', ''),
    nullif(personal_payload ->> 'long_term_goals', ''),
    nullif(personal_payload ->> 'shared_life_plans', ''),
    nullif(personal_payload ->> 'sibling_count', '')::integer,
    nullif(personal_payload ->> 'sibling_position', ''),
    nullif(personal_payload ->> 'parents_location', '')
  ) on conflict (candidate_id) do update set
    preferred_name = excluded.preferred_name,
    marital_status = excluded.marital_status,
    height_text = excluded.height_text,
    complexion = excluded.complexion,
    birthplace = excluded.birthplace,
    immigration_status = excluded.immigration_status,
    relocation_preference = excluded.relocation_preference,
    about = excluded.about,
    values_statement = excluded.values_statement,
    profile_for = excluded.profile_for,
    citizenship = excluded.citizenship,
    religion = excluded.religion,
    community = excluded.community,
    sub_community = excluded.sub_community,
    long_term_goals = excluded.long_term_goals,
    shared_life_plans = excluded.shared_life_plans,
    sibling_count = excluded.sibling_count,
    sibling_position = excluded.sibling_position,
    parents_location = excluded.parents_location;

  insert into public.candidate_astrology_details (
    candidate_id, birth_time, birth_place, rashi, nakshatra, pada, lagnam,
    gothram, maternal_gothram, manglik_status
  ) values (
    candidate_record.id,
    nullif(astrology_payload ->> 'birth_time', '')::time,
    nullif(astrology_payload ->> 'birth_place', ''),
    nullif(astrology_payload ->> 'rashi', ''),
    nullif(astrology_payload ->> 'nakshatra', ''),
    nullif(astrology_payload ->> 'pada', ''),
    nullif(astrology_payload ->> 'lagnam', ''),
    nullif(astrology_payload ->> 'gothram', ''),
    nullif(astrology_payload ->> 'maternal_gothram', ''),
    nullif(astrology_payload ->> 'manglik_status', '')
  ) on conflict (candidate_id) do update set
    birth_time = excluded.birth_time,
    birth_place = excluded.birth_place,
    rashi = excluded.rashi,
    nakshatra = excluded.nakshatra,
    pada = excluded.pada,
    lagnam = excluded.lagnam,
    gothram = excluded.gothram,
    maternal_gothram = excluded.maternal_gothram,
    manglik_status = excluded.manglik_status;

  insert into public.candidate_lifestyle_details (
    candidate_id, diet, smoking, drinking, languages, hobbies, music,
    lifestyle_payload
  ) values (
    candidate_record.id,
    nullif(lifestyle_payload ->> 'diet', ''),
    nullif(lifestyle_payload ->> 'smoking', ''),
    nullif(lifestyle_payload ->> 'drinking', ''),
    array(select pg_catalog.jsonb_array_elements_text(coalesce(lifestyle_payload -> 'languages', '[]'::jsonb))),
    array(select pg_catalog.jsonb_array_elements_text(coalesce(lifestyle_payload -> 'hobbies', '[]'::jsonb))),
    nullif(lifestyle_payload ->> 'music', ''),
    coalesce(lifestyle_payload -> 'lifestyle_payload', '{}'::jsonb)
  ) on conflict (candidate_id) do update set
    diet = excluded.diet,
    smoking = excluded.smoking,
    drinking = excluded.drinking,
    languages = excluded.languages,
    hobbies = excluded.hobbies,
    music = excluded.music,
    lifestyle_payload = excluded.lifestyle_payload;

  insert into public.candidate_partner_preferences (
    candidate_id, age_min, age_max, height_min_text, marital_status,
    community, location_preference, narrative, preferences_payload
  ) values (
    candidate_record.id,
    nullif(preferences_payload ->> 'age_min', '')::integer,
    nullif(preferences_payload ->> 'age_max', '')::integer,
    nullif(preferences_payload ->> 'height_min_text', ''),
    nullif(preferences_payload ->> 'marital_status', ''),
    nullif(preferences_payload ->> 'community', ''),
    nullif(preferences_payload ->> 'location_preference', ''),
    nullif(preferences_payload ->> 'narrative', ''),
    coalesce(preferences_payload -> 'preferences_payload', '{}'::jsonb)
  ) on conflict (candidate_id) do update set
    age_min = excluded.age_min,
    age_max = excluded.age_max,
    height_min_text = excluded.height_min_text,
    marital_status = excluded.marital_status,
    community = excluded.community,
    location_preference = excluded.location_preference,
    narrative = excluded.narrative,
    preferences_payload = excluded.preferences_payload;

  for visibility_rule in
    select value from pg_catalog.jsonb_array_elements(visibility_payload)
  loop
    if coalesce(pg_catalog.jsonb_typeof(visibility_rule), '') <> 'object'
      or visibility_rule ->> 'section_key' not in ('family', 'astrology', 'gallery', 'contact')
      or visibility_rule ->> 'visibility' not in (
        'public', 'blurred', 'interest_required', 'approved_only', 'owner_only', 'hidden'
      )
      or coalesce(pg_catalog.jsonb_typeof(visibility_rule -> 'requires_interest'), '') <> 'boolean'
    then
      raise exception 'invalid visibility rule payload' using errcode = '22023';
    end if;

    insert into public.visibility_rules (
      portfolio_id, section_key, visibility, requires_interest
    ) values (
      portfolio_record.id,
      visibility_rule ->> 'section_key',
      (visibility_rule ->> 'visibility')::public.visibility_level,
      (visibility_rule ->> 'requires_interest')::boolean
    ) on conflict (portfolio_id, section_key) do update set
      visibility = excluded.visibility,
      requires_interest = excluded.requires_interest;
  end loop;

  replacement_status := app_private.replace_candidate_relationships_and_timeline(
    candidate_record.id,
    family_payload,
    case when education_payload = 'null'::jsonb then null else education_payload end,
    case when career_payload = 'null'::jsonb then null else career_payload end
  );
  if replacement_status <> 'updated' then
    raise exception 'candidate relationship replacement failed' using errcode = 'P0001';
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'saved',
    'portfolioId', portfolio_record.id,
    'candidateId', candidate_record.id
  );
end;
$$;

revoke all on function app_private.save_dashboard_draft_transaction(jsonb)
  from public, anon, authenticated;

create or replace function public.save_dashboard_draft_transaction(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_current_session();
  return app_private.save_dashboard_draft_transaction(p_payload);
end;
$$;

revoke all on function public.save_dashboard_draft_transaction(jsonb)
  from public, anon, authenticated;
grant execute on function public.save_dashboard_draft_transaction(jsonb)
  to authenticated;

comment on function public.save_dashboard_draft_transaction(jsonb) is
  'Atomically saves the authenticated owner dashboard draft and relational candidate projection.';
