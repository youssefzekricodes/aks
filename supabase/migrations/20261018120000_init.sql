-- Auto Kontor Sfax — initial schema (fresh setup, no data migration).
--
-- Security model
-- * The web server talks to Supabase with the anon (publishable) key and, for
--   admins, the signed-in user's JWT. Row Level Security decides everything.
-- * Admins are Supabase Auth users whose app_metadata.role = 'admin'
--   (app_metadata can only be written with the service-role key, i.e. by
--   scripts/create-admin.ts, never by the browser or the web server).
-- * The public can read published cars, their images, site content and brand
--   logos, and can create inquiries only through submit_lead() (validated and
--   rate limited). Nothing else is reachable anonymously.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- cars

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 200),
  name text not null check (length(name) between 1 and 200),
  brand text not null check (length(brand) between 1 and 200),
  model text check (length(model) <= 200),
  version text check (length(version) <= 200),
  country text not null check (length(country) between 1 and 200),
  year integer not null check (year between 1900 and 2100),
  price numeric(12, 0) not null default 0 check (price between 0 and 1000000000),
  price_on_request boolean not null default false,
  km_value integer not null default 0 check (km_value between 0 and 100000000),
  fuel text not null check (length(fuel) between 1 and 200),
  gearbox text not null check (length(gearbox) between 1 and 200),
  body text not null check (length(body) between 1 and 200),
  state text not null check (length(state) between 1 and 200),
  transmission text check (length(transmission) <= 200),
  doors smallint check (doors between 0 and 9),
  seats smallint check (seats between 0 and 60),
  fiscal_power smallint check (fiscal_power between 0 and 100),
  description text not null default '' check (length(description) <= 20000),
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cars_public_idx on public.cars (published, sort_order);
create index cars_brand_idx on public.cars (brand);
create trigger cars_touch before update on public.cars
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- car images (objects in R2)

create table public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  object_key text not null unique check (object_key ~ '^vehicles/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  position smallint not null check (position between 0 and 11),
  created_at timestamptz not null default now(),
  unique (car_id, position) deferrable initially deferred
);

create index car_images_car_idx on public.car_images (car_id, position);

-- ---------------------------------------------------------------- brand logos (objects in R2)

create table public.brand_logos (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  object_key text not null unique check (object_key ~ '^brands/[a-z0-9-]+/[0-9a-f-]{36}\.(png|webp)$'),
  updated_at timestamptz not null default now()
);

create trigger brand_logos_touch before update on public.brand_logos
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- site content (CMS)

create table public.site_content (
  key text primary key check (length(key) between 1 and 100),
  value text not null check (length(value) <= 200000),
  updated_at timestamptz not null default now()
);

create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- leads (contact requests)

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  phone text not null check (length(phone) between 5 and 40),
  email text check (length(email) <= 254),
  message text check (length(message) <= 5000),
  car_slug text check (length(car_slug) <= 200),
  handled boolean not null default false,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index leads_created_idx on public.leads (created_at desc);
create index leads_open_idx on public.leads (handled, created_at desc);

-- ---------------------------------------------------------------- rate limits (internal)

