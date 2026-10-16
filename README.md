# Auto Kontor Sfax

Standalone React + TanStack Start application with a Node server and a local SQLite database. No Supabase or hosted database is required. The public site and admin panel share persistent server data.

## Run locally

Use Node.js 22.17+ (Node 24 recommended) and npm. In PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm run db:init
npm run admin:create
npm run dev
```

Open http://localhost:3000 and sign in at http://localhost:3000/auth. The admin command prompts for an e-mail and a hidden password (12–256 characters). No default password or public registration exists. Run the same command with an existing e-mail to reset its password and revoke its sessions. Never put passwords in source files or command-line arguments.

SQLite lives at `data/aks.sqlite` by default. It is created automatically; the existing showroom catalog is seeded on first application use, only once. Database files and .env are excluded from Git. Contact forms now save inquiries that appear under **Demandes** in the admin panel. This does not send e-mail notifications.

The previous browser-local demo data and fake sessions are no longer used. Edits previously saved only in localStorage are not imported automatically: preserve/export that browser data before clearing it if you need those edits.

## Gérer le contenu depuis l’administration

Ouvrez `/admin`, puis **Contenu du site**. Les rubriques permettent de modifier les textes, boutons, logo, image d’accueil, favicon, coordonnées, réseaux sociaux, carte et titres/descriptions de référencement. La recherche retrouve les champs dans toutes les rubriques.

- Les listes de navigation, chiffres clés, services, témoignages, horaires, services inclus et budgets permettent d’ajouter, supprimer et réordonner les éléments.
- La rubrique **Sections de la page d’accueil** permet d’afficher ou masquer chaque section.
- Les images peuvent être importées depuis votre ordinateur (JPG/PNG/WebP, 2 Mo maximum) ou remplacées par une URL.
- **Publier les modifications** enregistre les changements dans SQLite et les rend publics. Les changements non publiés restent en mémoire pendant les changements d’onglet de l’administration. Ils sont perdus si vous vous déconnectez ou fermez la page après l’avertissement.
- **Annuler les modifications** abandonne le brouillon. **Rétablir les valeurs initiales** prépare une réinitialisation de la rubrique ; elle ne devient publique qu’après publication.
- Les modèles de résultat de recherche acceptent la variable `{count}`. Les libellés des filtres sont personnalisables ; les marques, carrosseries et états de l’inventaire proviennent des véhicules publiés.

Les véhicules, caractéristiques, tarifs et photos se gèrent dans **Véhicules**. L’éditeur de contenu conserve la mise en page du site : il ne s’agit pas d’un éditeur de code ou de CSS. Les nouvelles rubriques utilisent leurs valeurs initiales si aucune valeur n’est enregistrée, sans écraser les contenus existants. Les autorisations et la validation sont appliquées côté serveur.

Le catalogue des champs se trouve dans `src/features/content/fields.json`, les modèles des listes dans `collections.json` et la validation partagée dans `definition.ts`. Les composants publics utilisent `useSiteText` et `useSiteCollection`.

## Organisation des fichiers

```text
src/routes/                 Route definitions and public pages
src/features/admin/         Admin dashboard and editing forms
src/features/auth/          Authentication server functions
src/features/catalog/       Catalog server functions, validation, shared types
src/server/auth/            Password hashing and session authorization
src/server/db/              SQLite connection, migrations, repository, initial seed
src/components/aks/         Public showroom components
src/components/ui/          Reusable UI primitives
src/lib/                    Shared helpers and compatibility facade
public/images/              Locally hosted original project images
scripts/                    Database, backup, and administrator commands
tests/                      Database/password and production HTTP tests
docs/                       Architecture, security, contribution and audit notes
```

Route guards improve navigation; server authorization protects every admin read and mutation. Passwords use salted scrypt hashes. Sessions use random tokens stored as SHA-256 hashes in SQLite and an HttpOnly, SameSite=Strict cookie, with an eight-hour absolute expiry. Production cookies require HTTPS. Login attempts and public lead submissions have persistent rate limits. Mutations validate the exact Origin and inputs. There is no public account creation. Admin recovery requires access to the server terminal.

Only source, assets and configuration are tracked in Git. The database (`data/`), `.env`, build output (`.output`, `.vercel`) and the nested `page-hugger-delight/` project are ignored. `.gitattributes` normalizes line endings to LF so checkouts behave the same on Windows, macOS and Linux. Before sharing the repository or inviting a collaborator, work through the pre-share checklist in [docs/SECURITY.md](docs/SECURITY.md#6-pre-share-checklist-before-making-the-repository-public-or-inviting-a-collaborator).

Existing images were copied from Lovable into public/images. The build no longer uses Lovable's Vite wrapper or asset proxy. Lovable project metadata remains for history continuity; no git history has been rewritten. The old PostgreSQL/Drizzle scaffold has been removed. Use npm/package-lock.json for this standalone setup.

## Documentation

| Document | Contents |
| -------- | -------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, module map, data model, request flows, content system, extension recipes |
| [docs/SECURITY.md](docs/SECURITY.md) | Security controls, secrets policy, credential/rotation and restore runbooks, accepted limitations, pre-share checklist |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Setup, commands, conventions, how to add a server function or a migration |
| [docs/AUDIT.md](docs/AUDIT.md) | Dated repository audit, ratings per dimension, open items |

## Verify

```sh
npm run typecheck
npm run lint
npm test
```

All three gates must pass. Lint reports zero errors (six cosmetic `react-refresh` warnings in the shadcn/ui primitives are expected).

Tests build the application and launch a temporary production server on port 4319 with an isolated database. They cover login, cookies, anonymous access, CSRF, validation, database persistence, publication visibility, inquiries, session expiry, and logout. Node 22 may print experimental warnings for its built-in SQLite and TypeScript stripping APIs.

## Host on a server

Use a Node server with persistent local disk; SQLite is not suitable for an ephemeral static/edge deployment. Run one application instance, keep the database outside the deployed build directory, and put an HTTPS reverse proxy in front of the app.

1. Install dependencies with `npm ci` and build with `npm run build`.
2. Configure `DATABASE_PATH` to an absolute persistent path and `APP_ORIGIN` to your exact HTTPS origin (for example `https://cars.example.com`, without a trailing slash).
3. Set `NODE_ENV=production`, `HOST=127.0.0.1`, and `PORT=3000`. Create the admin using the same `DATABASE_PATH`, then run `npm start` under your service manager.
4. Proxy HTTPS traffic to the Node port. Preserve `Host`; allow request bodies up to 36 MB for image uploads. Do not expose the data directory over HTTP.

