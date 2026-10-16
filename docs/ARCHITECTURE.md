# Architecture — Auto Kontor Sfax

How the showroom site is built, where each responsibility lives, and how a request
travels through the system. Written for whoever maintains or extends the project next.

- **Project**: Auto Kontor Sfax — car showroom website with a self-hosted admin panel.
- **Language**: TypeScript everywhere; user-facing copy is French.
- **Status**: single Node.js instance + local SQLite database (no hosted backend).

## 1. Stack

| Layer        | Choice                                        | Notes |
| ------------ | --------------------------------------------- | ----- |
| Framework    | TanStack Start (React 19) on Vite             | File-based routing, SSR, server functions |
| Server       | Node.js 22.17+ (24 recommended)               | `src/server.ts` is the fetch entry |
| Database     | SQLite via `node:sqlite` (`DatabaseSync`)     | WAL mode, no external service |
| Validation   | Zod                                           | Inputs validated on the server, never trusted from the client |
| Styling      | Tailwind CSS 4 + shadcn/ui primitives         | `src/components/ui/*` |
| Auth         | Custom, in-repo                               | scrypt hashes + hashed session tokens in cookies |
| Testing      | `node:test`                                   | Production HTTP integration test + database/password tests |

No Supabase, no ORM, no cloud database. The Admin panel writes to the same SQLite file
the public site reads.

## 2. Runtime topology

```text
Browser
  │  HTTPS
  ▼
Reverse proxy (Railway / Docker / nginx)   ← terminates TLS, adds HSTS
  ▼
Node server  (src/server.ts → TanStack Start fetch handler)
  ├── SSR pages            src/routes/*
  ├── Server functions     POST/GET /_serverFn/<hash>   (src/features/*/*.functions.ts)
  └── Static assets        public/* (images, favicon, robots.txt)
  ▼
SQLite file at DATABASE_PATH  (./data/aks.sqlite locally, /app/data/aks.sqlite on Railway)
```

Only one application instance may write to the database. SQLite is a single-writer
database, so horizontal scaling would require moving to a client/server database first.

## 3. Module map

```text
src/
  server.ts                 Fetch entry: normalizes SSR errors, sets security headers
  start.ts                  Global request middleware: error handler + CSRF for server functions
  router.tsx                Router creation
  routeTree.gen.ts          Generated route tree (do not edit by hand)

  routes/
    __root.tsx              App shell (head tags, favicon, layout state)
    index.tsx               "/" landing page
    recherche.tsx           "/recherche" catalog with filters
    vehicule.$slug.tsx      "/vehicule/:slug" vehicle detail page
    auth.tsx                "/auth" admin login form
    _authenticated/route.tsx   Route guard (redirects anonymous visitors)
    _authenticated/admin.tsx   "/admin" dashboard

  features/
    admin/AdminPage.tsx     Dashboard: vehicles, content editor, inquiries
    content/ContentEditor.tsx  Field-by-field site content editor
    content/fields.json     Catalog of every editable text/image (single source of truth)
    content/collections.json   Defaults for repeatable lists (nav, stats, services, …)
    content/groups.json     Editor group labels
    content/definition.ts   Field typing, defaults, link/image safety, value validation
    auth/auth.functions.ts  signIn / signOut / getSession server functions
    catalog/catalog.functions.ts  Public reads + admin CRUD + lead submission
    catalog/schemas.ts      Zod schemas (car, id, lead)
    catalog/types.ts        Shared TypeScript types

  server/
    auth/password.ts        scrypt hash/verify (N=32768, r=8, p=1, 64-byte key)
    auth/session.ts         Cookie session, origin check, requireAdmin, login/logout, rate limits
    db/database.ts          Connection, PRAGMAs, schema migration, transaction(), rateLimit()
    db/repository.ts        All queries + authorization gates + first-run seed
    db/seed.ts              Demo catalog (6 cars) and default site content

  components/aks/*          Public showroom sections (Hero, Inventory, About, …)
  components/ui/*           shadcn/ui primitives
  lib/data.ts               Compatibility facade re-exporting catalog server functions
  lib/site-content.ts       useSiteText / useSiteCollection hooks with fallbacks
  lib/queries.ts            React Query options for public data
```

## 4. Data model

| Table          | Columns                                                                      | Purpose |
| -------------- | ---------------------------------------------------------------------------- | ------- |
| `migrations`   | `version` PK                                                                 | Applied schema/version markers |
| `cars`         | `id` PK, `slug` UNIQUE, `published` (0/1), `sort_order`, `document` (JSON)   | Vehicle catalog; JSON keeps the full record in one column. Index `cars_public(published, sort_order)` |
| `site_content` | `key` PK, `label`, `value`                                                   | One row per editable field in `fields.json` |
| `leads`        | `id` PK, `name`, `phone`, `email`, `message`, `car_slug`, `handled`, `created_at` | Contact-form inquiries (customer PII) |
| `admins`       | `id` PK, `email` UNIQUE, `password_hash`                                     | Administrators (scrypt hash only, never plaintext) |
| `sessions`     | `token_hash` PK, `admin_id` FK → `admins` ON DELETE CASCADE, `expires_at`    | Server-side sessions; the raw token exists only in the cookie |
| `rate_limits`  | `key` PK, `attempts`, `expires_at`                                           | Persistent counters for login and lead throttling |

Migrations are inline and idempotent: `openDatabase()` creates the schema at version 1,
and `repository.db()` inserts the first-run seed at version 2, once, inside a transaction.

