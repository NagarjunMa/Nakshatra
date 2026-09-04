begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir auth-fixtures.psql

select plan(30);

create function pg_temp.dashboard_payload(
  p_draft_name text,
  p_display_name text,
  p_family_relationship text default 'father',
  p_family_name text default 'Suresh Rao'
)
returns jsonb
language sql
as $$
  select pg_catalog.jsonb_build_object(
    'portfolio', pg_catalog.jsonb_build_object(
      'draft_data', pg_catalog.jsonb_build_object('personal', pg_catalog.jsonb_build_object('name', p_draft_name)),
      'template_id', 1,
      'theme_color', '#17151c',
      'sun_sign', 'kanya',
      'privacy_mode', 'balanced',
      'visibility_settings', '{}'::jsonb
    ),
    'candidate', pg_catalog.jsonb_build_object(
      'display_name', p_display_name,
      'legal_name', p_display_name,
      'gender', 'female',
      'birth_date', '1996-08-12',
      'current_city', 'Boston',
      'current_region', 'MA',
      'current_country', 'USA'
    ),
    'details', pg_catalog.jsonb_build_object(
      'personal', pg_catalog.jsonb_build_object(
        'preferred_name', 'Aditi',
        'marital_status', 'never_married',
        'sibling_count', 1
      ),
      'astrology', pg_catalog.jsonb_build_object(
        'birth_time', '08:30',
        'rashi', 'kanya'
      ),
      'lifestyle', pg_catalog.jsonb_build_object(
        'diet', 'vegetarian',
        'languages', pg_catalog.jsonb_build_array('English', 'Telugu'),
        'hobbies', pg_catalog.jsonb_build_array('Reading'),
        'lifestyle_payload', '{}'::jsonb
      ),
      'preferences', pg_catalog.jsonb_build_object(
        'age_min', 28,
        'age_max', 34,
        'preferences_payload', '{}'::jsonb
      )
    ),
    'visibilityRules', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('section_key', 'family', 'visibility', 'public', 'requires_interest', false),
      pg_catalog.jsonb_build_object('section_key', 'astrology', 'visibility', 'public', 'requires_interest', false),
      pg_catalog.jsonb_build_object('section_key', 'gallery', 'visibility', 'public', 'requires_interest', false),
      pg_catalog.jsonb_build_object('section_key', 'contact', 'visibility', 'interest_required', 'requires_interest', true)
    ),
    'familyMembers', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('relationship', p_family_relationship, 'name', p_family_name)
    ),
    'education', pg_catalog.jsonb_build_object(
      'degree', 'MS', 'institution', 'Example University', 'end_year', 2020, 'sort_order', 0
    ),
    'career', pg_catalog.jsonb_build_object(
      'title', 'Engineer', 'company', 'Example Inc', 'is_current', true, 'sort_order', 0
    )
  );
$$;

select has_function(
  'public', 'save_dashboard_draft_transaction', array['jsonb'],
  'the atomic dashboard draft RPC exists'
);
select ok(
  not has_function_privilege('anon', 'public.save_dashboard_draft_transaction(jsonb)', 'EXECUTE'),
  'anonymous callers cannot save dashboard drafts'
);
select ok(
  has_function_privilege('authenticated', 'public.save_dashboard_draft_transaction(jsonb)', 'EXECUTE'),
  'authenticated callers can save dashboard drafts'
);
select ok(
  not has_function_privilege('authenticated', 'app_private.save_dashboard_draft_transaction(jsonb)', 'EXECUTE'),
  'callers cannot bypass the guarded public wrapper'
);

select pg_temp.create_auth_actor(
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  'owner@draft.test'
);
select pg_temp.create_auth_actor(
  '61000000-0000-4000-8000-000000000002',
  '62000000-0000-4000-8000-000000000002',
  'other@draft.test'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"62000000-0000-4000-8000-000000000001"}';

