# Security — Auto Kontor Sfax

How the application protects itself, what is knowingly out of scope, and the operational
runbooks for secrets, credentials and incidents. Everything here is verifiable in the
code paths named next to it.

## 1. Trust boundaries

| Zone | Who reaches it | Protection |
| ---- | -------------- | ---------- |
| Public pages (`/`, `/recherche`, `/vehicule/:slug`) | Anyone | Read-only, published rows only |
| Contact form | Anyone | Origin check + per-phone and global rate limits + Zod validation |
| `/auth` login | Anyone | Rate limited, generic error message, scrypt verification |
| `/admin` and every admin server function | Administrators only | `requireAdmin()` on the server, `checkOrigin()` for writes; the route guard is only a UX nicety |
| SQLite file, backups | Shell/host access only | Never served over HTTP; excluded from Git |

The client is never trusted: hiding a button or guarding a route does not grant or deny
access, because every read and write re-checks authorization inside
`src/server/db/repository.ts`.

One consequence worth knowing: `GET /admin` answers **HTTP 200** to an anonymous visitor.
The dashboard and the login page are `ssr: false`, so the server returns only the empty
application shell (about 13 KB) and the browser then redirects to `/auth`; no lead, vehicle,
content or account data is present in that HTML, and the server functions that would fetch it
all refuse without a session. A 200 here is therefore expected, not a bypass.

## 2. Controls in place

| Control | Implementation |
| ------- | -------------- |
| Password storage | scrypt, per-password 16-byte salt, N=32768 r=8 p=1, `timingSafeEqual` compare — `src/server/auth/password.ts` |
| Account enumeration | Unknown e-mails are verified against a dummy hash, and the error message is identical |
| Sessions | 32-byte random token, stored as SHA-256 only, 8-hour absolute expiry, server-side revocation — `src/server/auth/session.ts` |
| Session cookie | `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` when `NODE_ENV=production` |
| CSRF | `createCsrfMiddleware` applied to all server functions — `src/start.ts` |
| Cross-origin requests | `checkOrigin()` compares the `Origin` header to `APP_ORIGIN` for logins, logouts, lead submissions and all admin writes |
| Brute force / abuse | Persistent counters: `login:global` 100/15 min, `login:<email>` 5/15 min, `leads:global` 100/h, `leads:<phone>` 5/h |
| Input validation | Zod schemas for every server function; content values validated in `validateContentValue` before writing |
| SQL injection | Only bound parameters; the single dynamic fragment is a hard-coded `WHERE published = 1` |
| Stored XSS / open redirect | Links (`isSafeLink`) and images (`isSafeImage`) are constrained by scheme and shape; car slugs are regex-constrained |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'` — `src/server.ts` |
| Caching of private data | Admin/session responses are `Cache-Control: no-store` |
| Secrets in Git | `.env` and database files are git-ignored, and `.env.example` contains placeholders only |

## 3. Secrets policy

- Secrets live in `.env` locally and in host environment variables (Railway **Variables**,
  Docker `-e`, systemd `Environment=`) in production. They are never committed.
- `.env.example` is the only environment file tracked by Git, and it must never contain a
  real value.
- Passwords go through the interactive prompt of `npm run admin:create` (hidden input).
  Never paste a password into a source file, a commit, a chat message or a command line.
- After any secret touches a commit, treat it as compromised even if the commit is removed
  later: it remains in `git log`. Rotate it.
- Backups (`npm run db:backup`) contain customer inquiries and password hashes. Store them
  encrypted, keep them off shared drives, and delete old copies.

## 4. Runbooks

### 4.1 Rotate the administrator password

```sh
npm run admin:create        # enter the existing e-mail, then a new password (hidden)
```

This upserts the account, revokes every existing session for it and clears its login rate
limit. Anyone signed in with the old password is logged out immediately. Do it on the same
host and `DATABASE_PATH` as the running site.

### 4.2 Revoke all sessions

Set a new password for every administrator as in 4.1, or delete the rows directly while the
service is stopped:

```sh
sqlite3 "$DATABASE_PATH" "DELETE FROM sessions;"     # stop the app first
```

### 4.3 If a credential was committed

1. Rotate it immediately (4.1); deleting the commit does **not** remove it from history.
2. Remove the file from tracking so it cannot return: `git rm --cached <file>`.
3. Confirm the ignore rule works: `git check-ignore -v <file>`.
4. If the repository was ever public, also check fork/clone exposure and any secret-scanning
   alerts on the host.

### 4.4 Restore the database

```sh
# stop the app first
cp data/backups/<snapshot> "$DATABASE_PATH"
```

Copy a snapshot rather than a live `aks.sqlite` — WAL data may not be checkpointed.
Keep the old file until the restored site is verified.

### 4.5 Take the site offline

Stop the container/service (or remove the public domain). The database, environment
variables and backups stay intact. Never delete `data/` to take a site offline.

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
7. **Rate limits are per-process, stored in SQLite.** They assume the documented
   single-instance deployment; multiple writers to one file are not supported.
8. **Lead inquiries are plaintext PII** in the database and in backups.
9. **Uploaded images live inside the database** as data URLs, so the database grows with
   the catalog and a car record can be a few megabytes.
10. **Dependency updates are manual.** There is no automated update or dependency scanning.

## 6. Pre-share checklist (before making the repository public or inviting a collaborator)

```sh
git ls-files | grep -E '(^|/)\.env$'            # must print nothing
git check-ignore -v .env data/aks.sqlite        # must match .gitignore rules
git grep -n -I -E '(password|secret|token|api[_-]?key)' -- '*.ts' '*.tsx' '*.json' '*.md'
git log --all --oneline -- .env                 # if it prints commits, rotate those secrets
git status --short                              # confirm nothing unexpected is staged
npm run typecheck && npm run lint && npm test
```

Also confirm: the shared account has the least access it needs, the admin password has
been rotated since any credential appeared in history, and no customer data file
(`data/`, `*.sqlite`, backups) is tracked.

## 7. Reporting a problem

Report vulnerabilities privately to the repository owner rather than in a public issue.
Include the affected route or server function, what an attacker can do, and the smallest
reproduction you have.
