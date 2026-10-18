# Implementation plan — redesign, HeroUI, Supabase, Cloudflare R2, discovery

Prepared 18 October 2026 against `main` @ `5a2ae77`.

## Status — 18 October 2026 (branch `redesign/heroui-discovery`)

Decisions received: both themes; new Supabase project created; brand logos OK; extra specs
yes; browser-side image variants; Turnstile yes; brand pages + SEO yes; no error tracking;
leave Railway; Lovable no longer used. **Backend/image migration (Phases 4–5) deferred.**

| Phase                            | State                                                                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 Design system                  | Done: HeroUI tokens with AKS red accent, light + dark themes (system default, toggle, no flash), Inter self-hosted                                                                                                                                                               |
| 2.2 Data model                   | Done on SQLite (additive): `model`, `version`, `transmission`, `doors`, `seats`, `fiscal_power`; 9 body types; brand registry; `brand_logos` table (migration 3). Legacy records fall back to `name` for the model                                                               |
| 3 HeroUI                         | Done: public + admin + content editor + login; shadcn/ui, sonner, Radix packages and custom 3D/glass styles removed                                                                                                                                                              |
| 6 Discovery                      | Done: shared URL filter model (`src/features/catalog/search.ts`, old `?price=&type=` links translated), brand logo grid, body silhouettes, dependent model select, price range, sorting, pagination, active-filter chips, mobile filter drawer, `/marques` and `/marques/$brand` |
| SEO                              | Done: canonical, Open Graph, JSON-LD (AutoDealer, Car + Offer, BreadcrumbList, ItemList), dynamic `sitemap.xml` / `robots.txt`, `noindex` on filtered and empty pages                                                                                                            |
| Turnstile                        | Done, enabled when `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` are set                                                                                                                                                                                                         |
| 4 Supabase / 5 R2 / hosting move | Not started (deferred). Listings now load summaries only (first photo, no description) and the detail page loads one car, which reduces D1 until R2 removes data-URL images                                                                                                      |
| 7 CI / E2E                       | Not started; `npm test` (11 tests incl. production-build HTTP test) and lint/typecheck pass locally                                                                                                                                                                              |

Labels used throughout:

- **[V] Verified**: read in the code, the local database (opened read-only) or a package registry.
- **[A] Assumption**: likely, but not verified. It needs confirmation.
- **[P] Proposal**: a recommended change.

---

## 0. Executive summary

AKS is a **single-dealer showroom**, not a multi-dealer marketplace. It has 6 published cars,
1 admin and 0 leads in the local database [V]. The reference site, automobile.tn/fr/neuf, is a
**new-car price catalogue**: 59 brands and 13 search criteria, including fiscal power, cylinders,
gears and transmission [V, fetched]. Most of those criteria would sit empty on our data. We
should adopt its _patterns_ (brand logo grid, body-type shortcuts, a dense and calm
listing hierarchy) and size the filter set to what we actually stock.

Recommended order of work. This differs from the requested order in two places:

1. **Audit and decisions** (this document plus your answers in §9).
2. **Design direction and data-model changes** happen together, because the new filters need
   new fields such as model and brand.
3. **HeroUI foundation**, then a screen-by-screen migration and the visual redesign, combined.
   Doing them as two passes would restyle every screen twice.
4. **Supabase**, built behind the existing repository seam, can run in parallel with 3.
5. **R2**, set up in parallel with 4. The image migration runs at the Supabase cutover.
6. **Discovery features** (brand and body filters, sorting, pagination) once 2–4 have landed.
7. **Hardening, testing and the production cutover.**

Total rough effort: **≈ 32–45 developer-days** for one developer (§8).

---

## 1. Phase 1 — Audit and technical assessment (findings)

### 1.1 Current architecture [V]

```
Browser ──► TanStack Start 1.168 (React 19, SSR, Vite 8, Nitro 3 beta)
             ├─ routes: /, /recherche, /vehicule/$slug, /auth, /_authenticated/admin (ssr:false)
             ├─ server functions  src/features/catalog/catalog.functions.ts, features/auth/auth.functions.ts
             └─ repository        src/server/db/repository.ts  ← single data-access seam
                  └─ node:sqlite  src/server/db/database.ts → data/aks.sqlite (Railway volume in prod)
Deploy: Dockerfile (node:24) on Railway; vercel.json present but documented as unsuitable.
```

