# Security — Auto Kontor Sfax

How the application protects itself, what is knowingly out of scope, and the operational
runbooks for secrets, credentials and incidents. Everything here is verifiable in the
code paths named next to it.

## 1. Trust boundaries

| Zone                                                | Who reaches it      | Protection                                                                                                                             |
| --------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Public pages (`/`, `/recherche`, `/vehicule/:slug`) | Anyone              | Read-only, published rows only                                                                                                         |
| Contact form                                        | Anyone              | Origin check + per-phone and global rate limits + Zod validation                                                                       |
| `/auth` login                                       | Anyone              | Supabase Auth (rate limited), generic error message, admin role required                                                               |
| `/admin` and every admin server function            | Administrators only | `adminClient()` on the server, `checkOrigin()` for writes, and RLS (`is_admin()`) in the database; the route guard is only a UX nicety |
| Database                                            | Supabase            | RLS on every table; anonymous access limited to published data and `submit_lead()`                                                     |
| Images                                              | Cloudflare R2       | Public read; writes only through 5-minute presigned URLs issued to admins, verified before use                                         |

The client is never trusted: hiding a button or guarding a route does not grant or deny
access, because every read and write re-checks authorization in `src/server/repository.ts`
and again through Row Level Security in Postgres.

One consequence worth knowing: `GET /admin` answers **HTTP 200** to an anonymous visitor.
The dashboard and the login page are `ssr: false`, so the server returns only the empty
application shell (about 13 KB) and the browser then redirects to `/auth`; no lead, vehicle,
content or account data is present in that HTML, and the server functions that would fetch it
all refuse without a session. A 200 here is therefore expected, not a bypass.

## 2. Controls in place

| Control                       | Implementation                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts and passwords        | Supabase Auth (bcrypt); roles `admin` / `super_admin` in `app_metadata`, writable only with the service-role key (scripts, `admin-users` Edge Function)                                |
| Two-factor authentication     | Mandatory for super admins (Supabase MFA: authenticator app or SMS); RLS `is_admin()` requires JWT `aal2` for them, as do the web server and the Edge Function                         |
| Administrator management      | `admin-users` Edge Function: caller must be super_admin with aal2; cannot demote/delete self or remove the last super admin; a password reset revokes the target's sessions            |
| Account enumeration           | Identical error for unknown e-mail, wrong password or non-admin account                                                                                                                |
| Sessions                      | Supabase JWT + refresh token in HttpOnly cookies via `@supabase/ssr`; validated with `auth.getUser()` on every admin request — `src/server/auth.ts`                                    |
| Session cookie                | `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` when `NODE_ENV=production`                                                                                                           |
| CSRF                          | TanStack server-function CSRF protection plus `checkOrigin()` on logins, logouts, inquiries, uploads and all admin writes                                                              |
| Authorization in the database | RLS policies per table (`supabase/migrations`), tested in `tests/rls.test.ts`                                                                                                          |
| Brute force / abuse           | Supabase Auth rate limits for sign-in; `submit_lead()` limits 5/hour per phone and 100/hour overall; optional Turnstile                                                                |
| Uploads                       | Presigned PUT locked to key, content type and size (5 min); HEAD verification (type, size, key pattern) before any database write                                                      |
| Input validation              | Zod schemas for every server function; content values validated in `validateContentValue` before writing                                                                               |
| SQL injection                 | Supabase query builder / RPC parameters only; SQL functions use `set search_path = ''`                                                                                                 |
| Stored XSS / open redirect    | Links (`isSafeLink`) and images (`isSafeImage`) are constrained by scheme and shape; car slugs are regex-constrained                                                                   |
| Clickjacking / sniffing       | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'` — `src/server.ts` |
| Caching of private data       | Admin/session responses are `Cache-Control: no-store`                                                                                                                                  |
| Secrets                       | `.env` is git-ignored, `.env.example` has placeholders only; the service-role key is never used by the web server                                                                      |

## 3. Secrets policy

