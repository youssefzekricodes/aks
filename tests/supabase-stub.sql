-- Minimal stand-in for the parts of Supabase the migration relies on.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null);
create table auth.mfa_amr_claims (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references auth.sessions (id) on delete cascade,
  authentication_method text not null,
  created_at timestamptz not null default now()
);
