-- Facebook → website: posts of the showroom Page waiting to be imported.
--   facebook_inbox      one row per Page post read by the `social-publish` Edge Function
--                       ("sync"). The admin imports it as a vehicle, links it to an
--                       existing one, or dismisses it. Written by the Edge Function
--                       (service role) and by facebook_inbox_decide(); read by admins.
--   social_connection.last_synced_at  last successful read of the Page.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.facebook_inbox (
  post_id text primary key check (post_id ~ '^[0-9_]{5,80}$'),
  posted_at timestamptz not null,
  message text not null default '' check (length(message) <= 20000),
  permalink text check (permalink is null or permalink ~ '^https://'),
  -- Photo URLs from Facebook (they expire after a few days; a new sync refreshes them).
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  status text not null default 'new' check (status in ('new', 'imported', 'dismissed')),
  car_id uuid references public.cars (id) on delete set null,
  fetched_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);

create index if not exists facebook_inbox_status_idx
  on public.facebook_inbox (status, posted_at desc);

alter table public.facebook_inbox enable row level security;
drop policy if exists "admins read the facebook inbox" on public.facebook_inbox;
create policy "admins read the facebook inbox" on public.facebook_inbox
  for select to authenticated using (public.is_admin());

revoke all on public.facebook_inbox from anon, authenticated;
grant select on public.facebook_inbox to authenticated;

alter table public.social_connection add column if not exists last_synced_at timestamptz;

-- Decision on a post: 'imported' (with the vehicle created or chosen), 'dismissed',
-- or 'new' (undo). An imported post is also recorded as that vehicle's Facebook post,
-- so the site never shares the same vehicle on the Page again.
create or replace function public.facebook_inbox_decide(p_post_id text, p_status text, p_car_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_permalink text;
begin
  if not public.is_admin() then
    raise exception 'Connexion administrateur requise.' using errcode = '42501';
  end if;
  if p_status not in ('new', 'imported', 'dismissed') then
    raise exception 'Statut inconnu.' using errcode = '22023';
  end if;
  if p_status = 'imported' and not exists (select 1 from public.cars where id = p_car_id) then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;

  update public.facebook_inbox
    set status = p_status,
        car_id = case when p_status = 'imported' then p_car_id else null end,
        decided_at = case when p_status = 'new' then null else now() end,
        decided_by = case when p_status = 'new' then null else auth.uid() end
    where post_id = p_post_id
    returning permalink into v_permalink;
  if not found then
    raise exception 'Publication introuvable.' using errcode = 'P0002';
  end if;

  if p_status = 'imported' and not exists (
    select 1 from public.social_posts
    where car_id = p_car_id and platform = 'facebook' and status in ('pending', 'published')
  ) then
    insert into public.social_posts (car_id, platform, status, external_id, permalink)
      values (p_car_id, 'facebook', 'published', p_post_id, v_permalink);
  end if;
end;
$$;

revoke all on function public.facebook_inbox_decide(text, text, uuid) from public, anon;
grant execute on function public.facebook_inbox_decide(text, text, uuid) to authenticated;
