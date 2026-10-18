-- Sold vehicles, discounts, manual ordering and page views.
--
--   cars.sold            sold: hidden from listings and the sitemap; its page shows "Vendu"
--   cars.sold_at         set automatically when `sold` turns on
--   cars.discount_price  new price when discounted (below `price`), null otherwise
--   car_views            page views per vehicle and day (dashboard "most viewed")

alter table public.cars
  add column sold boolean not null default false,
  add column sold_at timestamptz,
  add column discount_price numeric(12, 0) check (discount_price >= 0);

alter table public.cars
  add constraint cars_discount_below_price check (discount_price is null or discount_price < price);

create index cars_listing_idx on public.cars (published, sold, sort_order);

create or replace function public.stamp_sold_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sold and (tg_op = 'INSERT' or not old.sold) then
    new.sold_at := now();
  elsif not new.sold then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

create trigger cars_sold_at before insert or update of sold on public.cars
  for each row execute function public.stamp_sold_at();

-- ---------------------------------------------------------------- save_car with the new fields

create or replace function public.save_car(p_car jsonb, p_image_keys text[])
returns table (car_id uuid, removed_keys text[])
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_car ->> 'id', '')::uuid;
  v_old text[];
begin
  if not public.is_admin() then
    raise exception 'Connexion administrateur requise.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_image_keys, 1), 0) > 12 then
    raise exception 'Maximum 12 photos par véhicule.' using errcode = '22023';
  end if;
  if (p_car ->> 'discount_price') is not null
    and (p_car ->> 'discount_price')::numeric >= coalesce((p_car ->> 'price')::numeric, 0) then
    raise exception 'Le prix remisé doit être inférieur au prix.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.cars (slug, name, brand, model, version, country, year, price,
      price_on_request, km_value, fuel, gearbox, body, state, transmission, doors, seats,
      fiscal_power, description, published, sort_order, sold, discount_price)
    values (p_car ->> 'slug', p_car ->> 'name', p_car ->> 'brand', p_car ->> 'model',
      p_car ->> 'version', p_car ->> 'country', (p_car ->> 'year')::int,
      coalesce((p_car ->> 'price')::numeric, 0), coalesce((p_car ->> 'price_on_request')::boolean, false),
      coalesce((p_car ->> 'km_value')::int, 0), p_car ->> 'fuel', p_car ->> 'gearbox',
      p_car ->> 'body', p_car ->> 'state', nullif(p_car ->> 'transmission', ''),
      (p_car ->> 'doors')::smallint, (p_car ->> 'seats')::smallint,
      (p_car ->> 'fiscal_power')::smallint, coalesce(p_car ->> 'description', ''),
      coalesce((p_car ->> 'published')::boolean, false),
      -- New vehicles go first unless an order is given.
      coalesce((p_car ->> 'sort_order')::int,
        (select coalesce(min(c.sort_order), 1) - 1 from public.cars c)),
      coalesce((p_car ->> 'sold')::boolean, false), (p_car ->> 'discount_price')::numeric)
    returning id into v_id;
  else
    update public.cars set
      slug = p_car ->> 'slug', name = p_car ->> 'name', brand = p_car ->> 'brand',
      model = p_car ->> 'model', version = p_car ->> 'version', country = p_car ->> 'country',
      year = (p_car ->> 'year')::int, price = coalesce((p_car ->> 'price')::numeric, 0),
      price_on_request = coalesce((p_car ->> 'price_on_request')::boolean, false),
      km_value = coalesce((p_car ->> 'km_value')::int, 0), fuel = p_car ->> 'fuel',
      gearbox = p_car ->> 'gearbox', body = p_car ->> 'body', state = p_car ->> 'state',
      transmission = nullif(p_car ->> 'transmission', ''),
      doors = (p_car ->> 'doors')::smallint, seats = (p_car ->> 'seats')::smallint,
      fiscal_power = (p_car ->> 'fiscal_power')::smallint,
      description = coalesce(p_car ->> 'description', ''),
      published = coalesce((p_car ->> 'published')::boolean, false),
      sort_order = coalesce((p_car ->> 'sort_order')::int, sort_order),
      sold = coalesce((p_car ->> 'sold')::boolean, false),
      discount_price = (p_car ->> 'discount_price')::numeric
    where id = v_id;
    if not found then
      raise exception 'Véhicule introuvable.' using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg(ci.object_key), '{}') into v_old
    from public.car_images ci
    where ci.car_id = v_id and not (ci.object_key = any (coalesce(p_image_keys, '{}')));
  delete from public.car_images ci where ci.car_id = v_id;
  insert into public.car_images (car_id, object_key, position)
    select v_id, k.key, (k.ord - 1)::smallint
    from unnest(coalesce(p_image_keys, '{}')) with ordinality as k(key, ord);

  return query select v_id, v_old;
end;
$$;

-- ---------------------------------------------------------------- manual order

/** Display order from the admin list: the given vehicles get 0, 1, 2… in this order. */
create or replace function public.reorder_cars(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Connexion administrateur requise.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 2000 then
    raise exception 'Trop de véhicules.' using errcode = '22023';
  end if;
  update public.cars c set sort_order = k.ord - 1
    from unnest(p_ids) with ordinality as k(id, ord)
    where c.id = k.id and c.sort_order is distinct from k.ord - 1;
end;
$$;

revoke all on function public.reorder_cars(uuid[]) from public, anon;
grant execute on function public.reorder_cars(uuid[]) to authenticated;

-- ---------------------------------------------------------------- page views

create table public.car_views (
  car_id uuid not null references public.cars (id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0 check (views >= 0),
  primary key (car_id, day)
);

alter table public.car_views enable row level security;
create policy "admins read car views" on public.car_views
  for select to authenticated using (public.is_admin());
revoke all on public.car_views from anon, authenticated;
grant select on public.car_views to authenticated;

/** One view of a published, unsold vehicle page (capped per vehicle to limit abuse). */
create or replace function public.record_car_view(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.cars
    where slug = p_slug and published and not sold;
  if v_id is null then
    return;
  end if;
  perform public.rate_limit('views:' || v_id::text, 300, interval '1 hour');
  insert into public.car_views as v (car_id, day, views) values (v_id, current_date, 1)
    on conflict (car_id, day) do update set views = v.views + 1;
end;
$$;

revoke all on function public.record_car_view(text) from public;
grant execute on function public.record_car_view(text) to anon, authenticated;
