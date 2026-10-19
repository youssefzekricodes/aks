-- Home page showcase ("Vitrine"): the vehicles chosen by the admins, in their order.
--   cars.featured_rank  position in the showcase (0 = first); null = not in the showcase.
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.cars
  add column if not exists featured_rank integer check (featured_rank between 0 and 1000);

create index if not exists cars_featured_idx on public.cars (featured_rank)
  where featured_rank is not null;

-- The whole showcase in one go: these vehicles get 0, 1, 2… in this order, the
-- others leave it. Admins only (RLS on cars applies too).
create or replace function public.set_vitrine(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Connexion administrateur requise.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 100 then
    raise exception 'Maximum 100 véhicules en vitrine.' using errcode = '22023';
  end if;
  update public.cars c set featured_rank = null
    where c.featured_rank is not null and not (c.id = any (coalesce(p_ids, '{}')));
  update public.cars c set featured_rank = (k.ord - 1)::int
    from unnest(coalesce(p_ids, '{}')) with ordinality as k(id, ord)
    where c.id = k.id;
end;
$$;

revoke all on function public.set_vitrine(uuid[]) from public, anon;
grant execute on function public.set_vitrine(uuid[]) to authenticated;
