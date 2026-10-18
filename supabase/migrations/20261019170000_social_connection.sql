-- Facebook Page / Instagram connection made from the admin (Connecteurs).
-- Tokens live here, readable only by the service role (the `social-publish`
-- Edge Function): no policies, no grants for anon or authenticated.

create table public.social_connection (
  id boolean primary key default true check (id), -- a single row
  page_id text not null check (page_id ~ '^[0-9]+$'),
  page_name text not null check (length(page_name) <= 200),
  page_picture text check (page_picture is null or page_picture ~ '^https://'),
  page_token text not null,
  ig_user_id text check (ig_user_id is null or ig_user_id ~ '^[0-9]+$'),
  ig_username text check (length(ig_username) <= 100),
  ig_picture text check (ig_picture is null or ig_picture ~ '^https://'),
  connected_by uuid,
  connected_at timestamptz not null default now()
);

-- Long-lived user token kept between "Se connecter avec Facebook" and the choice
-- of the Page (deleted once the Page is chosen; expires after 30 minutes).
create table public.social_oauth_pending (
  user_id uuid primary key,
  user_token text not null,
  expires_at timestamptz not null default now() + interval '30 minutes'
);

alter table public.social_connection enable row level security;
alter table public.social_oauth_pending enable row level security;
revoke all on public.social_connection, public.social_oauth_pending from anon, authenticated;
