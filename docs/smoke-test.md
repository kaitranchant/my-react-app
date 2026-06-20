# Smoke test checklist

Repeatable manual verification for the coach → client loop and recent features. Run after applying migrations or before a production deploy.

**Prerequisites**

- `yarn db:check` passes (schema through migration **0029**)
- `yarn web` running at http://localhost:3000
- Migrations applied via `yarn db:push`, or the relevant `supabase/apply-*.sql` scripts

---

## 1. Coach setup

- [ ] Sign in as a coach account at `/login`
- [ ] Dashboard loads with stats and today's schedule
- [ ] Go to **Clients** → **Add client** → create via invite or manual entry
- [ ] Copy the invite link (if using invite flow)

## 2. Program and calendar

- [ ] Go to **Library** → **Programs** → create a program (or use an existing one)
- [ ] Open the program calendar and add at least one workout day with exercises
- [ ] Add a **program phase** (e.g. "Hypertrophy" for days 0–27) in the phases panel
- [ ] Go to the client detail page → **Programs** tab → **Assign program**
- [ ] Confirm start date and assign
- [ ] Open the client **Calendar** tab and verify workouts appear on the expected dates

## 3. Client portal

- [ ] Open the invite link in a private/incognito window (or use a separate browser)
- [ ] Complete signup and sign in — should redirect to `/portal`
- [ ] Month calendar shows scheduled workouts on the assigned dates
- [ ] Click a day with a workout → open **Log workout**
- [ ] **Start session** → log at least one set (weight/reps) → **Complete workout**
- [ ] Workout status updates to completed on the calendar

## 4. Coach verification

- [ ] Sign back in as coach
- [ ] Open the same client → **Calendar** tab
- [ ] Confirm the workout shows as completed
- [ ] Check **Overview** tab for updated activity / completion metrics

## 5. Check-ins

- [ ] As client on `/portal`, scroll to **Weekly check-in** and submit metrics (weight, sleep, calm/stress, energy, motivation, nutrition, soreness, pain flag)
- [ ] Confirm submission shows as submitted (editable until coach reviews)
- [ ] Sign in as coach → **Check-ins** in sidebar
- [ ] Pending tab shows the client submission
- [ ] Add a coach response and save — status updates to reviewed
- [ ] Client portal shows coach feedback on refresh
- [ ] Coach can also log a check-in manually from **Check-ins → Log check-in** or the client **Check-ins** tab

## 5b. Progress photos

- [ ] As client on `/portal/check-in`, submit a check-in if needed, then upload a front/side/back photo
- [ ] Confirm thumbnail appears on the check-in card
- [ ] Sign in as coach → **Progress Photos** in sidebar — photo appears in roster feed
- [ ] Open the client **Progress photos** tab — photo appears grouped by date

## 6. Load and PRs

- [ ] Log a workout with weight/reps and **Complete workout**
- [ ] Confirm PR toast appears when the set beats prior performance
- [ ] Open client **Overview** — verify **This week volume**, **ACWR**, and **Recent PRs**
- [ ] Open coach **Load Management** in sidebar — roster shows volume, ACWR, and expandable 8-week chart

## 7. Messaging

- [ ] As client, open **Messages** on `/portal/messages` and send a message to your coach
- [ ] Sign in as coach → **Inbox** (`/messages`) — conversation appears with the client
- [ ] Reply from the inbox — message shows in the thread
- [ ] Open the same client → **Messages** tab — thread matches the inbox

## 8. Teams

- [ ] Go to **Teams** → **Create team** → name it and save
- [ ] On the team detail page → **Members** tab → **Add member** → add an existing client
- [ ] Confirm the client appears in the roster
- [ ] (Optional) Assign a shared program to the team and verify members get calendar workouts

## 8b. Client team portal

- [ ] As coach: on the team **Overview** tab, post an announcement
- [ ] As coach: on the **Schedule** tab, add a future team event (practice or check-in)
- [ ] Sign in as a client who is on that team → open **Team** in the portal sidebar (`/portal/team`)
- [ ] Confirm the team name, announcement, and upcoming event appear
- [ ] Tap **Going** (or **Maybe** / **Can't make it**) — RSVP badge updates
- [ ] Sign back in as coach → team **Schedule** tab — RSVP count shows the client response (e.g. "1 going")
- [ ] On the client portal home, confirm the **Team event** card appears when a future event exists

## 9. Coach My Workouts

- [ ] Open **My Workouts** in the sidebar
- [ ] Schedule a workout on today's date (or copy from library)
- [ ] Log at least one set and complete the session
- [ ] Confirm the self-client workout does **not** appear on the main **Clients** roster or dashboard stats

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Database setup required" in calendar or log modal | Run the SQL file shown in the notice (see [`readme.md`](../readme.md)) |
| Client cannot start/complete workout (RLS error) | Run [`supabase/apply-client-portal.sql`](../supabase/apply-client-portal.sql) |
| Check-ins page empty or submit fails | Run [`supabase/apply-client-check-ins.sql`](../supabase/apply-client-check-ins.sql) then [`supabase/apply-check-in-fields.sql`](../supabase/apply-check-in-fields.sql) |
| Progress photo upload fails | Run [`supabase/apply-client-progress-photos.sql`](../supabase/apply-client-progress-photos.sql) |
| PR toasts or load metrics missing | Run [`supabase/apply-exercise-prs.sql`](../supabase/apply-exercise-prs.sql); optionally backfill with `yarn workspace next-app backfill:prs` |
| Messaging tab or inbox fails | Run [`supabase/apply-client-messages.sql`](../supabase/apply-client-messages.sql) or `yarn db:push` |
| My Workouts shows schema notice | Run [`supabase/apply-coach-self-client.sql`](../supabase/apply-coach-self-client.sql) or `yarn db:push` |
| Program phases panel fails | Run [`supabase/apply-program-phases.sql`](../supabase/apply-program-phases.sql) or `yarn db:push` |
| Teams page empty or errors | Run `yarn db:push` (migrations 0020–0022; no apply script) |
| Client cannot see team page / RSVP fails | Run [`supabase/apply-team-client-portal.sql`](../supabase/apply-team-client-portal.sql) or `yarn db:push` |
| Portal shows "No account linked" | Re-send invite or verify `clients.user_id` is set after signup |
| Empty calendar after program assign | Confirm program calendar has workout days; re-assign with a valid start date |
| `yarn db:check` fails | Run `npx supabase login && yarn db:link && yarn db:push` |