create table public.rate_limits (
  key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------- row level security

alter table public.cars enable row level security;
alter table public.car_images enable row level security;
alter table public.brand_logos enable row level security;
alter table public.site_content enable row level security;
alter table public.leads enable row level security;
alter table public.rate_limits enable row level security; -- no policies: internal only

create policy "published cars are public" on public.cars
  for select to anon, authenticated using (published or public.is_admin());
create policy "admins manage cars" on public.cars
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "images of published cars are public" on public.car_images
  for select to anon, authenticated
  using (public.is_admin() or exists (
    select 1 from public.cars c where c.id = car_id and c.published
  ));
create policy "admins manage car images" on public.car_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "brand logos are public" on public.brand_logos
  for select to anon, authenticated using (true);
create policy "admins manage brand logos" on public.brand_logos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "site content is public" on public.site_content
  for select to anon, authenticated using (true);
create policy "admins manage site content" on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Leads: no anonymous access at all; inserts go through submit_lead().
create policy "admins read leads" on public.leads
  for select to authenticated using (public.is_admin());
create policy "admins update leads" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete leads" on public.leads
  for delete to authenticated using (public.is_admin());

-- Table privileges (RLS still applies on top of these).
revoke all on public.cars, public.car_images, public.brand_logos, public.site_content,
  public.leads, public.rate_limits from anon, authenticated;
grant select on public.cars, public.car_images, public.brand_logos, public.site_content
  to anon, authenticated;
grant insert, update, delete on public.cars, public.car_images, public.brand_logos,
  public.site_content to authenticated;
grant select, update, delete on public.leads to authenticated;

-- ---------------------------------------------------------------- public inquiry endpoint

create or replace function public.rate_limit(p_key text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts integer;
begin
  delete from public.rate_limits where expires_at <= now();
  insert into public.rate_limits as r (key, attempts, expires_at)
    values (p_key, 1, now() + p_window)
    on conflict (key) do update set attempts = r.attempts + 1
    returning attempts into current_attempts;
  if current_attempts > p_max then
    raise exception 'Trop de tentatives. Veuillez réessayer plus tard.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.submit_lead(
  p_name text,
  p_phone text,
  p_email text default null,
  p_message text default null,
  p_car_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  lead_id uuid;
  clean_phone text := btrim(coalesce(p_phone, ''));
begin
  if length(btrim(coalesce(p_name, ''))) not between 1 and 200
     or length(clean_phone) not between 5 and 40
     or length(coalesce(p_email, '')) > 254
     or length(coalesce(p_message, '')) > 5000
     or length(coalesce(p_car_slug, '')) > 200 then
    raise exception 'Demande non valide.' using errcode = '22023';
  end if;
  perform public.rate_limit('leads:global', 100, interval '1 hour');
  perform public.rate_limit('leads:' || clean_phone, 5, interval '1 hour');
  insert into public.leads (name, phone, email, message, car_slug)
    values (btrim(p_name), clean_phone, nullif(btrim(p_email), ''), nullif(p_message, ''),
            nullif(p_car_slug, ''))
    returning id into lead_id;
  return lead_id;
end;
$$;

revoke all on function public.rate_limit(text, integer, interval) from public, anon, authenticated;
revoke all on function public.submit_lead(text, text, text, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------- admin: save a car and its photos atomically
-- SECURITY INVOKER: runs with the caller's rights, so RLS (admins only) applies.
-- Returns the car id and the object keys that are no longer used (to delete from R2).

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

  if v_id is null then
    insert into public.cars (slug, name, brand, model, version, country, year, price,
      price_on_request, km_value, fuel, gearbox, body, state, transmission, doors, seats,
      fiscal_power, description, published, sort_order)
    values (p_car ->> 'slug', p_car ->> 'name', p_car ->> 'brand', p_car ->> 'model',
      p_car ->> 'version', p_car ->> 'country', (p_car ->> 'year')::int,
      coalesce((p_car ->> 'price')::numeric, 0), coalesce((p_car ->> 'price_on_request')::boolean, false),
      coalesce((p_car ->> 'km_value')::int, 0), p_car ->> 'fuel', p_car ->> 'gearbox',
      p_car ->> 'body', p_car ->> 'state', nullif(p_car ->> 'transmission', ''),
      (p_car ->> 'doors')::smallint, (p_car ->> 'seats')::smallint,
      (p_car ->> 'fiscal_power')::smallint, coalesce(p_car ->> 'description', ''),
      coalesce((p_car ->> 'published')::boolean, false), coalesce((p_car ->> 'sort_order')::int, 0))
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
      sort_order = coalesce((p_car ->> 'sort_order')::int, 0)
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