| Area                                       | What exists today [V]                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tables                                     | `cars(id, slug, published, sort_order, document JSON)`, `site_content(key,label,value)`, `leads`, `admins`, `sessions`, `rate_limits`, `migrations`                                                                                                                                                                                                                                                      |
| Car model                                  | `src/lib/cars.ts`. Fields: `brand` (free text), `name` (model and trim mixed, e.g. "Classe C 220d"), `country`, `year`, `price`, `price_on_request`, `km` (display string) **plus** `km_value`, `fuel`, `gearbox`, `body`, `state`, `images[]`, `description`, `published`, `sort_order`                                                                                                                 |
| Auth                                       | scrypt hashes, random session token stored as SHA-256, HttpOnly SameSite=Strict cookie, 8 h expiry, exact `APP_ORIGIN` check on mutations, persistent rate limits (`src/server/auth/session.ts`)                                                                                                                                                                                                         |
| Content CMS                                | 148 fields (`src/features/content/fields.json`) and 8 collections. Components read copy via `useSiteText("hero.text_1")` keys                                                                                                                                                                                                                                                                            |
| Images                                     | (a) 18 car photos plus logo and storefront in `public/images` (2.7 MB) referenced as `/images/*.jpg`. (b) Admin uploads are cropped to 4:3 1600 px JPEG in the browser and stored as **`data:` URLs inside `cars.document`** (up to 3 MB each, 12 per car). (c) 3 content image fields (`identity.logo`, `identity.favicon`, `hero.image_1`) also accept data URLs. (d) `http(s)` URLs are also accepted |
| Background jobs / realtime / external APIs | **None.** No e-mail sending, no webhooks, no cron (backup is a manual script)                                                                                                                                                                                                                                                                                                                            |
| Tests                                      | 2 files: an integration test on the production bundle (auth, CSRF, CRUD) and a security/unit test. No browser E2E, no CI                                                                                                                                                                                                                                                                                 |

### 1.2 Technical debt and defects

| #   | Severity | Finding [V]                                                                                                                                                                                                                                                                  | Where                                          |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| D1  | High     | `listPublicCars` returns **every published car with every image** (including multi-MB data URLs) to every page. `getPublicCar(slug)` downloads the whole catalogue to find one car                                                                                           | `catalog.functions.ts`, `repository.ts:cars()` |
| D2  | High     | Images stored as base64 in DB rows: bloats the DB, backups and SSR payloads, and they can't be cached by a CDN                                                                                                                                                               | `src/lib/data.ts`, `schemas.ts`                |
| D3  | Medium   | **Two inconsistent filter systems.** The Hero form uses hard-coded price/km bands and navigates to `/recherche`. `Inventory` uses local state and content-managed budgets (`inventory.budgets`). `/recherche` has **no filter UI**, so users can't refine without going back | `Hero.tsx`, `Inventory.tsx`, `recherche.tsx`   |
| D4  | Medium   | `validateSearch` accepts any string, so unknown values silently match everything                                                                                                                                                                                             | `recherche.tsx`                                |
| D5  | Medium   | No `model` field, and `brand` is free text. A brand→model selector and brand logos can't be supported reliably. `scripts/fix-brand-label.py` shows label drift has happened before                                                                                           | `cars.ts`                                      |
| D6  | Low      | `km` string duplicates `km_value`, so the two can disagree                                                                                                                                                                                                                   | `cars.ts`, admin form                          |
| D7  | Low      | `key={car.name}` in lists, so two cars with the same name collide                                                                                                                                                                                                            | `Inventory.tsx`, `recherche.tsx`               |
| D8  | Low      | `CAR_COUNTRIES` are English values in a French UI. Body/fuel lists are duplicated between `cars.ts` and Hero options                                                                                                                                                         | `cars.ts`, `Hero.tsx`                          |
| D9  | Low      | 46 shadcn/Radix primitives in `src/components/ui`, **only 10 imported**, and those only from `__root.tsx`. Screens use raw `<select>`, `<input>`, `window.confirm()` and a custom `Btn`                                                                                      | `src/components/ui/*`                          |
| D10 | Medium   | The "AI look": glass panels, `btn-3d`, red glow shadows, 4 stacked gradient overlays on the hero, uppercase wide-tracked micro-labels, `Reveal` scroll animations on every card, a dark-only theme                                                                           | `styles.css`, `Hero.tsx`, `CarCard.tsx`        |
| D11 | Low      | Single-origin check: the dev server falls back to a different port when 3000 is busy, which breaks login (seen this session)                                                                                                                                                 | `session.ts`, `vite.config.ts`                 |
| D12 | Low      | No CI, no E2E tests, no health endpoint, no monitoring. Google Fonts loaded from a third party                                                                                                                                                                               | —                                              |
| D13 | Info     | Main branch syncs to **Lovable**. All work should go on feature branches, merged only when green (AGENTS.md)                                                                                                                                                                 | —                                              |

