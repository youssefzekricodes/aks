# Contributing — Auto Kontor Sfax

## Setup

```sh
npm ci
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run db:init
npm run admin:create      # create the administrator account you will sign in with
npm run dev               # http://localhost:3000
```

Node.js 22.17+ (24 recommended) and npm. `package-lock.json` is the source of truth; do not
introduce a second lockfile (a stray `bun.lock` exists in history — ignore it).

### `.env` rules

`.env` holds `DATABASE_PATH` and `APP_ORIGIN` only. Do **not** put `NODE_ENV`, `HOST` or
`PORT` there: Vite loads `.env` during `npm run build`, and a non-production `NODE_ENV`
makes the build emit React's *development* JSX runtime, so server rendering then fails with
`(0, import_jsx_dev_runtime.jsxDEV) is not a function`. Set those three in the host
environment instead (`NODE_ENV=production HOST=127.0.0.1 PORT=3000 npm start`, Railway
variables, or the Dockerfile's `ENV`).

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Vite dev server with hot reload on port 3000 |
| `npm run build` | Production build into `.output/` |
| `npm start` | Run the built server (loads `.env`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint + Prettier as errors |
| `npm run format` | Prettier write |
| `npm test` | Build, then `node:test` over `tests/*.test.ts` |
| `npm run admin:create` | Create or reset an administrator (hidden password prompt) |
| `npm run db:init` | Create the database file and schema |
| `npm run db:backup` | Consistent snapshot into `data/backups` |

## Before you push

```sh
npm run typecheck && npm run lint && npm test
```

All three must pass. Do not weaken a test, silence a rule, or add a suppression to get a
green result — fix the cause. The full suite takes well under a minute.

## Conventions

- **TypeScript strictness is intentional.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitReturns` and `noPropertyAccessFromIndexSignature` are on, so index access yields
  `T | undefined` and env reads use `process.env["NAME"]`. Work with the compiler, not against it.
- **Formatting** is Prettier-enforced: 100 columns, double quotes, semicolons, trailing commas.
  Run `npm run format` rather than formatting by hand.
- **Line endings** are LF everywhere, enforced by `.gitattributes` (`* text=auto eol=lf`).
  If your editor writes CRLF you will see spurious diffs and failing lint — fix your editor
  setting, not the config.
- **Paths** use the `@/*` alias for `src/*`.
- **Server-only code** must import `@tanstack/react-start/server-only` (see
  `src/server/auth/session.ts`) and must not be pulled into client components. The ESLint
  config blocks the Next.js `server-only` package on purpose.
- **User-facing copy is French**, and should be editable from the admin panel rather than
  hard-coded. Add it to `src/features/content/fields.json` and read it through
  `useSiteText()`; see [ARCHITECTURE.md](ARCHITECTURE.md#7-content-system).
- **No secrets in source.** Environment values go in `.env` (git-ignored); see
  [SECURITY.md](SECURITY.md#3-secrets-policy).

## Adding a server function

1. Define the Zod schema in the relevant `*.functions.ts` (or `catalog/schemas.ts` if it is shared).
2. Call `createServerFn` with the method, attach `.validator(schema)`, implement the handler,
   and import server modules lazily inside the handler.
3. Put the data logic in `src/server/db/repository.ts` and gate it: `authorize()` for admin
   reads, `authorize(true)` for admin writes, `checkOrigin()` plus `rateLimit()` for public writes.
4. Add or extend a case in `tests/integration.test.ts` so the authorization and validation
   behavior is covered end to end.

## Database changes

Migrations are inline and versioned in `openDatabase()` (`src/server/db/database.ts`).
Add a new `if (!db.prepare("SELECT 1 FROM migrations WHERE version = N").get())` block and
insert the new version inside a transaction. Never edit an already-released version, and keep
every statement idempotent. Data-seeding steps belong in `repository.db()` (see the version 2 seed).

## Commits

- Keep commits small and describe the reason for the change, not the mechanics.
- Never commit `data/`, `*.sqlite*`, `.env`, `node_modules`, `.output` or `.vercel`.
- Do not rewrite published history (no force-push, rebase, amend or squash on `main`).
