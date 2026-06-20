# Coaching App

A coaching and athlete management platform for personal trainers and coaches. Next.js web app backed by Supabase.

## What works today

- Email/password authentication (sign up, sign in, sign out) with coach and client roles
- Coach dashboard with stats, today's schedule, action items, and activity feed
- Client management: list, search, filter, create, edit, archive, delete, notes, avatars, and invite flow
- Training library: custom exercises, ExerciseDB catalog import, workout templates, and programs
- Program builder: multi-week day-offset calendar with exercise prescriptions per workout
- Program assignment: assign programs to clients and materialize workouts onto their calendar
- Client calendar: schedule workouts, copy across dates, rich exercise builder, and workout logging
- Client portal: month calendar, view scheduled sessions, and self-service workout logging
- Check-ins: expanded weekly form (weight, sleep duration/quality, calm, energy, motivation, nutrition, soreness, pain flags), client portal submit with recent history, coach review inbox, and manual coach entry
- Load management and PR analytics: weekly volume and ACWR on client overview, PR detection in workout logging, persisted PR history, and coach `/load` dashboard
- Progress photos: client upload (front/side/back) attached to check-ins, coach gallery on client detail tab, and roster `/progress-photos` feed
- Client messaging: direct coach ↔ client chat on the client detail Messages tab, coach `/messages` inbox, and client portal `/portal/messages`
- Teams: create teams, roster management, shared program assignment, announcements, events with RSVP/attendance, and bulk program assign
- Client team portal: athletes on a team see announcements and upcoming events at `/portal/team`, RSVP (going / maybe / declined), and a next-event card on the portal home
- InBody scans: log body composition scans with history graphs on client detail
- Program phases: named blocks (hypertrophy, strength, peaking) in the program builder calendar
- Coach My Workouts: personal training calendar and logging via a hidden self-client row
- Client coaching type: online, in-person, or hybrid badge on roster and client profile
- Load prescription: `% 1RM` and RPE targets on program and client calendar exercises
- Settings: profile, account, and coaching preference panels (some options marked “Soon”)

## What's coming

Attendance, form review, leaderboards, and wearables appear in the UI but are not yet implemented.

## Deployment

### Vercel (recommended)

1. Import the repo and set the root directory to `apps/next` (or deploy from monorepo root with build command `yarn workspace next-app build`).
2. Add environment variables in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `EXERCISEDB_RAPIDAPI_KEY` (optional, for ExerciseDB import)
3. Apply database migrations **before** the first deploy (or after schema changes):
   ```sh
   npx supabase login && yarn db:link && yarn db:push
   ```
   This applies all migrations in `supabase/migrations/` (currently **0001–0029**). For one-off patches without the CLI, see the apply scripts below.
4. Verify schema: `yarn db:check` (checks tables through migration 0029)
5. Deploy, then run the [smoke test checklist](docs/smoke-test.md).

### Migration order (hosted Supabase)

**Preferred:** `yarn db:push` applies migrations 0001–0029 in order.

If not using the CLI, run scripts in Supabase Dashboard → SQL. Core foundation (0002–0016):

| Script | Purpose |
|--------|---------|
| `apply-programs.sql` | Programs and assignments |
| `apply-library.sql` | Exercises and workout templates |
| `apply-client-calendar.sql` | Client calendar |
| `apply-exercise-details.sql` | Exercise prescription fields |
| `apply-exercise-block.sql` | Exercise blocks |
| `apply-workout-logging.sql` | Workout logging |
| `apply-program-calendar.sql` | Program calendar |
| `apply-program-workout-exercises.sql` | Program exercise templates |
| `apply-client-portal.sql` | Client portal write access (required for logging) |
| `apply-client-check-ins.sql` | Client check-ins and coach review |
| `apply-check-in-fields.sql` | Expanded check-in metrics (calm, soreness, nutrition, pain) |
| `apply-exercise-prs.sql` | Exercise PR history and load analytics (0017) |
| `apply-client-progress-photos.sql` | Progress photo uploads and private storage |
| `apply-client-inbody-scans.sql` | InBody body composition scans (0019) |

Recent feature patches (0024–0028; teams 0020–0022 require `db:push`):

| Script | Purpose |
|--------|---------|
| `apply-exercise-load-prescription.sql` | `% 1RM` and RPE prescription fields |
| `apply-client-coaching-type.sql` | Online / in-person / hybrid coaching type |
| `apply-program-phases.sql` | Program phase blocks in program builder |
| `apply-client-messages.sql` | Coach ↔ client messaging |
| `apply-coach-self-client.sql` | Coach My Workouts self-client row |
| `apply-team-client-portal.sql` | Client portal team announcements, events, RSVP (0029) |

Do **not** use `apply-remote.sql` — it is deprecated and incomplete.

### CI

GitHub Actions runs typecheck (`tsc --noEmit`) and build on every PR. Optional schema verification runs when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured as repository secrets.

## Testing

### Schema verification

```sh
yarn db:check                              # verify hosted Supabase tables
yarn workspace next-app check:supabase     # verify connectivity
```

### Manual smoke test

See [docs/smoke-test.md](docs/smoke-test.md) for the coach → client workout checklist.

### E2E tests (Playwright)

```sh
# Add SUPABASE_SERVICE_ROLE_KEY to apps/next/.env.local, then:
yarn workspace next-app seed:e2e
yarn workspace next-app exec playwright install chromium
yarn workspace next-app test:e2e
```

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
   npx supabase login && yarn db:link && yarn db:push
   ```

   Or run feature-specific scripts in Supabase Dashboard → SQL (see migration list in Deployment above).

   **Local Supabase:**

   ```sh
   supabase start
   supabase db reset
   ```

4. Verify schema:

   ```sh
   yarn db:check
   ```

5. Start the web app:

   ```sh
   yarn web
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. Verify Supabase connectivity:

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
| `yarn db:check` | Verify hosted Supabase schema (migrations through 0028) |
| `yarn db:push` | Push migrations via Supabase CLI |
| `yarn workspace next-app build` | Production build |
| `yarn workspace next-app check:supabase` | Test Supabase connection |
| `yarn workspace next-app seed:e2e` | Seed E2E test users and data (requires service role key) |
| `yarn workspace next-app test:e2e` | Run Playwright E2E tests |

## Tech stack

- Next.js 16 (App Router), React 19, Tailwind CSS
- Supabase (PostgreSQL, auth, RLS)
- Yarn workspaces + Turborepo
- Solito monorepo scaffold (Expo + Next.js)