### 1.3 Facts not available locally (must be gathered before Phase 4/5)

- **[A]** The production Railway database content: number of cars, leads and admins, and how
  many images are data URLs versus `/images/` paths versus external URLs. → I need a **read-only
  export** (`npm run db:backup` on Railway, then download it). We won't touch the live file.
- **[A]** The production domain and whether its DNS is on Cloudflare. The docs describe
  Cloudflare DNS steps, so probably yes.
- **[A]** Whether the old Supabase project referenced by the previously tracked `.env` should
  be reused. Recommendation: **create a new project**. That project's keys were committed to
  Git, and the sibling repo leaked its service-role key (docs/AUDIT.md §4).

**Phase 1 deliverables:** this document, the production inventory report (counts and image
sources), and your decisions (§9). **Effort:** 1–2 days. **Priority:** P0.

---

## 2. Phase 2 — Design direction, data model, component inventory

### 2.1 Design direction [P]

Take from the reference:

- A **light, neutral surface** with one accent colour. Recommendation: a light theme by default,
  keeping AKS red `oklch(0.55 0.23 28.5)` as the _only_ accent, used for prices, primary CTAs
  and active filters. Needs your decision (§9, Q1).
- A **brand logo grid** (monochrome logos on white tiles, name under each) and a **body-type
  strip** (line silhouettes with labels).
- A dense, quiet listing card (spec below), 8 px spacing grid, one sans-serif family
  (Inter, self-hosted), 2 weights in body text, sentence-case labels.
- Remove: glass panels, 3D buttons, glows, gradient stacks, scroll-reveal on every card,
  uppercase tracked micro-labels, the `hero-car` and `car-1..6` assets (unused [V]).

Keep: the AKS logo and red, French copy, the storefront photo (as a calm hero image without
colour grading), the CMS-driven text, and the dealer services and testimonials sections, restyled.

**Listing card hierarchy** (top to bottom): photo 4:3 with a state badge (Neuf/Occasion) →
brand logo (small) + "Brand Model" + trim/version → year · km · fuel · gearbox as one
muted line with icons → price (bold, accent) or "Prix à discuter" → whole-card link, with no
separate button. A skeleton variant has identical dimensions.

**Breakpoints:** mobile single column, filters in a bottom drawer. Tablet: 2 columns,
filters in the drawer. Desktop ≥1024 px: a 280 px filter sidebar and 3 columns.

### 2.2 Data-model changes required by the filters [P]

Filters we can support **with today's data** [V]: brand, body, state, fuel, gearbox, year,
price, km, origin country. Each needs normalisation.

| Change                                                                                                                        | Why                                                 | Migration                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `brands` table (`slug`, `name`, `logo_key`, `sort`) and `cars.brand_id` FK                                                    | Logos, consistent spelling, `/recherche?marque=bmw` | Map distinct `brand` strings → rows; manual review of the mapping                                          |
| `models` table (`brand_id`, `slug`, `name`) and `cars.model_id`, plus a `cars.version` text field                             | Dependent brand→model selector                      | `name` is split by hand per car (6 locally; production count TBD). Admin form gets brand → model → version |
| Enums or check constraints for `body`, `fuel`, `gearbox`, `state` (French values)                                             | Stable filter values. Labels stay editable          | Existing values are already French except `country`                                                        |
| `country` → ISO code (`DE`, `JP`…) with French labels                                                                         | Fix D8                                              | Simple map                                                                                                 |
| Drop the `km` string. Format `km_value` for display                                                                           | Fix D6                                              | Derived                                                                                                    |
| `car_images` table (`car_id`, `object_key`, `position`, `width`, `height`, `bytes`, `sha256`, `mime`, `status`, `legacy_src`) | R2 and integrity checks                             | Phase 5                                                                                                    |
| _Not proposed_: places, doors, CV, cylinders, transmission                                                                    | No data today. Add only if you want them (§9, Q4)   | —                                                                                                          |

Body types in the reference that we don't stock (Compacte, Monospace, Utilitaire, Cabriolet)
should only be offered if you want them in the enum. The UI shows only types that have ≥1
published car, with counts.

### 2.3 Brand logos and silhouettes [P]

- **Logos:** manufacturer trademarks. Use official press-kit SVGs or a licensed set, one
  monochrome SVG per brand, uploaded via admin (stored in R2, `brands.logo_key`). Displaying
  them to identify stocked vehicles is common practice, but **the licensing/usage decision is yours**
  (§9, Q3). Fallback: a text wordmark tile.
