# Architecture

- **Status**: TanStack Start (React 19, SSR) on Node, Supabase (PostgreSQL + Auth + RLS) for data and accounts, Cloudflare R2 for images.
- **Updated**: 18 October 2026.

## Layers

```
Browser
  │  HTML (SSR) + server-function RPC (/_serverFn/…)     direct PUT to R2 (presigned URL)
  ▼                                                         │
TanStack Start server (stateless Node, Docker)              │
  ├─ src/routes/…                     pages, sitemap.xml, robots.txt
  ├─ src/features/*/…functions.ts     server functions = the API (zod-validated input)
  └─ src/server/
       auth.ts        Origin check (CSRF), Supabase sign-in/out, admin check
       supabase.ts    publicClient() (anon key) / sessionClient() (anon key + user JWT cookies)
       r2.ts          presigned uploads, object verification, deletion (aws4fetch, S3 API)
       repository.ts  data access; maps rows ⇄ app types; R2 cleanup on replace/delete
  │                                   │
  ▼                                   ▼
Supabase (Postgres, RLS, Auth)      Cloudflare R2 bucket (public read via custom domain)
```

## Responsibilities

| Concern                          | Where                                                    | Notes                                                                                       |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Public catalogue, content, logos | `publicClient()` → RLS `select` policies                 | Only published cars and their images are visible anonymously                                |
| Admin reads/writes               | `sessionClient()` (user JWT) → RLS `is_admin()` policies | Server checks the session too (`adminClient()`), so failures are explicit                   |
| Save car + photo list            | SQL `save_car()` (SECURITY INVOKER)                      | Atomic; returns removed object keys, which the server deletes from R2                       |
| Public inquiries                 | SQL `submit_lead()` (SECURITY DEFINER)                   | Validation + rate limits; anonymous users have no table access to `leads`                   |
| Accounts                         | Supabase Auth                                            | Admin = `app_metadata.role = "admin"`, set only by `scripts/create-admin.ts` (service role) |
| Images                           | R2                                                       | Presigned PUT (5 min, exact type and size); verified with HEAD before any DB write          |
| Orphans                          | `scripts/r2-cleanup.ts`                                  | Objects not referenced by `car_images`, `brand_logos` or `site_content`, older than 24 h    |
| Anti-spam                        | Cloudflare Turnstile (optional)                          | Verified server-side before `submit_lead`                                                   |

No Supabase Edge Functions are used: the Node server already provides a trusted server-side layer next to the app, and the database functions cover what must be atomic or rate limited.

## Data model (supabase/migrations)

- `cars` — typed columns (brand, model, version, specs, price, publication, order) with check constraints.
- `car_images` — `car_id` → `cars` (cascade), `object_key` (unique, pattern-checked), `position` 0–11.
- `brand_logos` — uploaded logo per brand slug (bundled logos live in `public/brands`).
- `site_content` — CMS key/value; defaults come from `src/features/content/fields.json`.
- `leads` — contact requests, `handled` / `handled_at`.
- `rate_limits` — internal, no RLS policy (only reachable through SQL functions).

## Secrets

| Secret                                      | Where it may live                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `SUPABASE_ANON_KEY`                         | Web server (not sensitive; RLS applies)                                             |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Web server only (never sent to the browser)                                         |
| `SUPABASE_SERVICE_ROLE_KEY`                 | Local `.env` for maintenance scripts only — never on the host, never in the browser |
| `TURNSTILE_SECRET_KEY`                      | Web server only                                                                     |

Related: [README](../README.md) · [SECURITY.md](SECURITY.md)
