# Receptlight

Production-ready modular recipe web app built with Next.js, React, TypeScript, Tailwind CSS, Prisma, MySQL, Zod, and Playwright.

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
- MySQL
- Playwright
- Zod

## Environment

Copy `.env.example` to `.env.local` and set:

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/receptlight"
SESSION_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
UNSTRUCTURED_API_URL="https://api.unstructured.io/general/v0/general"
UNSTRUCTURED_API_KEY=""
```

Notes:

- `UNSTRUCTURED_API_URL` and `UNSTRUCTURED_API_KEY` are required for PDF and DOCX parsing.
- Plain text import falls back to local text extraction if Unstructured is not configured.
- Playwright needs Chromium installed before runtime PDF export.

## Local setup

```bash
npm install
npm run playwright:install
```

Create the database, then run:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

If you prefer Prisma dev migrations against a local database:

```bash
npm run db:migrate:dev -- --name init
```

## Seeded accounts

- Admin: `admin@receptlight.local` / `admin1234`
- User: `chef@receptlight.local` / `demo1234`

## Important paths

- `app/(dashboard)` dashboard and module pages
- `app/api` sample API endpoints
- `lib/server` auth, modules, recipes, imports, exports
- `prisma/schema.prisma` Prisma schema
- `prisma/migrations/20260310160000_init/migration.sql` initial migration
- `prisma/seed.ts` seed script

## Deployment notes

- `next.config.ts` uses `output: "standalone"` for container deployment.
- Protected app routes are enforced through `proxy.ts`.
- Module checks are enforced both in page loaders and API handlers.
- PDF export runs server-side through Playwright Chromium.
- Use a managed MySQL instance and persistent environment variables in production.
