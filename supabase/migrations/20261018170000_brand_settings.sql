-- Brand display settings, edited in the admin (Marques).
--   hidden         — left out of the home carousel and the /marques page
--   favorite_rank  — favourites come first in the carousel, in this order (null = not a favourite)
-- Names and bundled logos live in the code registry; uploaded logos in brand_logos.

create table public.brand_settings (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  hidden boolean not null default false,
  favorite_rank smallint check (favorite_rank between 1 and 1000),
  updated_at timestamptz not null default now()
);

create trigger brand_settings_touch before update on public.brand_settings
  for each row execute function public.touch_updated_at();

alter table public.brand_settings enable row level security;

create policy "brand settings are public" on public.brand_settings
  for select to anon, authenticated using (true);
create policy "admins manage brand settings" on public.brand_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.brand_settings from anon, authenticated;
grant select on public.brand_settings to anon, authenticated;
grant insert, update, delete on public.brand_settings to authenticated;

-- Every brand shown on the site, visible and not a favourite.
insert into public.brand_settings (slug) values
  ('alfa-romeo'),
  ('audi'),
  ('avantier'),
  ('baic'),
  ('bako'),
  ('bmw'),
  ('byd'),
  ('cenntro'),
  ('changan'),
  ('chery'),
  ('chevrolet'),
  ('citroen'),
  ('cupra'),
  ('dacia'),
  ('deepal'),
  ('dfsk'),
  ('dongfeng'),
  ('ds-automobiles'),
  ('faw'),
  ('fiat'),
  ('foday'),
  ('ford'),
  ('foton'),
  ('gac'),
  ('geely'),
  ('gwm'),
  ('honda'),
  ('hyundai'),
  ('im-motors'),
  ('isuzu'),
  ('jac'),
  ('jaguar'),
  ('jeep'),
  ('jetour'),
  ('jmc'),
  ('jmev'),
  ('kgm'),
  ('kia'),
  ('land-rover'),
  ('lexus'),
  ('lynk-co'),
  ('m-hero'),
  ('mahindra'),
  ('maserati'),
  ('mazda'),
  ('mercedes-benz'),
  ('mg'),
  ('mini'),
  ('mitsubishi'),
  ('nissan'),
  ('omoda-jaecoo'),
  ('opel'),
  ('peugeot'),
  ('porsche'),
  ('renault'),
  ('seat'),
  ('skoda'),
  ('subaru'),
  ('suzuki'),
  ('tata'),
  ('tesla'),
  ('toyota'),
  ('volkswagen'),
  ('volvo'),
  ('voyah'),
  ('wallyscar'),
  ('xpeng')
on conflict (slug) do nothing;
