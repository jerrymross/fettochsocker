# Fett & Socker

Production-ready modular recipe web app built with Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Zod, and React PDF.

## Features

- Email/password registration and login with secure hashed passwords and HTTP-only JWT session cookies
- Admin module toggles stored in the database
- Module-aware navigation and backend route blocking
- Normalized recipe data model with automatic total weight calculation
- Recipe scaling by target total weight or portion plan
- Import flow for PDF, DOCX, and TXT with Unstructured parsing, preview, and manual correction
- PDF export for single recipes or combined recipe collections with a cover page and table of contents

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- PostgreSQL
- @react-pdf/renderer
- Zod

## Environment

Copy `.env.example` to `.env.local` and set:

```env
DATABASE_URL="postgresql://user:password@host:5432/receptlight"
DIRECT_URL="postgresql://user:password@host:5432/receptlight"
SESSION_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
UNSTRUCTURED_API_URL="https://api.unstructured.io/general/v0/general"
UNSTRUCTURED_API_KEY=""
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="replace-with-a-strong-password"
SEED_ADMIN_NAME="Admin User"
SEED_DEMO_DATA="false"
```

Notes:

- `DATABASE_URL` should point to your application database connection string.
- `DIRECT_URL` can use the same direct PostgreSQL connection string unless you later introduce a separate pooler.
- `UNSTRUCTURED_API_URL` and `UNSTRUCTURED_API_KEY` are required for PDF and DOCX parsing.
- Plain text import falls back to local text extraction if Unstructured is not configured.
- PDF export runs entirely in Node and does not require a browser binary.
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are recommended in production so the first deploy creates an admin account.
- `SEED_DEMO_DATA=true` enables the demo users and sample recipes. Leave it `false` on production unless you explicitly want demo content.

## Local setup

```bash
npm install
```

Create a PostgreSQL database, copy the connection string into `.env.local`, then run:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

If you need to create a new migration before pushing schema changes to Supabase:

```bash
npm run db:migrate:dev -- --name your_change_name
```

The active migration history in `prisma/migrations` is a PostgreSQL baseline. The previous MySQL migration history has been moved to `prisma/mysql-migrations-archive`.

## Seeded accounts

- Local/demo only: `admin@admin.se` / `admin1234`
- Local/demo only: `chef@receptlight.local` / `demo1234`

## Important paths

- `app/(dashboard)` dashboard and module pages
- `app/api` sample API endpoints
- `lib/server` auth, modules, recipes, imports, exports
- `prisma/schema.prisma` Prisma schema
- `prisma/migrations/20260312180000_postgres_baseline/migration.sql` PostgreSQL baseline migration
- `prisma/seed.ts` seed script

## Deployment notes

- `next.config.ts` uses `output: "standalone"` for container deployment.
- Protected app routes are enforced through `proxy.ts`.
- Module checks are enforced both in page loaders and API handlers.
- PDF export runs server-side through `@react-pdf/renderer`.
- Use PostgreSQL for the database and store `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, and `APP_URL` in your deployment environment.

## Render deployment

The repo includes a `render.yaml` blueprint for a Node web service and a Render Postgres database.

Suggested setup:

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In Render, create a new Blueprint and point it at this repo.
3. During Blueprint creation, let Render create the `receptlightv1-db` Postgres instance.
4. Set these environment variables in Render:
   - `APP_URL`
   - `UNSTRUCTURED_API_KEY` if you use PDF/DOCX import
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
   - `SEED_ADMIN_NAME` if you want a custom admin display name
5. Keep `SEED_DEMO_DATA=false` for production.

The blueprint runs:

- build: `npm ci && npm run build`
- pre-deploy: `npm run render:predeploy`
- start: `npm run start`

That means Render will install dependencies, build the Next.js app, run Prisma migrations, seed base data, and then start the service.

The Blueprint wires both `DATABASE_URL` and `DIRECT_URL` from the Render Postgres internal connection string automatically, so the app and Prisma migrations use the same Render-managed database.