- Secrets live in `.env` locally and in host environment variables (Railway **Variables**,
  Docker `-e`, systemd `Environment=`) in production. They are never committed.
- `.env.example` is the only environment file tracked by Git, and it must never contain a
  real value.
- Passwords go through the interactive prompt of `npm run admin:create` (hidden input).
  Never paste a password into a source file, a commit, a chat message or a command line.
- After any secret touches a commit, treat it as compromised even if the commit is removed
  later: it remains in `git log`. Rotate it.
- The Supabase **service-role key** bypasses RLS: keep it in your local `.env` for the
  maintenance scripts only. Never set it on the hosting provider or in client code.
- Database backups are managed by Supabase (plan dependent). Exports contain customer
  inquiries: store them encrypted and delete old copies.

## 4. Runbooks

### 4.1 Rotate an administrator password

```sh
npm run admin:create        # enter the existing e-mail, then a new password (hidden)
```

To end every session immediately as well, use Supabase **Authentication → Users → (user) →
Sign out user**, or delete the user.

### 4.2 Rotate keys

- Supabase: Project Settings → API → rotate the JWT secret / API keys, then update
  `SUPABASE_ANON_KEY` on the host and `SUPABASE_SERVICE_ROLE_KEY` in your local `.env`.
  Rotating the JWT secret signs everybody out.
- R2: create a new API token, update `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on the
  host, then delete the old token.

### 4.3 If a credential was committed

1. Rotate it immediately (4.1/4.2); deleting the commit does **not** remove it from history.
2. Remove the file from tracking so it cannot return: `git rm --cached <file>`.
3. Confirm the ignore rule works: `git check-ignore -v <file>`.
4. If the repository was ever public, also check fork/clone exposure and any secret-scanning
   alerts on the host.

### 4.4 Restore data

Use Supabase backups (Database → Backups) or Point-in-Time Recovery if enabled. Images in R2
are not versioned: deleted photos are gone, so keep a copy of important originals.

### 4.5 Take the site offline

Stop the container/service (or remove the public domain). Supabase data and R2 files stay intact.

## 5. Accepted limitations

Review these before deciding how much risk the deployment carries:

1. **Single administrator model, no roles.** Every admin account is fully privileged.
2. **No second factor and no e-mail-based password reset.** Recovery requires terminal
   access, which is intentional but limits who can help.
3. **No audit trail.** Admin actions are not logged; only the resulting data changes.
4. **CSP is deliberately small.** Only `frame-ancestors`, `object-src` and `base-uri` are
   set; a full script-src policy would need nonces and a pass over every component.
5. **HSTS and TLS are the reverse proxy's job.** Nothing in the app sets HSTS.
6. **No health or metrics endpoint.** Monitoring must rely on HTTP probes of `/`.
7. **Lead inquiries are plaintext PII** in Supabase and in its backups.
8. **R2 images are public by URL.** Keys are unguessable UUIDs, but anyone with a link can
   view a photo, including photos of unpublished cars.
9. **Session length follows Supabase settings** (JWT expiry + refresh tokens); configure
   time-boxed sessions in the Supabase dashboard if you need an absolute limit.
10. **Dependency updates are manual.** There is no automated update or dependency scanning.

## 6. Pre-share checklist (before making the repository public or inviting a collaborator)

```sh
git ls-files | grep -E '(^|/)\.env$'            # must print nothing
git check-ignore -v .env                        # must match .gitignore rules
git grep -n -I -E '(password|secret|token|api[_-]?key)' -- '*.ts' '*.tsx' '*.json' '*.md'
git log --all --oneline -- .env                 # if it prints commits, rotate those secrets
git status --short                              # confirm nothing unexpected is staged
npm run typecheck && npm run lint && npm test
```

Also confirm: the shared account has the least access it needs, the admin password has
been rotated since any credential appeared in history, and no customer data file
or exported backup is tracked, and the service-role key appears nowhere in the repository.

## 7. Reporting a problem

Report vulnerabilities privately to the repository owner rather than in a public issue.
Include the affected route or server function, what an attacker can do, and the smallest
reproduction you have.
