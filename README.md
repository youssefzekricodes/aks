# Auto Kontor Sfax

React + TanStack Start application (Node server) backed by **Supabase** (PostgreSQL, Auth, Row Level Security) and **Cloudflare R2** (photos and images). The public site and the admin panel share the same data.

## Run locally

Use Node.js 22.17+ (Node 24 recommended). You need a Supabase project and an R2 bucket (see the two sections below), then:

```bash
npm ci
cp .env.example .env      # fill in the Supabase and R2 values
npm run r2:setup          # CORS for browser uploads + upload/read/delete check
npm run admin:create      # creates the first administrator (Supabase Auth)
npm run seed:demo         # optional: six demo cars with photos (empty database only)
npm run dev
```

Open http://localhost:3000 and sign in at http://localhost:3000/auth. If port 3000 is busy, Vite picks another port: set `APP_ORIGIN` in `.env` to the exact address shown and add it to `R2_EXTRA_ORIGINS` (then re-run `npm run r2:setup`), otherwise logins, forms and uploads are refused. `admin:create` prompts for an e-mail and a hidden password (12–256 characters); run it again with the same e-mail to set a new password. There is no public registration.

Contact forms save inquiries that appear under **Demandes** in the admin panel (no e-mail notification).

## Supabase

1. Create a project (Project Settings → API gives `SUPABASE_URL`, the **anon/publishable** key and the **service_role** key).
2. Apply the schema: run each file of `supabase/migrations/` **in name order** in the SQL editor (`…_init.sql`, `…_roles_mfa.sql`, `…_brand_settings.sql`, `…_email_2fa.sql`, `…_sales_views.sql`, `…_social.sql`, then `…_social_connection.sql`), or with the Supabase CLI `supabase link` then `supabase db push`.
3. **Authentication → Sign In / Providers → Email**: keep e-mail/password enabled and **disable “Allow new users to sign up”** (admins are created by `npm run admin:create` or by a super admin in the dashboard). Under **URL Configuration** set the Site URL to your `APP_ORIGIN`.
4. **Two-factor authentication** (required for super administrators): after the password, a 6-digit code is e-mailed to the super admin. In **Authentication → Emails → Templates → Magic Link**, make the e-mail show the code, e.g. `<p>Votre code de connexion : <strong>{{ .Token }}</strong></p>` (without `{{ .Token }}` only a link is sent and the code cannot be typed). Supabase’s built-in mailer only delivers to members of your Supabase organisation and a few e-mails per hour: for other addresses, set a custom SMTP server under **Authentication → Emails → SMTP Settings** (Resend, Brevo, Gmail SMTP…). Authenticator-app and SMS factors are implemented too but hidden for now (`APP_FACTORS_ENABLED` in `src/features/admin/model.ts`).
5. **Deploy the `admin-users` Edge Function** (used by super admins to manage administrators; it holds the service-role key inside Supabase so the web server never does):

   ```sh
   npx supabase login                                   # once, opens the browser
   npx supabase functions deploy admin-users --project-ref <project-ref>
   ```

   `<project-ref>` is the `xxxx` in `https://xxxx.supabase.co`. Alternatively: **Edge Functions → Deploy a new function → Via Editor**, name it `admin-users`, and paste `supabase/functions/admin-users/index.ts` and `handler.ts`.

6. Create the first account with `npm run admin:create` and answer **o** to “Super administrateur”. At each sign-in a code is sent to that address.
7. Optional hardening: Authentication → Sessions (time-box / inactivity timeout, plan dependent), Auth rate limits, and Database → Backups.

Roles: **Administrateur** manages vehicles, brands, content and inquiries (password). **Super administrateur** can also create administrators, reset any administrator’s password (which signs them out everywhere), change roles and remove accounts; a second factor is mandatory and enforced in the database (RLS requires `aal2` for super admins), in the web server and in the Edge Function.

How it is used:

