# Fett & Socker

Production-ready modular recipe web app built with Next.js, React, TypeScript, Tailwind CSS, Prisma, Supabase Postgres, Zod, and React PDF.

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
- Supabase Postgres
- @react-pdf/renderer
- Zod

## Environment

Copy `.env.example` to `.env.local` and set:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
SESSION_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
UNSTRUCTURED_API_URL="https://api.unstructured.io/general/v0/general"
UNSTRUCTURED_API_KEY=""
```

Notes:

- `DATABASE_URL` should use the Supabase pooled connection string.
- `DIRECT_URL` should use the direct Postgres connection string for Prisma migrations.
- `UNSTRUCTURED_API_URL` and `UNSTRUCTURED_API_KEY` are required for PDF and DOCX parsing.
- Plain text import falls back to local text extraction if Unstructured is not configured.
- PDF export runs entirely in Node and does not require a browser binary.

## Local setup

```bash
npm install
```

Create a Supabase project, copy the two Postgres connection strings into `.env.local`, then run:

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

The active migration history in `prisma/migrations` is now a PostgreSQL baseline for Supabase. The previous MySQL migration history has been moved to `prisma/mysql-migrations-archive`.

## Seeded accounts

- Admin: `admin@admin.se` / `admin1234`
- User: `chef@receptlight.local` / `demo1234`

## Important paths

- `app/(dashboard)` dashboard and module pages
- `app/api` sample API endpoints
- `lib/server` auth, modules, recipes, imports, exports
- `prisma/schema.prisma` Prisma schema
- `prisma/migrations/20260312180000_postgres_baseline/migration.sql` Supabase/Postgres baseline migration
- `prisma/seed.ts` seed script

## Deployment notes

- `next.config.ts` uses `output: "standalone"` for container deployment.
- Protected app routes are enforced through `proxy.ts`.
- Module checks are enforced both in page loaders and API handlers.
- PDF export runs server-side through `@react-pdf/renderer`.
- Use Supabase Postgres for the database and store `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, and `APP_URL` in your deployment environment.