- **Body silhouettes:** HeroUI has no such icons. Commission or draw **one consistent SVG
  set** (same stroke, same viewBox, side profile) as React components in
  `src/components/aks/icons/body/`. No suitable library icon set exists in `lucide-react`.

### 2.4 Component inventory (verified against `@heroui/react@3.2.6` exports)

| Current element [V]                                      | Screens                                | HeroUI v3 replacement                                                                                                               |
| -------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Native `<select>` (Hero ×4, admin ×5, content editor ×1) | Hero, AdminPage CarForm, ContentEditor | `Select` (`ComboBox` for brand/model when the list is long)                                                                         |
| `<input>` text/number/email/password                     | auth, contact, admin, content editor   | `TextField` / `Input`, `NumberField` (price, km, year), `SearchField`                                                               |
| `<textarea>`                                             | contact, admin description, content    | `TextArea`                                                                                                                          |
| Checkboxes (published, price on request, booleans)       | admin, content editor                  | `Switch` / `Checkbox`                                                                                                               |
| `window.confirm()` (delete car, reset content)           | admin, content editor                  | `AlertDialog`                                                                                                                       |
| Custom tab bar                                           | AdminPage                              | `Tabs`                                                                                                                              |
| Chip filters                                             | Inventory                              | `TagGroup`/`Tag` or `ToggleButtonGroup`                                                                                             |
| sonner toasts                                            | 4 files                                | HeroUI `Toast`. Remove `sonner`                                                                                                     |
| Leads list                                               | AdminPage LeadsTab                     | `Table` and `Pagination`                                                                                                            |
| Custom `Btn`/`BtnLink`, `btn-3d` classes                 | everywhere                             | `Button`, `Link`; `buttonVariants` on TanStack `<Link>`                                                                             |
| Mobile nav (custom)                                      | Navbar                                 | `Drawer`                                                                                                                            |
| Price/km range                                           | new                                    | `Slider` (range) and `NumberField` min/max                                                                                          |
| Loading / empty                                          | ad hoc                                 | `Skeleton`, `Spinner`, `EmptyState`, `Alert`                                                                                        |
| Gallery on `/vehicule/$slug`                             | detail page                            | **Custom** (no carousel in HeroUI). Keep `embla-carousel-react`, already installed [V], with HeroUI buttons                         |
| Image uploader / drop zone                               | admin                                  | **Custom** (no drop zone). Hidden `<input type=file>` and a HeroUI `Button`, sortable thumbnails                                    |
| Brand logo grid, body-type selector                      | new                                    | **Custom** on `ToggleButtonGroup` semantics (keyboard and a11y come for free)                                                       |
| Date pickers                                             | **none exist today** [V]               | `DatePicker` / `DateRangePicker` are available but there is no current use. Possible future use: lead date filter in admin (§9, Q6) |

**Phase 2 deliverables:** design tokens (colours, type scale, spacing, radius) written as
HeroUI theme CSS variables in `src/styles.css`. Annotated wireframes for home, listing, detail,
admin (list, edit, leads), auth and 404. The data-model RFC (§2.2). The SVG icon brief.
**Acceptance:** you sign off the wireframes and the field list. **Effort:** 4–6 days. **P0.**

---

## 3. Phase 3 — HeroUI integration and component migration (+ visual redesign)

### 3.1 Compatibility check [V]

- `@heroui/react` 3.2.6 requires React ≥19, Tailwind ≥4, `react-aria-components` ^1.21 and
  `@internationalized/date`. The project has React ^19.2 and Tailwind ^4.2.1, so it is compatible.
- No Provider needed. CSS: `@import "tailwindcss"; @import "@heroui/styles";`. The project uses
  `@import "tailwindcss" source(none)`, so check that HeroUI classes are picked up (a possible
  `@source` line for `node_modules/@heroui`).
- SSR: built on React Aria, which needs consistent ids on server and client. Verify there is no
  hydration warning under TanStack Start SSR in a spike before migrating screens. **Spike = go/no-go gate.**
- Locale: wrap the app in React Aria `I18nProvider locale="fr-TN"` (or `fr-FR`) so number and
  date formatting and the calendar are French.

### 3.2 Tasks

1. Spike branch: install, theme tokens, render Button/Select/Modal/Toast on `/` with SSR and check hydration.
2. Create `src/components/aks/form/` wrappers **only where they remove repetition**: for example a
   `Field` that binds `react-hook-form` (already installed [V]) to HeroUI controls. No wrapper per
   component.