- The web server uses only the **anon key**; admin requests also carry the signed-in user's JWT (HttpOnly, `SameSite=Strict` cookies set by `@supabase/ssr`). **Row Level Security** in the database decides what each request may read or change. Admins are users with `app_metadata.role = "admin"`, which only the service-role key can set.
- The **service-role key** is used only by the maintenance scripts (`admin:create`, `seed:demo`, `r2:cleanup`) from a trusted terminal and by the `admin-users` Edge Function inside Supabase (provided automatically). Never configure it on the hosting provider and never expose it to the browser.
- Public inquiries go through the `submit_lead` database function (input validation and rate limits: 5 per phone number and 100 overall per hour). The TanStack server functions are the API layer; the one Edge Function (`admin-users`) exists because managing other accounts needs the service-role key.

## Cloudflare R2

1. **R2 → Create bucket** (e.g. `aks-media`).
2. Public read access for images: **Settings → Custom Domains** (recommended, e.g. `media.example.com`) or enable the `r2.dev` URL for testing. Put that base URL in `R2_PUBLIC_URL`.
3. **R2 → Manage API tokens → Create API token** with _Object Read & Write_ limited to this bucket. Copy the access key ID and secret into `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`, and your account ID into `R2_ACCOUNT_ID`.
4. Run `npm run r2:setup` (sets CORS so browsers on `APP_ORIGIN` can upload, then checks upload → public read → delete).

How uploads work: the admin asks the server for a **presigned PUT URL** valid 5 minutes for one exact key, content type and size; the browser uploads the file directly to R2; when the car, logo or content is saved the server checks every referenced object (exists, allowed type and size) before writing to the database, and deletes the objects that were removed or replaced. R2 credentials never leave the server.

Object keys: `vehicles/{yyyy}/{mm}/{uuid}.jpg|webp` (car photos, 4:3, ≤ 1600 px, ≤ 4 MB), `brands/{brand-slug}/{uuid}.png|webp` (≤ 400 KB), `site/{content-field}/{uuid}.jpg|png|webp` (≤ 3 MB). Keys are immutable, so a custom-domain cache rule with a long TTL is safe.

Uploads that are never saved, or deletions that failed, leave **orphans**: `npm run r2:cleanup` lists objects no row references (dry run); `npm run r2:cleanup -- --apply` deletes those older than 24 hours. Schedule it weekly (e.g. a Railway cron job) if you like.

## Gérer le contenu depuis l’administration

Ouvrez `/admin`, puis **Contenu du site**. Les rubriques permettent de modifier les textes, boutons, logo, image d’accueil, favicon, coordonnées, réseaux sociaux, carte et titres/descriptions de référencement. La recherche retrouve les champs dans toutes les rubriques.

- Les listes de navigation, chiffres clés, services, témoignages, horaires, services inclus et budgets permettent d’ajouter, supprimer et réordonner les éléments.
- La rubrique **Sections de la page d’accueil** permet d’afficher ou masquer chaque section.
- Les logos de marques se gèrent dans **Marques** : 59 logos couleur (`public/brands/<marque>.webp`, repris de la liste des marques d’automobile.tn) et 5 logos monochromes simple-icons (`scripts/generate-brand-logos.ts`) sont intégrés ; un PNG/WebP importé les remplace ; sans logo, le nom est affiché. Les images de carrosserie (`public/bodies/*.svg`) viennent du même site.
- Les images peuvent être importées depuis votre ordinateur (JPG/PNG/WebP, 2 Mo maximum) ou remplacées par une URL.
- **Publier les modifications** enregistre les changements dans la base Supabase et les rend publics. Les changements non publiés restent en mémoire pendant les changements d’onglet de l’administration. Ils sont perdus si vous vous déconnectez ou fermez la page après l’avertissement.
- **Annuler les modifications** abandonne le brouillon. **Rétablir les valeurs initiales** prépare une réinitialisation de la rubrique ; elle ne devient publique qu’après publication.
- Les modèles de résultat de recherche acceptent la variable `{count}`. Les libellés des filtres sont personnalisables ; les marques, carrosseries et états de l’inventaire proviennent des véhicules publiés.

