-- Full Facebook galleries: up to 40 photos per vehicle (was 12).
-- Run once in the Supabase SQL editor. Safe to re-run.

do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.car_images'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%position%'
  loop
    execute format('alter table public.car_images drop constraint %I', v_name);
  end loop;
end;
$$;

alter table public.car_images
  add constraint car_images_position_check check (position between 0 and 39);

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
  if coalesce(array_length(p_image_keys, 1), 0) > 40 then
    raise exception 'Maximum 40 photos par véhicule.' using errcode = '22023';
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

revoke all on function public.save_car(jsonb, text[]) from public, anon;
grant execute on function public.save_car(jsonb, text[]) to authenticated;