## 5. Request flows

### 5.1 Public page (SSR)

1. Node receives `GET /` and TanStack Start runs the route loader plus React Query
   prefetch (`publicCarsQuery`, `siteContentQuery`).
2. `repository.cars()` and `repository.content()` read SQLite (published rows only) —
   no authorization call, public reads are intentionally open.
3. The page renders server-side and hydrates; components read copy through
   `useSiteText()` / `useSiteCollection()`, which fall back to `fields.json` defaults
   when the admin has not customized a key.

### 5.2 Admin read or mutation

1. The browser calls a server function (`POST /_serverFn/<hash>`).
2. `src/start.ts` CSRF middleware runs first (`filter: handlerType === "serverFn"`).
3. The Zod validator in the `.validator()` chain rejects malformed input.
4. The repository gate runs: `authorize(write)` → `requireAdmin()` then `checkOrigin()`.
   - `requireAdmin()` hashes the `aks_session` cookie with SHA-256 and requires a
     matching, unexpired row in `sessions`.
   - `checkOrigin()` requires the `Origin` header to equal `APP_ORIGIN` exactly.
5. The handler executes parameterized SQL inside `transaction()` and returns a small
   serialized result. Responses are marked `Cache-Control: no-store`.

### 5.3 Contact form (public write)

`createLead` → `checkOrigin()` → `rateLimit("leads:global", 100/h)` and
`rateLimit("leads:<phone>", 5/h)` → validated `INSERT INTO leads`. Inquiries appear
under **Demandes** in the admin panel; no e-mail is sent.

## 6. Authentication and sessions

- Passwords: scrypt with a random 16-byte salt per password, stored as
  `scrypt:<salt>:<key>`; verification uses `timingSafeEqual`. Unknown e-mail addresses
  are compared against a dummy hash so response time does not reveal account existence.
- Sessions: 32 random bytes, stored only as SHA-256 in `sessions`, 8-hour absolute
  expiry, cookie `HttpOnly` + `SameSite=Strict` + `Secure` in production.
- Login is throttled (`login:global` 100/15 min, `login:<email>` 5/15 min); a successful
  login clears that account's counter.
- There is no public registration, no password reset by e-mail and no second factor.
  Recovery requires terminal access (`npm run admin:create`, which also revokes sessions).

## 7. Content system

`fields.json` is the single source of truth for editable copy: one object per field with
`key`, `group`, `label`, `type` (`text`, `textarea`, `link`, `image`, `map`, `boolean`,
`collection`) and a default `value`. `collections.json` holds the default arrays for
repeatable lists, `groups.json` names the editor sections, and `definition.ts` owns
validation (`isSafeLink`, `isSafeImage`, `validateContentValue`) — the same rules are
enforced in `repository.saveContent()` before anything is written.

Adding an editable field is therefore a three-part change: add the field to
`fields.json`, consume it in the component via `useSiteText(key, fallback)`, and it
appears in the admin editor automatically. No database migration is needed —
`site_content` is key/value.

## 8. Images

Vehicle photos are uploaded from the admin panel, cropped to 4:3 on the client
(`readVehicleImageAsDataUrl`, max 2 MB, JPEG/PNG/WebP), resized to at most 1600 px wide
and stored as validated `data:` URLs inside the car's JSON document. This keeps backup
and relocation to one file; it is the first thing to change if the catalog grows large.
Request bodies must be allowed up to 36 MB at the reverse proxy.

## 9. Build and deploy

- `npm run build` → `vite build` → `.output/` (Node server bundle + client assets).
- `npm start` → `node .output/server/index.mjs` with `.env` loaded.
- `Dockerfile` builds once on `node:24-bookworm-slim`, then ships only `.output` plus
  the `scripts` and the two TypeScript files the admin CLI needs.
- Requirements: a persistent disk for the database (`DATABASE_PATH`) and `APP_ORIGIN`
  set to the exact public HTTPS origin. Vercel-style serverless hosting is unsuitable
  because SSR needs a long-running Node process and the database needs real disk.
- Deployment walkthroughs (Railway, Cloudflare DNS, plain VPS, Docker, backups) live in
  the root [README](../README.md).

## 10. Tests

`npm test` builds the app, then runs `node:test` over `tests/*.test.ts`:

- `tests/integration.test.ts` — starts the real production bundle on port 4319 with a
  temporary database and exercises login, cookies, anonymous access refusal, CSRF,
  validation errors, CRUD, publication visibility, inquiries, session expiry and logout.
- `tests/security.test.ts` — unique salts, wrong-password rejection, migration/constraint
  behavior, foreign-key cascade, and rate-limit enforcement.

`npm run typecheck` and `npm run lint` are the other two gates; all three must pass
before pushing. See [CONTRIBUTING.md](CONTRIBUTING.md).

## 11. Extension recipes

| Goal | Steps |
| ---- | ----- |
| New editable text | Add a field to `fields.json`, read it with `useSiteText("key", "fallback")` |
| New public page | Add `src/routes/<name>.tsx`; the route tree regenerates during dev |
| New admin action | Add a function in `features/catalog/catalog.functions.ts` with a Zod validator, then enforce `authorize(true)` in the repository |
| New table or column | Add an idempotent block in `openDatabase()` (new `migrations` version) — never edit an applied version |
| New list (e.g. FAQ) | Add the default array to `collections.json`, expose it with `useSiteCollection`, then edit it from **Contenu du site** |

Related: [SECURITY.md](SECURITY.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [AUDIT.md](AUDIT.md)