Les véhicules, caractéristiques (marque, modèle, version, portes, places, puissance fiscale, transmission…), tarifs et photos se gèrent dans **Véhicules**. La recherche publique (`/recherche`, `/marques/<marque>`) filtre par marque, modèle, carrosserie, budget, état, kilométrage, année, énergie, boîte et transmission ; l’état des filtres est dans l’URL. L’éditeur de contenu conserve la mise en page du site : il ne s’agit pas d’un éditeur de code ou de CSS. Les nouvelles rubriques utilisent leurs valeurs initiales si aucune valeur n’est enregistrée, sans écraser les contenus existants. Les autorisations et la validation sont appliquées côté serveur.

Le catalogue des champs se trouve dans `src/features/content/fields.json`, les modèles des listes dans `collections.json` et la validation partagée dans `definition.ts`. Les composants publics utilisent `useSiteText` et `useSiteCollection`.

## Organisation des fichiers

```text
src/routes/                 Route definitions and public pages
src/features/admin/         Admin dashboard and editing forms
src/features/auth/          Authentication server functions
src/features/catalog/       Catalog server functions, validation, shared types
src/server/                 Supabase clients, auth/session checks, R2 storage, repository
supabase/migrations/        Database schema, RLS policies and SQL functions
src/components/aks/         Public showroom components (HeroUI v3 + Tailwind v4)
src/components/aks/search/  Listing page, filter panel, active filters
src/features/catalog/search.ts  Shared filter model (URL schema, filtering, facets, sorting)
src/lib/                    Shared helpers and compatibility facade
public/images/              Locally hosted original project images
public/brands/              Generated monochrome brand logos (simple-icons, CC0)
scripts/                    Admin creation, demo seed, R2 setup and orphan cleanup
tests/                      Search unit tests, RLS tests, production HTTP tests
docs/                       Architecture, security, contribution and audit notes
```

Route guards improve navigation; server authorization protects every admin read and mutation, and Row Level Security enforces it again in the database. Admin accounts are Supabase Auth users with the `admin` role; sessions are HttpOnly, SameSite=Strict cookies (Secure in production). Supabase Auth rate-limits sign-ins; public inquiries are rate-limited in the database. Mutations validate the exact Origin and inputs. There is no public account creation.

