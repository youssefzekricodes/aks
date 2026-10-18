-- Roles and two-factor authentication.
--
-- app_metadata.role:
--   'admin'        — manages the catalogue, content and inquiries (password login)
--   'super_admin'  — same, plus managing administrators; must have passed a
--                    second factor (JWT aal = 'aal2') before ANY admin access.
-- Administrator accounts are managed by the `admin-users` Edge Function (service
-- role inside Supabase), never by the web server.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select case auth.jwt() -> 'app_metadata' ->> 'role'
    when 'admin' then true
    when 'super_admin' then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    else false
  end;
$$;

-- Used by the Edge Function after a password reset or removal: ends every
-- session of that user (refresh tokens go with their session).
create or replace function public.revoke_user_sessions(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
