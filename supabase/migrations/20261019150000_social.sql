-- Facebook / Instagram posts of vehicles.
--
--   cars.social_caption   text of the post (edited in the vehicle form)
--   cars.social_targets   networks to post on when the vehicle is published
--   social_posts          one row per vehicle and network: pending → published | failed.
--                         A vehicle is never posted twice on the same network; failed
--                         posts can be retried. Written only by the `social-publish`
--                         Edge Function (service role), read by admins.

alter table public.cars
  add column social_caption text not null default '' check (length(social_caption) <= 2200),
  add column social_targets text[] not null default '{}'
    check (social_targets <@ array['facebook', 'instagram']::text[]);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  status text not null default 'pending' check (status in ('pending', 'published', 'failed')),
  external_id text,
  permalink text check (permalink is null or permalink ~ '^https://'),
  error text check (length(error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one pending or published post per vehicle and network.
create unique index social_posts_once on public.social_posts (car_id, platform)
  where status in ('pending', 'published');
create index social_posts_car_idx on public.social_posts (car_id, created_at desc);

create trigger social_posts_touch before update on public.social_posts
  for each row execute function public.touch_updated_at();

alter table public.social_posts enable row level security;
create policy "admins read social posts" on public.social_posts
  for select to authenticated using (public.is_admin());

revoke all on public.social_posts from anon, authenticated;
grant select on public.social_posts to authenticated;