3. Migrate screen by screen, each its own PR: auth → contact form → admin (tabs, car form,
   leads table, confirm dialogs) → content editor → public pages (with the redesign).
4. Remove the replaced shadcn primitives, `sonner`, unused Radix packages, `btn-3d`/glass CSS.
   Keep `embla-carousel-react`, `lucide-react`, `zod`, `react-hook-form`.
5. Accessibility pass: labels, focus rings, keyboard on all pickers and dialogs, contrast AA.

**Content-key risk:** the CMS keys (`hero.text_1`…) are bound to the current layout. When
copy moves or disappears, **keep existing keys where the text survives**. Add new keys with
defaults. Mark removed ones deprecated rather than deleting them, so stored content is not lost.

**Acceptance:** no native `<select>` or `confirm()` remains. One button and one input style
throughout. Lighthouse a11y ≥ 95 on 4 key pages. No hydration warnings. Existing tests green.
Bundle size within +15 % of today.
**Rollback:** each screen is a separate PR, so revert it. **Effort:** 8–11 days. **P1.**

---

## 4. Phase 4 — Supabase backend

### 4.1 Recommended architecture, per responsibility [P]

Principle: **keep TanStack Start server functions as the API layer.** Swap the repository
implementation underneath them. The UI and server-function signatures barely change, the
privileged logic stays server-side, and Edge Functions are not needed for anything we do today.

| Responsibility         | Today [V]                  | Supabase target [P]                                                                                                                                                                                                                          |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public catalogue reads | server fn → SQLite         | server fn → Supabase client with **anon key** and RLS `published = true`. Paginated and filtered query; detail by slug (fixes D1)                                                                                                            |
| Admin reads/writes     | server fn + `requireAdmin` | server fn → Supabase client **with the admin's JWT** (RLS enforces `is_admin()`). The service-role key is **never** used in request handlers                                                                                                 |
| Auth                   | custom scrypt sessions     | **Supabase Auth** e-mail/password. Public sign-ups disabled. Admin flag in `app_metadata.role = 'admin'` (only settable with the service role). Cookies handled by `@supabase/ssr` in server functions. Keep the `APP_ORIGIN` check for CSRF |
| Admin creation / reset | `npm run admin:create`     | Same script, now using the Admin API with the service role (local terminal only)                                                                                                                                                             |
| Lead submission        | server fn + rate limit     | server fn → `insert` RLS policy for anon on `leads` (insert only, no select), **or** a `security definer` RPC `submit_lead()` that applies the rate limit. Recommend the RPC plus Cloudflare Turnstile (§9, Q7)                              |
| Rate limits            | SQLite table               | Postgres table and a function. Login throttling is handled by Supabase Auth rate limits                                                                                                                                                      |
| Site content           | `site_content`             | Same table. Validation stays in `definition.ts` (server fn), since it's shared with the client                                                                                                                                               |
| Image metadata         | JSON array                 | `car_images` table (Phase 5). The presign/finalize server functions hold the R2 keys                                                                                                                                                         |
| Background jobs        | none                       | None needed. Orphan reconciliation runs as a manual or Railway-cron script (Phase 5)                                                                                                                                                         |
| Realtime               | none                       | **Not needed.** Admin uses query invalidation. Don't add it                                                                                                                                                                                  |
| Edge Functions         | —                          | **Not needed** while the app runs on Railway. Reconsider only if hosting moves to serverless                                                                                                                                                 |

### 4.2 Schema outline [P]

`brands`, `models`, `cars` (typed columns, FKs, `published`, `sort_order`, `slug unique`,
`created_at/updated_at` trigger), `car_images`, `site_content`, `leads` (`car_id` FK
nullable plus `car_slug` snapshot, `handled_at`, `handled_by`), `rate_limits`, `admin_audit_log`
(new, cheap, addresses an audit finding).

Indexes: `cars(published, sort_order)`, `cars(brand_id, model_id)`, `cars(body)`, `cars(price)`,
`cars(km_value)`, `cars(year)`, `car_images(car_id, position)`, `leads(created_at desc)`.

RLS: enabled on **every** table. `anon`: select published cars, images of published cars,
brands/models, site_content; insert leads only via RPC. `authenticated` with `is_admin()`: full
CRUD. No policy for anything else. Migrations live in `supabase/migrations/*.sql` via the
Supabase CLI and are reviewed in PRs.

### 4.3 Data migration and cutover

1. Build the Supabase repository behind a flag `DATA_BACKEND=sqlite|supabase` (same function
   signatures as `src/server/db/repository.ts`). Run the existing integration tests against both.
