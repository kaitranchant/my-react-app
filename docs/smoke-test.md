# Smoke test checklist

Repeatable manual verification for the coach → client workout loop. Run after applying migrations or before a production deploy.

**Prerequisites**

- `yarn db:check` passes (all tables through migration 0014)
- `yarn web` running at http://localhost:3000
- Supabase migrations applied, including [`supabase/apply-client-portal.sql`](../supabase/apply-client-portal.sql)

---

## 1. Coach setup

- [ ] Sign in as a coach account at `/login`
- [ ] Dashboard loads with stats and today's schedule
- [ ] Go to **Clients** → **Add client** → create via invite or manual entry
- [ ] Copy the invite link (if using invite flow)

## 2. Program and calendar

- [ ] Go to **Library** → **Programs** → create a program (or use an existing one)
- [ ] Open the program calendar and add at least one workout day with exercises
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

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Database setup required" in calendar or log modal | Run the SQL file shown in the notice (see [`readme.md`](../readme.md)) |
| Client cannot start/complete workout (RLS error) | Run [`supabase/apply-client-portal.sql`](../supabase/apply-client-portal.sql) |
| Portal shows "No account linked" | Re-send invite or verify `clients.user_id` is set after signup |
| Empty calendar after program assign | Confirm program calendar has workout days; re-assign with a valid start date |
