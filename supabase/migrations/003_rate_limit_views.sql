-- Rate-limited view tracking: max 1 view per hour per portfolio

create or replace function public.record_view(p_portfolio_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from public.portfolio_views
    where portfolio_id = p_portfolio_id
    and viewed_at > now() - interval '1 hour'
  ) then
    insert into public.portfolio_views (portfolio_id) values (p_portfolio_id);
  end if;
end;
$$ language plpgsql security definer;