2. Write the `scripts/migrate-sqlite-to-supabase.ts` ETL. It **reads** a copy of the production
   SQLite backup, transforms (brand/model mapping file reviewed by you) and upserts
   idempotently by id. Dry-run mode prints a diff.
3. Rehearse on a staging Supabase project with the production backup. Validate row counts per
   table, a per-car checksum of the normalised fields, and the slugs resolving.
4. Cutover (≈15 min window, low traffic): admin read-only banner → final backup → ETL
   (plus image migration, Phase 5) → validation → set `DATA_BACKEND=supabase` on Railway →
   smoke test → lift the banner. Leads submitted during the window: the ETL re-runs the
   `leads` delta (`created_at > snapshot`) after the switch.
5. **Rollback:** flip `DATA_BACKEND=sqlite`. The SQLite volume stays untouched and read-write
   for 30 days. Any leads created on Supabase after the switch are exported back by script.

**Auth migration:** Supabase can't verify our scrypt hashes [A, by design of its import
formats]. Admins **set a new password** via an invite or reset link. With one admin, that is fine.

**Session behaviour change:** Supabase uses refresh tokens rather than our 8 h absolute
expiry. The session time-box setting depends on the plan (§9, Q2).

**Secrets:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public), `SUPABASE_SERVICE_ROLE_KEY`
(scripts only, never in the Railway web service if avoidable). Railway env vars only. Update
`.env.example` and `docs/SECURITY.md`.

**Acceptance:** all current integration scenarios pass on the Supabase backend (login,
CSRF, authorization denials, CRUD, lead rate-limit). An RLS test suite where the anon key
cannot read leads, drafts or admins, or write anything except via `submit_lead`. Row counts and
checksums match the SQLite source exactly.
**Effort:** 9–12 days. **P1.** Can start in parallel with Phase 3.

---

## 5. Phase 5 — Cloudflare R2 and image migration

### 5.1 Bucket and delivery [P]

- One bucket `aks-media` (plus `aks-media-staging`). **Public read via a custom domain**
  `media.<domain>` (vehicle photos are public anyway). The `r2.dev` URL stays disabled.
- Cache: object keys are immutable (content-hashed), so serve
  `Cache-Control: public, max-age=31536000, immutable`.
- Resizing: either (a) the client already crops to 1600 px 4:3 JPEG [V], and we additionally
  generate 400/800 px WebP variants in the browser before upload, or (b) Cloudflare Image
  Transformations on the custom domain (usage-billed). Recommend **(a)**: no extra cost, and it
  keeps the current pipeline. (§9, Q5)
- CORS on the bucket: `PUT` from `APP_ORIGIN` only, for presigned uploads.

### 5.2 Upload flow [P]

1. The admin selects files. The browser crops and makes variants (existing code in `src/lib/data.ts`).
2. Server fn `createUploadUrls` (admin only, origin-checked) returns a presigned `PUT` per file,
   signed for the exact `Content-Type` and `Content-Length` (≤ 2 MB, jpeg/png/webp), 5 min TTL.
   Key: `vehicles/{car_id}/{sha256}-{w}.{ext}`. Brand logos: `brands/{slug}/{sha256}.svg`.
   Site assets: `site/{field}/{sha256}.{ext}`.
3. Server fn `finalizeUpload` sends `HEAD` to the object, checks size and type, and reads the
   first bytes (magic number) to confirm it's an image. Then it inserts `car_images` with
   `status='active'`. Pending rows older than 24 h get cleaned.
4. R2 credentials (S3 API token scoped to the bucket) live only in Railway env vars. Signing
   uses a small S3 signer (`aws4fetch`), with no AWS SDK needed.
5. **Delete/replace:** remove the DB row (marked `deleted`, with timestamp). A reconcile script
   deletes objects that have been deleted for > 7 days and lists orphans (objects with no row)
   for review. SVG logos are sanitized or only accepted from admins, and served with
   `Content-Type: image/svg+xml` from the media domain, never inline.

### 5.3 Migration of existing images

**Inventory sources [V locally / A in prod]:**
(a) `public/images/*.jpg` — 20 files: 18 car photos, plus the logo and storefront.
(b) `data:` URLs inside `cars.document.images` — 0 locally, production count unknown.
(c) `data:` URLs in `identity.logo`, `identity.favicon`, `hero.image_1`.
(d) External `http(s)` URLs: decide whether to copy them (recommended) or keep them as is.
(e) Unused `src/assets/car-*.jpg` and `hero-car.jpg`: not migrated, deleted with the redesign.