## Deploy on Railway

Railway can host this application because it supports a long-running Docker service with persistent volumes. Do not deploy this SQLite-backed version to Vercel serverless functions.

1. Push this repository to GitHub, then create a Railway project and choose **Deploy from GitHub repo**. Railway automatically detects the root `Dockerfile`.
2. In the service **Settings**, generate a public domain.
3. Add a **Volume** at mount path `/app/data`. This is required: it stores the SQLite database, administrator accounts, vehicles, content edits, and contact requests across deployments.
4. In the service **Variables**, set:

   ```text
   APP_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
   DATABASE_PATH=/app/data/aks.sqlite
   ```

   Railway supplies `PORT`; do not hard-code it.
5. Optionally set the service health-check path to `/`, then deploy. Open the generated domain and create the first administrator from the Railway shell:

   ```sh
   node --experimental-strip-types scripts/create-admin.ts
   ```

   Run this command inside the deployed service so it uses the same persistent `DATABASE_PATH` as the website.

## Connect a Cloudflare domain

First deploy the app on Railway using the steps above. You need a domain added to Cloudflare; a Railway deployment alone also provides a public `*.railway.app` URL.

1. In Railway, open the app service **Settings** and add a **Custom Domain** such as `www.example.com`. Railway displays the DNS records for that domain.
2. In Cloudflare, open the domain's **DNS** page and add the `CNAME` and `TXT` records exactly as Railway displays them. Both records are required for verification; do not guess their names or values.
3. Wait until Railway shows the custom domain as verified and its HTTPS certificate is active. Keep the CNAME DNS-only (gray cloud) while Railway verifies it. Afterward, you can enable Cloudflare proxying (orange cloud); if enabled, set Cloudflare **SSL/TLS** encryption mode to **Full (strict)**.
4. In Railway service **Variables**, update `APP_ORIGIN` to the exact public HTTPS origin, for example `https://www.example.com` (no trailing slash), then redeploy. This allows authenticated admin and contact form requests from the custom domain.
5. Open the HTTPS custom domain and confirm the site loads. Keep the Railway volume mounted at `/app/data` so the database and admin account persist.

The database includes uploaded car images as validated data URLs (JPG/PNG/WebP, 2 MB per image, maximum 12 images per car). This keeps backup and relocation simple for a small showroom. For a large catalog, move uploaded images to a dedicated persistent file store later.

A Dockerfile is also provided (not executed as part of local verification):

```sh
docker build -t aks-showroom .
docker volume create aks-data
docker run -d --name aks -p 127.0.0.1:3000:3000 -e APP_ORIGIN=https://cars.example.com -v aks-data:/app/data aks-showroom
docker exec -it aks node --experimental-strip-types scripts/create-admin.ts
```

Terminate HTTPS at your reverse proxy. Keep the named volume when replacing the container.

## Back up and move the database

Run npm run db:backup to create a consistent snapshot in data/backups, including while the app is running. Copy backups off the PC/server and protect access: they contain customer inquiries and password hashes. To migrate, stop the destination app, copy a backup to the destination DATABASE_PATH, and restart. Do not copy only aks.sqlite while a running database may have uncheckpointed WAL data. Keep the old database until the restored site is verified.

Reference: [Node SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) and [TanStack server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions).
