-- New portfolios use the rashi-aware Royal Heritage template by default.
-- Existing portfolio template IDs remain unchanged.
alter table public.portfolios
  alter column template_id set default 3;