**Script** `scripts/migrate-images-to-r2.ts`:

1. **Inventory:** walk the DB backup and `public/images`. Write `manifest.json` with one
   entry per reference: `{source, ref (table/row/field/index), sha256, bytes, mime, width,
height, target_key, status}`. Duplicates collapse onto one key via sha256 and are reported.
2. **Copy:** batches of 10, 3 retries with exponential backoff. The manifest is updated after
   each object, so a rerun resumes. If `HEAD` shows the key already exists with the same size,
   it is skipped (idempotent).
3. **Verify:** for every entry, `GET` the public URL, compare bytes and sha256, and decode the image.
4. **Only then update references:** insert `car_images` rows with `legacy_src` = the original
   value, and update content fields to the new URL, in one transaction per car.
5. **Report:** counts by source, missing sources (references to files that don't exist),
   duplicates, and bucket objects not in the manifest (orphans).
6. **Rollback:** `legacy_src` and the manifest allow restoring the old references by script.
   `public/images` stays in the repo and the SQLite backup stays intact **until production has run
   on R2 for ≥ 14 days with no 404s in logs**. Deletion is a separate, explicitly approved PR.

**Acceptance:** manifest count = DB reference count. 100 % of entries verified by hash. 0
broken images on a full crawl of `/`, `/recherche` and every `/vehicule/*`. Public page payload
no longer contains `data:image`. Hero/LCP image served from the media domain with an immutable
cache header.
**Effort:** 5–7 days. **P1.** Bucket setup can start any time. The migration runs inside the Phase 4 cutover.

---

## 6. Phase 6 — Search, filters and listings

Depends on Phases 2.2 (data model), 3 (components) and 4 (server-side queries).

1. **One filter model** shared by home, `/recherche`, brand pages and the admin list:
   a zod schema of `marque, modele, carrosserie, etat, energie, boite, prix_min, prix_max,
km_max, annee_min, tri, page`, validated in `validateSearch` (fixes D4). Unknown values are
   dropped, with no silent match-all.
2. **URL-driven state**, so results are shareable and back/forward work. Server-side filtering and
   counts (`count: 'exact'`) in a single server fn `searchCars(filters)`. 12 per page.
3. **UI:**
   - Home: brand logo grid (brands with stock, count badge) → `/recherche?marque=x`.
     Body silhouette strip → `?carrosserie=y`. Compact search bar (brand → model → budget).
     The "Inventory" chips section is replaced by the latest arrivals plus a "see all" link (fixes D3).
   - `/recherche`: sidebar (desktop) or drawer (mobile) with brand logos, a dependent model
     `Select` (disabled until a brand is chosen and reset when the brand changes), body
     silhouettes, state, fuel, gearbox, price range `Slider` + `NumberField`, km max and year min.
     Active-filter `Tag`s with ✕, "Réinitialiser" and a result count. Sort: recent, price ↑↓,
     km ↑, year ↓. "Prix à discuter" cars sort last when sorting by price, and are excluded only
     when a price bound is set (current behaviour [V]).
   - Option counts, and options with 0 results hidden or disabled.
   - Optional SEO routes `/marques/$brand` reusing the same page (§9, Q8).
4. **States:** skeleton grid during loading, `EmptyState` with a reset action, `Alert` with
   retry on error, disabled model select with a hint.
5. The `inventory.budgets` CMS collection becomes the price presets in the filter (kept, not lost).

**Acceptance:** every filter combination is reflected in the URL and survives reload. Counts equal
the number of rendered results. The model list matches the brand. Mobile filter drawer is usable
at 360 px. Keyboard-only operation works. P95 server time for `searchCars` < 200 ms on staging.
**Effort:** 6–8 days. **P1.**

---

## 7. Phase 7 — Testing, performance, deployment, validation

- **CI** (GitHub Actions): typecheck, lint, unit tests, integration tests on a local Supabase
  (`supabase start`), and RLS tests. Add **Playwright** E2E for search, detail, contact, admin login, car
  CRUD with upload, and the content edit.
- **Performance budgets:** LCP < 2.5 s on 4G for `/` and `/recherche`, CLS < 0.1, JS < 250 KB gzip
  for public routes. Self-host Inter. Responsive `srcset` from the R2 variants.
- **Observability:** `/healthz` (DB reachable), structured server logs on Railway, Supabase logs
  and alerts, uptime check. Error tracking (e.g. Sentry) is optional (§9, Q9).
- **Production validation checklist:** after cutover, crawl all public URLs (200, no broken
  images), test login and lead submission end to end, check the RLS probe with the anon key, and
  re-run the security probe from docs/AUDIT.md §5 against Supabase.
- **Decommission** (separate approved PR, ≥ 14 days later): remove the SQLite code, the volume,
  `public/images` and `legacy_src` columns.
  **Effort:** 4–6 days, spread across phases. **P0 for CI** (first thing in Phase 3).

---

## 8. Execution order, parallelism and estimates

| Step | Work                                                    | Depends on      | Parallel with | Effort (dev-days) | Priority |
| ---- | ------------------------------------------------------- | --------------- | ------------- | ----------------- | -------- |
| 1    | Phase 1 audit + prod inventory + decisions              | —               | —             | 1–2               | P0       |
| 2    | CI pipeline + Playwright smoke                          | 1               | 3, 4a         | 1–2               | P0       |
| 3    | Phase 2 design + data-model RFC + icon brief            | 1               | 2, 4a, 5a     | 4–6               | P0       |
| 4a   | Supabase project, schema, RLS, repository behind flag   | 3 (schema part) | 5, 6          | 6–8               | P1       |
| 5a   | R2 bucket, domain, presign/finalize server fns          | 1               | 4a, 6         | 2–3               | P1       |
| 6    | HeroUI spike → admin + forms migration                  | 3               | 4a, 5a        | 4–5               | P1       |
| 7    | Public redesign with HeroUI (home, detail, nav, footer) | 3, 6            | 4a            | 4–6               | P1       |
| 8    | Search/filters/listing on `searchCars`                  | 4a, 7           | —             | 6–8               | P1       |
| 9    | ETL + image migration rehearsals on staging             | 4a, 5a          | 8             | 3–4               | P1       |
| 10   | Production cutover (data + images), validation          | 8, 9            | —             | 1–2               | P1       |
| 11   | Perf budgets, observability, decommission               | 10              | —             | 2–3               | P2       |

The UI work (6–8) can ship on SQLite before the cutover, because the repository seam isolates it.
The filters in step 8 need the new columns, which is why that step waits for 4a.

---

## 9. Decisions needed from you

1. **Theme:** switch to a light theme (like the reference), or keep dark-only, or offer both?
   Recommendation: light by default.
2. **Supabase plan and project:** a new project (recommended) and plan tier. Do you need an 8 h
   absolute session limit (plan-dependent), or are refresh-token sessions acceptable?
3. **Brand logos:** OK to display manufacturer logos? Who supplies the SVGs?
4. **Extra specs** (doors, seats, fiscal power, transmission, colour): add them to the model and
   admin form now, or later?
5. **Image variants:** client-side variants (free, recommended) or Cloudflare Image
   Transformations (paid, simpler)?
6. **Date pickers:** none exist today. Do you want a date-range filter on admin leads (the only
   sensible use)?
7. **Spam protection:** add Cloudflare Turnstile to the contact form?
8. **SEO brand pages** `/marques/bmw`: wanted?
9. **Error tracking** (Sentry or similar): wanted, and who owns the account?
10. **Production access:** a read-only DB backup and the domain/DNS details (needed before Phases 4–5).
11. **Hosting:** stay on Railway for the web server (recommended), or move?
12. **Lovable:** will you keep editing in Lovable during this work? If so, we merge to `main`
    only at stable points and avoid large formatting-only diffs.

## 10. Top risks

| Risk                                                  | Impact                | Mitigation                                                                                              |
| ----------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| Unknown production data shape (data URLs, odd brands) | ETL errors at cutover | Read-only backup first, rehearsal on staging, dry-run diffs                                             |
| Misconfigured RLS exposes leads                       | Personal data leak    | Deny-by-default, automated anon-key RLS tests in CI, no service role in the web app                     |
| HeroUI SSR hydration issues under TanStack Start      | Rework                | Spike as a go/no-go gate before migrating screens                                                       |
| CMS keys orphaned by the redesign                     | Lost edited copy      | Keep keys, deprecate rather than delete, diff stored keys vs fields.json                                |
| Admin locked out after the auth switch                | No admin access       | Invite and test admin login on staging, keep the SQLite rollback flag for 30 days                       |
| Broken images after migration                         | Listings degraded     | Hash-verified copy, references updated only afterwards, `legacy_src` rollback, originals kept ≥ 14 days |
| Lovable sync of half-finished work                    | Broken editor/site    | Feature branches, merge only green builds, no history rewrites                                          |
| Logo trademark concerns                               | Legal                 | Your decision (Q3), text fallback                                                                       |

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) · [AUDIT.md](AUDIT.md)
