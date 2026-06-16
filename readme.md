# Coaching App

A coaching and athlete management platform for personal trainers and coaches. Phase 1 focuses on authenticated client roster management via a Next.js web app backed by Supabase.

## What works today

- Email/password authentication (sign up, sign in, sign out)
- Dashboard with client count stats
- Client management: list, search, filter by status, create, edit, archive, delete
- Inline notes editing on client detail pages

## What's coming

Workouts, programs, check-ins, progress photos, and other features appear in the sidebar navigation but are not yet implemented.

## Prerequisites

- Node.js 18+
- Yarn 4 (included via Corepack)
- A [Supabase](https://supabase.com) project, or the [Supabase CLI](https://supabase.com/docs/guides/cli) for local development

## Quick start

1. Install dependencies:

   ```sh
   yarn
   ```

2. Configure environment variables:

   ```sh
   cp apps/next/.env.example apps/next/.env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project (Project Settings → API).

   **Note:** Env vars belong in `apps/next/.env.local`, not the repo root.

3. Apply the database schema:

   **Hosted Supabase:**

   ```sh
   supabase link
   supabase db push
   ```

   **Local Supabase:**

   ```sh
   supabase start
   supabase db reset
   ```

4. Start the web app:

   ```sh
   yarn web
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. Verify Supabase connectivity:

   ```sh
   yarn workspace next-app check:supabase
   ```

## Monorepo layout

| Path | Purpose |
|------|---------|
| `apps/next` | Next.js 16 web app (primary product) |
| `apps/expo` | Expo mobile app (future) |
| `packages/app` | Shared types and cross-platform logic |
| `supabase/` | Database migrations and local config |

## Scripts

| Command | Description |
|---------|-------------|
| `yarn web` | Start Next.js dev server |
| `yarn native` | Start Expo dev client |
| `yarn workspace next-app build` | Production build |
| `yarn workspace next-app check:supabase` | Test Supabase connection |

## Tech stack

- Next.js 16 (App Router), React 19, Tailwind CSS
- Supabase (PostgreSQL, auth, RLS)
- Yarn workspaces + Turborepo
- Solito monorepo scaffold (Expo + Next.js)