Only source, assets and configuration are tracked in Git. `.env`, build output (`.output`, `.vercel`) and the nested `page-hugger-delight/` project are ignored. `.gitattributes` normalizes line endings to LF so checkouts behave the same on Windows, macOS and Linux. Before sharing the repository or inviting a collaborator, work through the pre-share checklist in [docs/SECURITY.md](docs/SECURITY.md#6-pre-share-checklist-before-making-the-repository-public-or-inviting-a-collaborator).

Existing images were copied from Lovable into public/images. The build no longer uses Lovable's Vite wrapper or asset proxy. Lovable project metadata remains for history continuity; no git history has been rewritten. The old PostgreSQL/Drizzle scaffold has been removed. Use npm/package-lock.json for this standalone setup.

## Documentation

| Document                                     | Contents                                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, module map, data model, request flows, content system, extension recipes                                        |
| [docs/SECURITY.md](docs/SECURITY.md)         | Security controls, secrets policy, credential/rotation and restore runbooks, accepted limitations, pre-share checklist |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Setup, commands, conventions, how to add a server function or a migration                                              |
| [docs/AUDIT.md](docs/AUDIT.md)               | Dated repository audit, ratings per dimension, open items                                                              |

## Verify

```sh
npm run typecheck
npm run lint
npm test          # builds, then unit tests + HTTP tests (Supabase tests skip without credentials)
```

- `tests/search.test.ts`: search/filter logic.
- `tests/admin-users.test.ts`: the admin-management Edge Function rules (2FA required, no self-demotion, last super admin kept, sign-out on password reset).
- `tests/rls.test.ts`: Row Level Security against any Postgres that has `tests/supabase-stub.sql` and the migration applied, e.g. a throwaway local one:

  ```sh
  initdb -D /tmp/aks-pg -U postgres --auth=trust && pg_ctl -D /tmp/aks-pg -o "-p 54329 -k /tmp" start
  createdb -h /tmp -p 54329 -U postgres aks
  psql -h /tmp -p 54329 -U postgres -d aks -f tests/supabase-stub.sql -f supabase/migrations/20261018120000_init.sql -f supabase/migrations/20261018150000_roles_mfa.sql -f supabase/migrations/20261018170000_brand_settings.sql -f supabase/migrations/20261018190000_email_2fa.sql -f supabase/migrations/20261019120000_sales_views.sql -f supabase/migrations/20261019150000_social.sql -f supabase/migrations/20261019170000_social_connection.sql
  PG_TEST_URL="postgresql://postgres@/aks?host=/tmp&port=54329" npm run test:rls
  ```

- `tests/integration.test.ts`: runs the production build against the Supabase project in `.env` (public reads, refused anonymous admin calls, CSRF, validation). With `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` it also signs in and creates, publishes and deletes a temporary draft car.

## Deploy (Docker, Railway or any Node host)

The server is stateless — data lives in Supabase and files in R2 — so no volume is needed.

1. Build with the root `Dockerfile` (Railway detects it) or `npm ci && npm run build && npm start`.
2. Environment variables on the host: `APP_ORIGIN` (exact public HTTPS origin, no trailing slash), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, optionally `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`. **Do not** set `SUPABASE_SERVICE_ROLE_KEY` there. `PORT` is usually provided by the platform.
3. After changing `APP_ORIGIN` (e.g. a custom domain), add it to the bucket CORS: set it in your local `.env` and run `npm run r2:setup`, and update the Supabase Site URL.
4. Put HTTPS in front (platform domain or Cloudflare proxy with SSL mode **Full (strict)**).

Create administrators from your computer with `npm run admin:create` (it talks to Supabase with the service-role key from your local `.env`).

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase SSR auth](https://supabase.com/docs/guides/auth/server-side), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) and [TanStack server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions).

## Réseaux sociaux (Facebook et Instagram)

When a vehicle is saved as published (and not sold), the admin can post it to the Facebook Page and the linked Instagram account, with its photos and an editable text (vehicle form → **Réseaux sociaux**). Each vehicle is posted once per network; failed posts can be retried from the form.

The connection is made in the admin, **Connecteurs** section ("Se connecter avec Facebook"), which also shows the setup guide. In short:

1. Create a Meta app at [developers.facebook.com/apps](https://developers.facebook.com/apps) (use case "Manage everything on your Page", type Business).
2. In Facebook Login (or Facebook Login for Business) settings, add the redirect URI `https://<your-site>/meta-callback` (and `http://localhost:3000/meta-callback` for local use). With Facebook Login for Business, create a configuration with the permissions `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`, `instagram_basic`, `instagram_content_publish`.
3. Supabase → Edge Functions → Secrets: `META_APP_ID`, `META_APP_SECRET` (and `META_LOGIN_CONFIG_ID` for Facebook Login for Business). Deploy: `npx supabase functions deploy social-publish --project-ref <project-ref>`. Run the `…_social.sql` and `…_social_connection.sql` migrations.
4. Make the Instagram account professional and link it to the Page.
5. In the admin → Connecteurs → "Se connecter avec Facebook", choose the Page. Switch the Meta app to Live mode so posts are public.

The Page token is stored in `public.social_connection`, readable only by the Edge Function (service role); the browser and Netlify never see it. Never put `META_APP_SECRET` in `.env`, Netlify or the code.
