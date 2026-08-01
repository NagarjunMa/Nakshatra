-- Celestial Union is the only supported portfolio template.
alter table public.portfolios
  alter column template_id set default 1;

update public.portfolios
set
  template_id = 1,
  draft_data = jsonb_set(
    coalesce(draft_data, '{}'::jsonb),
    '{style}',
    coalesce(draft_data -> 'style', '{}'::jsonb) ||
      '{"template_name":"Celestial Union"}'::jsonb,
    true
  ),
  published_data = case
    when published_data is null then null
    else jsonb_set(
      published_data,
      '{style}',
      coalesce(published_data -> 'style', '{}'::jsonb) ||
        '{"template_name":"Celestial Union"}'::jsonb,
      true
    )
  end;

update public.public_portfolio_snapshots
set
  template_id = 1,
  data = jsonb_set(
    coalesce(data, '{}'::jsonb),
    '{style}',
    coalesce(data -> 'style', '{}'::jsonb) ||
      '{"template_name":"Celestial Union"}'::jsonb,
    true
  );
