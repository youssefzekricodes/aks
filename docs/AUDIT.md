# Audit & rating — 16 October 2026

Repository review requested before sharing the project: is it safe to push/share, what is
not good, and how good is the project overall.

- **Repository**: `github.com/mechribaderdine123/aks` — branch `main` @ `4f78481`, in sync with `origin/main`
- **Visibility**: private (verified: unauthenticated GitHub API returns `404`)
- **Scope**: tracked files, full Git history, build artifacts, secrets, line endings, CI, lint,
  typecheck, tests, documentation
- **Reviewer**: agent audit + automated checks listed in §5

## 1. Verdict

The application code is in good shape and the security model is sound for a self-hosted
showroom site. The problems were all *repository* problems: a plaintext admin credential
and an environment file committed to Git, 5 MB of build output under version control, a
broken nested-repository reference, and a lint command that failed on every file. Those are
fixed in the working tree (§3); two items need decisions only the owner can make (§4).

**Overall rating: 7.5 / 10** — a solid, deployable small-business application, held back by
missing CI/licence and by scalability limits that are inherent to the SQLite design.

## 2. Scores

| Dimension | Before | Now | Rationale |
| --------- | ------ | --- | --------- |
| Repository & release hygiene | 3/10 | 8/10 | Was tracking `.env`, build output and a broken gitlink; now clean. Still no CI and no licence |
| Secret & credential management | 3/10 | 7/10 | A live admin password was in Git; untracked now, but **rotation is still pending** (§4) and the sibling project leaks a service-role key |
| Application security | 8/10 | 8/10 | scrypt + salt, hashed sessions, HttpOnly/SameSite=Strict cookies, CSRF middleware, exact-origin checks, Zod validation, bound parameters, persistent rate limits, security headers. Lost points for no 2FA/roles/audit log and a minimal CSP |
| Architecture & readability | 8.5/10 | 8.5/10 | Clear layering (routes → server functions → repository → SQLite), one obvious place for each concern, typed end to end, no dead backend |
| Tests & verification | 6.5/10 | 6.5/10 | The HTTP integration test drives the real production bundle (login, CSRF, authorization, CRUD, expiry, logout) — unusually good. Only 4 test cases: no unit tests for the repository, no browser E2E, no CI running them |
| Documentation | 6.5/10 | 9/10 | The README was already thorough; the new `docs/` set covers architecture, security, contribution |
| Deployability & operations | 7/10 | 7.5/10 | Multi-stage Dockerfile, Railway + volume walkthrough, Cloudflare DNS steps, backup script, `APP_ORIGIN`/`DATABASE_PATH` discipline. No health endpoint, no monitoring, manual backups |
| Scalability & performance | 5/10 | 5/10 | Single Node process, single-writer SQLite, images stored as data URLs inside the database, no pagination or caching layer — fine for one showroom, not for growth |
| Accessibility & UX | — | — | Not audited (no automated a11y run, no manual pass) |

## 3. Findings fixed in this pass

| # | Severity | Finding | Fix |
| - | -------- | ------- | --- |
| 1 | **Critical** | `scripts/reset-admin-password.ts` was committed with the administrator e-mail address and the account password in clear text. Anyone who can read the repository could sign in to `/admin` and take over the catalogue, the site copy and every customer inquiry | File deleted; resets now go only through the interactive `npm run admin:create`. **The credential must still be rotated** (§4) |
| 2 | **High** | `.env` was tracked since the first commit with Supabase project URL, project ID and publishable key. Stale — no Supabase code remains in the app | Untracked (`git rm --cached`), `.gitignore` rule verified, local `.env` rewritten with real local settings and a `.env.example` that documents them |
| 3 | **High** | 86 files under `.vercel/output/**` (≈5 MB) were committed: stale deployed server bundles and assets, and the reason `npm run lint` scanned minified code and never finished | Untracked + added to `.gitignore`, `.prettierignore` and the ESLint ignores |
| 4 | **Medium** | `page-hugger-delight` was recorded as a bare gitlink (mode `160000`) with no `.gitmodules`, so a fresh clone would contain an empty, unusable directory pointing at a different private repository | Gitlink removed from tracking; path ignored so it cannot return. Local folder untouched |
| 5 | **Medium** | `npm run lint` failed on a clean checkout: 4,597 Prettier errors, all CRLF-vs-LF line endings caused by `core.autocrlf=true` on a repository mixing both | Added `.gitattributes` (`* text=auto eol=lf`), normalized the working tree, applied the 3 genuine formatting fixes. Now **0 errors, 6 warnings** (see §5) |
| 6 | **Low** | README had a mangled range (`12?256`) and its "Host on a server" steps had drifted below the Cloudflare section | Both corrected, and the verify section now lists all three gates |
| 7 | **Low** | 1.5 MB `my.html` scratch dump and a duplicate admin script left in the tree | Duplicate script deleted; `my.html` flagged in §4 (kept for now) |
| 8 | **High (self-inflicted, caught here)** | The first version of the refreshed `.env` set `NODE_ENV=development`. Vite loads `.env` during `npm run build`, so the build emitted React's development JSX runtime and **every server-rendered page failed** with `jsxDEV is not a function` — the full test suite went red | `NODE_ENV`, `HOST` and `PORT` removed from `.env`/`.env.example`, documented in [CONTRIBUTING.md](CONTRIBUTING.md) and `.env.example`; build and **4/4 tests** green again, `/` renders 63 KB of HTML |