select is(
  public.save_dashboard_draft_transaction(pg_temp.dashboard_payload('Initial Draft', 'Aditi Rao')) ->> 'status',
  'saved',
  'an owner saves the complete draft graph in one call'
);
select is((select count(*)::integer from public.portfolios), 1, 'the first save creates one portfolio');
select is((select draft_data #>> '{personal,name}' from public.portfolios), 'Initial Draft', 'the JSON draft is saved');
select ok((select candidate_id is not null from public.portfolios), 'the candidate is linked to the portfolio');
select is((select display_name from public.candidates), 'Aditi Rao', 'the candidate source of truth is saved');
select is(
  (select primary_owner_user_id from public.candidates),
  '61000000-0000-4000-8000-000000000001'::uuid,
  'the server binds the candidate to the authenticated owner'
);
select is((select preferred_name from public.candidate_personal_details), 'Aditi', 'personal details are saved');
select is((select rashi from public.candidate_astrology_details), 'kanya', 'astrology details are saved');
select is((select languages[2] from public.candidate_lifestyle_details), 'Telugu', 'lifestyle arrays are saved');
select is((select age_min from public.candidate_partner_preferences), 28, 'partner preferences are saved');
select is((select count(*)::integer from public.visibility_rules), 4, 'all dashboard visibility rules are saved');
select is((select count(*)::integer from public.candidate_family_members), 1, 'family members are saved');
select is((select count(*)::integer from public.candidate_education_entries), 1, 'education history is saved');
select is((select count(*)::integer from public.candidate_career_entries), 1, 'career history is saved');

select is(
  public.save_dashboard_draft_transaction(
    pg_temp.dashboard_payload('Updated Draft', 'Aditi Rao Updated', 'mother', 'Lakshmi Rao')
  ) ->> 'status',
  'saved',
  'a later save updates the same graph'
);
select is((select count(*)::integer from public.candidates), 1, 'a later save reuses the linked candidate');
select is((select display_name from public.candidates), 'Aditi Rao Updated', 'candidate updates are persisted');
select is((select name from public.candidate_family_members), 'Lakshmi Rao', 'relationship rows are replaced');

select throws_ok(
  $$select public.save_dashboard_draft_transaction(
    pg_temp.dashboard_payload('Must Roll Back', 'Must Roll Back', 'uncle', 'Invalid Relation')
  )$$,
  '22023',
  'invalid family member payload',
  'a late relationship failure aborts the whole save'
);
select is((select draft_data #>> '{personal,name}' from public.portfolios), 'Updated Draft', 'a failed save rolls back the portfolio write');
select is((select display_name from public.candidates), 'Aditi Rao Updated', 'a failed save rolls back the candidate write');
select is((select name from public.candidate_family_members), 'Lakshmi Rao', 'a failed save preserves prior relationship rows');

set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"62000000-0000-4000-8000-000000000002"}';
select is(
  public.save_dashboard_draft_transaction(
    pg_catalog.jsonb_set(
      pg_temp.dashboard_payload('Other Draft', 'Other Owner'),
      '{portfolio,id}',
      to_jsonb('63000000-0000-4000-8000-000000000001'::text),
      true
    )
  ) ->> 'status',
  'saved',
  'an unrelated owner can save only into their own account scope'
);

reset role;
set local role service_role;
select is(
  (select draft_data #>> '{personal,name}' from public.portfolios where user_id = '61000000-0000-4000-8000-000000000001'),
  'Updated Draft',
  'an unrelated save cannot target the first owner portfolio'
);
select is(
  (select count(*)::integer from public.portfolios where user_id = '61000000-0000-4000-8000-000000000002'),
  1,
  'the unrelated owner receives a separate portfolio'
);

reset role;
delete from auth.sessions where id = '62000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"62000000-0000-4000-8000-000000000001"}';
select throws_ok(
  $$select public.save_dashboard_draft_transaction(pg_temp.dashboard_payload('Revoked', 'Revoked'))$$,
  '42501',
  'authentication session is no longer active',
  'a revoked session cannot save a draft'
);

reset role;
select * from finish();
rollback;
