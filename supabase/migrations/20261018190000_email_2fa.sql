-- Email code as a super admin's second factor.
--
-- Supabase MFA has no email factor, so a super admin proves both factors like this:
--   1. password sign-in            -> session A (amr: password)
--   2. 6-digit code sent by e-mail -> session B (amr: otp), created by verifying the code
--   3. session A calls confirm_email_second_factor(B): B is recorded as two-factor
-- The web server then keeps B and signs A out. Someone with only the password cannot
-- get B; someone with only the mailbox cannot get A. App or SMS factors (aal2) still count.

create table public.admin_second_factor (
  session_id uuid primary key references auth.sessions (id) on delete cascade,
  user_id uuid not null,
  verified_at timestamptz not null default now()
);

alter table public.admin_second_factor enable row level security; -- no policies: functions only
revoke all on public.admin_second_factor from anon, authenticated;

/** True when the caller's session was confirmed with an e-mail code. */
create or replace function public.has_email_second_factor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_second_factor f
    where f.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and f.user_id = auth.uid()
  );
$$;

create or replace function public.confirm_email_second_factor(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if auth.uid() is null or caller_session is null then
    raise exception 'Connexion requise.' using errcode = 'P0001';
  end if;
  -- The caller must be the password session of the same user.
  if not exists (
    select 1 from auth.mfa_amr_claims c
    where c.session_id = caller_session and c.authentication_method = 'password'
  ) then
    raise exception 'Connectez-vous d’abord avec votre mot de passe.' using errcode = 'P0001';
  end if;
  -- The confirmed session: same user, just created from an e-mail code.
  if not exists (
    select 1
    from auth.sessions s
    join auth.mfa_amr_claims c on c.session_id = s.id
    where s.id = p_session_id
      and s.user_id = auth.uid()
      and c.authentication_method in ('otp', 'magiclink')
      and c.created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Code incorrect ou expiré.' using errcode = 'P0001';
  end if;
  insert into public.admin_second_factor (session_id, user_id)
  values (p_session_id, auth.uid())
  on conflict (session_id) do nothing;
end;
$$;

revoke all on function public.has_email_second_factor() from public;
revoke all on function public.confirm_email_second_factor(uuid) from public, anon;
-- is_admin() runs for every visitor (RLS); for anon it simply returns false.
grant execute on function public.has_email_second_factor() to anon, authenticated, service_role;
grant execute on function public.confirm_email_second_factor(uuid) to authenticated;

-- Super admins: app/SMS factor (aal2) or a session confirmed by e-mail code.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select case auth.jwt() -> 'app_metadata' ->> 'role'
    when 'admin' then true
    when 'super_admin' then
      coalesce(auth.jwt() ->> 'aal', '') = 'aal2' or public.has_email_second_factor()
    else false
  end;
$$;