## 4. Open items needing your decision

1. **Rotate the administrator password** — finding 1 cannot be undone by removing the file:
   the credential is still in the Git history of a pushed branch, visible to anyone you invite
   as a collaborator. Rotating it is the only effective fix (history rewriting is off-limits
   for this repository).
2. **Rotate the Supabase `service_role` key** of the sibling repository
   `mechribaderdine123/page-hugger-delight`. That repository tracks its own `.env` with
   `SUPABASE_SERVICE_ROLE_KEY` (bypasses row-level security, full database access) and
   references it from `docker-compose.yml` and `src/integrations/supabase/client.server.ts`.
   It is private today, but it is the more dangerous of the two leaks and it is outside this
   project's scope. Revoke the key in the Supabase dashboard and inject it as an environment
   variable instead.
3. **Junk in the repository** — `my.html` (1.5 MB saved page), `roadmap.md` (a 2-line note) and
   leftovers from the pre-SQLite era (`drizzle/migrations`, untracked). Safe to delete, but
   they are yours to remove.

## 5. Verification

| Check | Command | Result |
| ----- | ------- | ------ |
| Secrets in tracked files | `git ls-files`, `git grep` for credential patterns, `git log --all -- .env` | Before: admin password, admin e-mail, Supabase keys. After: none |
| Ignore rules | `git check-ignore -v .env data/aks.sqlite .vercel/output/nitro.json page-hugger-delight/.env` | All four matched by `.gitignore` |
| Content of the change set | `git status --short`, `git diff --cached --stat` | Only the intended deletions, ignore files and 3 formatting fixes; no line-ending churn |
| Typecheck | `npx tsc --noEmit` | Pass (exit 0) |
| Lint | `npx eslint .` | Before: 4,597 errors. After: **0 errors, 6 warnings** (`react-refresh/only-export-components` inside shadcn/ui primitives, cosmetic) |
| Tests (incl. production build) | `npm test` | **4/4 pass**, exit 0 — integration (authorization, login, CSRF, CRUD, persistence, expiry, logout), password hashing, database constraints, rate limits |
| Live security probe | see below | All gates behaved as designed; one regression found and fixed on the way (§3 finding 8) |

### Live security probe

Run against the production build (`node .output/server/index.mjs`, `NODE_ENV=production`, throwaway
SQLite file) with the real RPC ids extracted from `.output/server/_ssr`, i.e. the same path a
browser takes:

| Scenario | Result |
| -------- | ------ |
| Anonymous `listLeads` / `listSiteContent` / `listAllCars` | Refused; response carries an error, no record data in the body |
| Anonymous `deleteCar` | Refused |
| `listLeads`, `submitLead`, `signIn` with `Origin: http://evil.example` | HTTP **403** (CSRF/origin gate) |
| `submitLead` with an invalid phone (`"12"`) | Refused by validation |
| `submitLead` from the configured origin | Accepted and persisted |
| 6 inquiries in a row from one phone | 5 accepted, then refused (`leads:<phone>` 5/h) — database contained exactly the 5 accepted rows |
| `signIn` with a wrong password | Refused with a message that does not reveal whether the account exists |
| `listPublicCars` (public read) | Accepted, returns the published catalogue |
| `GET /` | HTTP 200, 63 KB SSR HTML, production JSX runtime, security headers present |
| `GET /admin` anonymous | HTTP 200 but only the 13 KB client shell (`ssr: false`): zero lead, vehicle or admin data in the HTML — the dashboard renders client-side and the server functions refuse to serve it |

### Not verified

- Browser end-to-end pass over the public pages after these changes (no UI change was made,
  but no click-through was re-run either).
- Accessibility, print styles, and behaviour under load.
- Any deployed environment: this is a static review of the local tree.
- The sibling `page-hugger-delight` project, beyond the credential finding above.

## 6. Suggested next steps, in order

1. Rotate the admin password and the sibling project's service-role key (§4).
2. Commit this hygiene pass and push (the deletions only take effect once committed).
3. Add a CI workflow that runs `npm run typecheck`, `npm run lint` and `npm test` on every push.
4. Add a `LICENSE` before sharing further, and a `SECURITY.md` policy pointer is already available.
5. When the catalogue grows: move uploaded images out of SQLite into a file/object store and
   paginate `/recherche`.
6. Harden further: second factor for admins, an admin action log, a stricter CSP with nonces.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
