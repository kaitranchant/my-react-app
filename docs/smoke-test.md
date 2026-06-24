# Smoke test checklist

Repeatable manual verification for the coach → client loop and recent features. Run after applying migrations or before a production deploy.

**New since migration 0060** (sections 21–27): session scheduling, compliance dashboard, voice/broadcast messaging, team forum, exercise demo videos, onboarding automation, portal notification preferences, and web push.

**Prerequisites**

- Migrations applied through **0074** via `yarn db:push` (or the relevant `supabase/apply-*.sql` scripts listed in [readme.md](../readme.md))
- `yarn db:check` passes for schema through migration **0074**
- `yarn web` running at http://localhost:3000

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
- [ ] Reply from the inbox — message shows in the thread without a full page reload (realtime)
- [ ] Open the same client → **Messages** tab — thread matches the inbox

## 7b. Voice messages

- [ ] As coach in the inbox thread, record a **voice note** and send — player appears in the thread
- [ ] As client on `/portal/messages`, play the voice note
- [ ] As client, record and send a voice note back — coach inbox shows the recording

## 7c. Coach broadcasts

- [ ] As coach on `/messages`, open **Broadcast** in the inbox toolbar
- [ ] Select a team or individual clients → send a text broadcast
- [ ] Sign in as a selected client → `/portal/messages` — broadcast appears in the thread
- [ ] (Optional) Send a **voice broadcast** to multiple clients — each thread receives the same recording

## 7d. Message templates (optional)

- [ ] Go to **Library → Message templates** (`/library/message-templates`) → create a template
- [ ] Open a client **Messages** tab or the inbox — insert the template when composing a reply

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

## 8c. Global attendance

- [ ] Go to **Attendance** in the sidebar (`/attendance`)
- [ ] Confirm **Daily roll call** lists active clients for the selected scope
- [ ] Use the top row (**All** / **Personal** / gym tabs) to filter by gym context
- [ ] Use the second row (**All clients** / team tabs) to filter by team
- [ ] Select a **team tab** — roll call shows only that team's members
- [ ] Mark a client **Present** — summary chip updates (e.g. "1 present")
- [ ] With **All clients** selected, confirm **Team events** is hidden
- [ ] Select a specific team tab — **Team events** appears for that team
- [ ] If a team event exists for today: expand **Roll call** on the event → mark a member **Present** — attendance count updates
- [ ] Use the date nav to move to another day and back — state follows the URL `?date=` param

## 9. Coach My Workouts

- [ ] Open **My Workouts** in the sidebar
- [ ] Schedule a workout on today's date (or copy from library)
- [ ] Log at least one set and complete the session
- [ ] Confirm the self-client workout does **not** appear on the main **Clients** roster or dashboard stats

## 10. Gyms

- [ ] Go to **Gym** in the sidebar → **Create gym** → name it and save
- [ ] Confirm you appear as the gym owner on the members list
- [ ] Open an existing client profile → **Add to {gym name}** → confirm the button changes to **Remove from {gym name}**
- [ ] Open an existing team → **Add to {gym name}** → confirm the button changes to **Remove from {gym name}**
- [ ] On **Clients**, switch the scope tab to your gym — the shared client appears with a gym member badge
- [ ] On **Teams**, switch the scope tab to your gym — the shared team appears with a gym member badge
- [ ] Back on **Gym** → **Invite coach** → enter a second coach's email → copy the invite link
- [ ] Sign in as that coach (new signup via `/signup?gym_invite=…` or existing account at `/gym/join?invite=…`) → **Accept invite**
- [ ] As the invited coach: open **Clients** → gym scope tab — the shared client is visible
- [ ] As the invited coach: open **Teams** → gym scope tab — the shared team is visible and manageable
- [ ] Open the client profile — **Primary coach** banner shows the original coach; calendar and overview load without errors
- [ ] As the invited coach: confirm you **cannot** remove the client from the gym or delete the client (primary coach only)
- [ ] As the invited coach: confirm you **cannot** remove the team from the gym or delete the team (primary coach only)
- [ ] (Optional) As gym owner: **Delete gym** in the danger zone — client gym membership clears and the invited coach loses access

## 11. Settings

- [ ] Go to **Settings** → **Notifications** — toggle **Workout completions** off and save (toast confirms)
- [ ] Open **Dashboard** — completed workouts should no longer appear in the activity feed; re-enable the toggle and confirm they return
- [ ] Go to **Settings** → **Account** → **Change password** — update password and sign in again with the new one
- [ ] (Optional) **Delete account** requires `SUPABASE_SERVICE_ROLE_KEY` in server env; only test on a disposable coach account

## 11b. Coaching preferences

- [ ] Go to **Settings** → **Coaching preferences** → switch **Weight unit** to kg and save
- [ ] Open **Load Management** and a client **Overview** — volumes and weights show kg
- [ ] Change **Week starts on** to Sunday — client **Overview** week strip starts on Sunday
- [ ] Change **Default check-in frequency** to **Daily** — sign in as client and confirm portal check-in card shows **Due today**
- [ ] Change frequency to **Bi-weekly** — portal card shows **Due this period** until a check-in is submitted

## 12. Client goals

- [ ] Open a client → **Progress** tab → **Goals**
- [ ] Click the **Steps** preset → **Add daily target** — goal appears in the list
- [ ] Add a body composition goal (e.g. lose 20 lbs) with a target date — preview card shows progress
- [ ] Sign in as client → **Goals** in portal sidebar (`/portal/goals`)
- [ ] Confirm daily target and composition goal appear with progress bars
- [ ] (Optional) Edit a goal from the coach Goals tab — changes reflect on portal refresh

## 12b. Client goals v2 (performance, habit, milestone)

- [ ] On the client **Goals** tab, click **Add goal** → choose **Performance**
- [ ] Select an exercise, set a target (e.g. squat 315 lbs), add a target date → **Save goal**
- [ ] Confirm the performance goal card shows progress (or "awaiting data" if no PRs yet)
- [ ] Add a **Habit** goal (e.g. train 4×/week) and a **Milestone** goal (e.g. complete 20 sessions)
- [ ] Sign in as client → `/portal/goals` — all three trackable goal types appear with status badges

## 13. Form review

- [ ] As client, open **Form Review** in the portal sidebar (`/portal/form-review`)
- [ ] Add a title and notes, upload a photo or video → **Submit for review**
- [ ] Confirm the submission appears with **Awaiting review** status
- [ ] (Optional) Log a workout → on an exercise row, open **Submit form** → **Submit form photo/video** — confirm submission shows **From workout log** context
- [ ] Sign in as coach → **Monitoring → Form Review** (`/form-review`)
- [ ] **Pending** tab shows the submission with client name and notes
- [ ] Add coach feedback → **Save feedback** — item leaves the pending list
- [ ] **All** tab shows the submission as **Reviewed**
- [ ] Sign back in as client → `/portal/form-review` — coach feedback is visible
- [ ] (Optional) With `RESEND_API_KEY` configured and **New form review submissions** enabled in coach Settings → Notifications, coach receives an email linking to `/form-review`

## 14. Leaderboards

- [ ] Sign in as coach → **Athletes → Leaderboards** (`/leaderboards`)
- [ ] Confirm the roster table loads and category tabs work (Strength, Wilks/DOTS, Streak, etc.)
- [ ] Switch period tabs (e.g. **This month**) — URL updates and table refreshes
- [ ] Select a **team** scope tab — weight-class filter appears
- [ ] (Optional) On a client profile, set **Biological sex** and bodyweight — open **Wilks / DOTS** and confirm a score appears for that athlete
- [ ] Sign in as client on a team → **Leaderboards** in portal sidebar (`/portal/leaderboards`)
- [ ] Confirm team rankings load and **Your leaderboard profile** card is visible
- [ ] (Optional) Set biological sex on the profile card — Wilks/DOTS column updates on refresh

## 15. Progressive overload

- [ ] On a client calendar exercise, enable **Auto progress load** in the prescription editor
- [ ] Assign the workout and have the client log all rep targets for that exercise, then complete the session
- [ ] Sign in as coach → **Programming → Progressive overload** (`/progressive-overload`)
- [ ] Confirm a suggestion appears for the client/exercise with previous and suggested weight
- [ ] Click **Approve** — toast confirms target weight applied to upcoming sessions
- [ ] (Optional) Click **Dismiss** on another suggestion — it leaves the inbox

## 16. Team challenges

- [ ] Open a team → **Challenges** tab
- [ ] Click **New challenge** → name it, choose **Consistency** (or another metric), keep the default date range → **Create draft**
- [ ] Click **Publish** on the draft challenge card
- [ ] Sign in as a client on that team → `/portal/team` — **Team challenges** section shows the challenge
- [ ] (Optional) Expand **Show standings** on the coach challenge card

## 17. Workout log client notes

- [ ] As client, open a scheduled workout log and expand notes on an exercise row
- [ ] Add a short note (e.g. "Felt heavy today") and save
- [ ] Sign in as coach → open the same client's completed workout log — client note is visible on that exercise

## 18. Form review annotations (video)

- [ ] As client, submit a **video** form review from `/portal/form-review`
- [ ] As coach, open **Form Review** → pending submission with a video
- [ ] Add a timestamped marker on the timeline with coach feedback → **Save feedback**
- [ ] Client portal shows reviewed status and coach feedback on refresh

## 19. Supersets

- [ ] Open a client **Calendar** tab → build or edit a workout
- [ ] In the workout builder, click **Add superset** — banner shows group **A**
- [ ] Add two exercises from the library with prescriptions → each joins the superset
- [ ] Click **Finish superset** — workout order panel shows both exercises in a colored **Superset A** block
- [ ] (Optional) Use the link icon on an exercise row to **Join superset** or **Create new superset**
- [ ] Save and sign in as client → open the workout log — exercises appear grouped under **Superset A**
- [ ] (Optional) On mobile portal workout log, switch to **Guided** view — footer shows superset position (e.g. `Superset A · 1 of 2`)

## 20. Portal home and mobile UX

Requires migrations **0059** and **0060** (`apply-portal-coach-display-name.sql`, `apply-portal-program-progress.sql`). Session booking card requires **0072+**.

- [ ] As client on `/portal` (mobile viewport ~375px): bottom nav shows **Home**, **Workouts**, **Sessions**, **Messages**, and **More** (Progress and Check-in are under More)
- [ ] As coach on mobile: bottom nav shows **Dashboard**, **Users**, **Schedule**, **Inbox**, and **More** (Check-ins and Compliance are under More)
- [ ] Portal home shows coach name in **From your coach** (not generic "Coach") when the coach has a profile name
- [ ] With an active program assigned: **Your program** card shows "Week X of Y" and weekly completion (e.g. "2 of 4 workouts completed"); tapping opens `/portal/workouts`
- [ ] With client self-booking enabled: **Sessions** card appears on portal home linking to `/portal/sessions`
- [ ] **This week** strip uses status colors (completed, in progress, skipped, scheduled) with a legend below
- [ ] **Training consistency** card shows a heatmap on mobile (not text-only stats)
- [ ] Navigate to **Progress** (via More) — mobile stats include **ACWR**; **8-week volume** chart and load-balance card are visible
- [ ] New client with no messages: **From your coach** shows a "Message your coach" CTA instead of hiding the section
- [ ] Coach sends a message → **Messages** tab icon shows an unread badge; open and read — badge clears on refresh
- [ ] Submit a form review → **More** menu shows a badge on **Form Review** while pending
- [ ] `/portal/check-in` shows **Your wellness trends** when prior check-ins exist (sleep, energy, soreness)
- [ ] Navigate between `/portal`, `/portal/sessions`, and `/portal/workouts` — loading skeletons appear briefly (not a blank page)
- [ ] Visit a bad coach URL (e.g. `/clients/not-a-real-id` on a missing client) — friendly **Page not found** with link back to dashboard
- [ ] Visit a bad portal URL (e.g. `/portal/does-not-exist`) — friendly **Page not found** with link back to home

## 21. Session scheduling

Requires migrations **0072–0074** (`apply-coaching-session-booking.sql`, `apply-appointment-reminders.sql`, `apply-scheduling-improvements.sql`).

- [ ] Sign in as coach → open **Scheduling** (`/scheduling`) — on mobile, use the **Schedule** tab in the bottom nav
- [ ] **Availability** tab → enable **Client self-booking** and set weekly hours in the availability grid → save
- [ ] Confirm the **Shareable booking link** appears — copy link (format `/book/{coach-slug}`) and preview
- [ ] **Session packs** tab → create a pack for a client (e.g. 10 sessions) — pack appears in the list
- [ ] **This week** tab → **Book appointment** → book a session for a client — appointment appears in the week calendar/list
- [ ] Sign in as client → **Sessions** (`/portal/sessions`) — upcoming session appears
- [ ] Book another session via the client booking form (pick date + time slot) — toast confirms and list refreshes
- [ ] As client, cancel an upcoming session — status updates on refresh
- [ ] As coach, open **Manage** on a scheduled session → mark completed or add session notes
- [ ] (Optional) Open the booking link in a private window while signed out → login redirects to `/portal/sessions` after sign-in
- [ ] (Optional) With **Appointment reminders** enabled in coach Settings → Notifications, verify reminder preference saves

## 22. Compliance dashboard

Uses existing client, check-in, messaging, and load data — no separate migration.

- [ ] Sign in as coach → **Compliance** (`/compliance`) — summary stats load (need attention, missed workouts, unread messages, etc.)
- [ ] Use gym/team scope tabs to filter the roster
- [ ] Click **Needs attention** filter — only clients with open issues appear
- [ ] Expand a client row — issue chips show with links (missed workout, overdue check-in, unread message, etc.)
- [ ] Click an issue link — navigates to the relevant client tab or inbox
- [ ] With no issues on a client, confirm **On track** count increases in the summary

## 23. Team forum (Community)

Requires migration **0067** (`yarn db:push`).

- [ ] Open a team → **Community** tab
- [ ] Post a discussion as coach — post appears in the feed
- [ ] Pin the post — **Pinned** badge shows
- [ ] Sign in as a client on that team → `/portal/team` — **Community** section shows the post
- [ ] As client, reply to the post — reply appears for coach on refresh (realtime)
- [ ] As coach, delete or unpin the post — changes reflect on portal

## 24. Exercise demo videos

Requires migration **0070** (`apply-exercise-demo-videos.sql`).

- [ ] Go to **Library → Exercises** → edit an exercise (or create one)
- [ ] In the exercise form, upload a short **demo video** (MP4/WebM) — preview plays after upload
- [ ] Assign a workout using that exercise to a client and open the workout log (coach or client)
- [ ] On an exercise row, open the demo video — inline player or modal plays the clip
- [ ] (Optional) Remove the demo video from the exercise form — player no longer appears in the log

## 25. Onboarding automation (optional)

Requires migration **0069** (`apply-onboarding-automation.sql`).

- [ ] Go to **Settings** → **Onboarding automation**
- [ ] Set a default welcome message template and/or default onboarding program → save
- [ ] Invite a new client and complete their portal signup
- [ ] Confirm the welcome message is sent (inbox) and/or the default program is assigned automatically

## 26. Portal account and notifications

Requires migrations **0061** and **0071** for full feature set (`apply-portal-notification-preferences.sql`, `apply-web-push-subscriptions.sql`).

- [ ] As client, open **Account** (`/portal/account`) via the user menu
- [ ] **Notifications** section — toggle email preferences (e.g. check-in reminders) and save
- [ ] (Optional) **Push notifications** — enable browser push when prompted; send a coach message and confirm a push arrives (requires HTTPS or localhost and service worker support)
- [ ] **Preferences** — switch weight unit to kg — portal load/goal displays update on refresh

## 27. Coach settings additions

- [ ] **Settings → Notifications** — toggle **Appointment reminders** and **Weekly summary**; save succeeds
- [ ] (Optional) With `RESEND_API_KEY` configured, client email nudges cron sends reminder emails (migration **0063**)

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
| Gym page empty or invite/join fails | Run [`supabase/apply-gyms.sql`](../supabase/apply-gyms.sql) or `yarn db:push` (migrations 0030–0032) |
| Gym creation returns RLS error | Run [`supabase/apply-gym-create-fix.sql`](../supabase/apply-gym-create-fix.sql) or `yarn db:push` (0031) |
| Coach cannot join a second gym | Run [`supabase/apply-multi-gym.sql`](../supabase/apply-multi-gym.sql) or `yarn db:push` (0032) |
| Shared client shows "Primary coach" without a name | Run [`supabase/apply-gym-peer-profiles.sql`](../supabase/apply-gym-peer-profiles.sql) or `yarn db:push` (0033) |
| Coach preferences fail to save | Run [`supabase/apply-coach-preferences.sql`](../supabase/apply-coach-preferences.sql) or `yarn db:push` (0034) |
| Notification toggles fail to save | Run [`supabase/apply-notification-preferences.sql`](../supabase/apply-notification-preferences.sql) or `yarn db:push` (0035) |
| Goals tab or portal goals page fails | Run [`supabase/apply-client-goals.sql`](../supabase/apply-client-goals.sql) or `yarn db:push` (0038) |
| Performance/habit/milestone goals fail to save | Run [`supabase/apply-client-goals-v2.sql`](../supabase/apply-client-goals-v2.sql) or `yarn db:push` (0039) |
| Attendance page fails or coaching type won't save | Run [`supabase/apply-client-daily-attendance.sql`](../supabase/apply-client-daily-attendance.sql) and [`supabase/apply-attendance-enhancements.sql`](../supabase/apply-attendance-enhancements.sql) or `yarn db:push` (0040–0042) |
| Team gym assignment fails | Run [`supabase/apply-team-gym.sql`](../supabase/apply-team-gym.sql) or `yarn db:push` (0041) |
| Leaderboards page fails or portal rankings empty | Run [`supabase/apply-leaderboard-opt-out.sql`](../supabase/apply-leaderboard-opt-out.sql), [`supabase/apply-portal-leaderboards.sql`](../supabase/apply-portal-leaderboards.sql), and related scripts through [`supabase/apply-team-powerlifting-exercises.sql`](../supabase/apply-team-powerlifting-exercises.sql) or `yarn db:push` (0043–0047) |
| Wilks/DOTS scores missing | Set client **Biological sex** and bodyweight; run [`supabase/apply-client-biological-sex.sql`](../supabase/apply-client-biological-sex.sql) and [`supabase/apply-portal-leaderboard-bodyweight.sql`](../supabase/apply-portal-leaderboard-bodyweight.sql) or `yarn db:push` (0045–0046) |
| Form review page fails or upload errors | Run [`supabase/apply-client-form-reviews.sql`](../supabase/apply-client-form-reviews.sql) through [`supabase/apply-form-review-images.sql`](../supabase/apply-form-review-images.sql) or `yarn db:push` (0048–0050) |
| Form review annotation markers fail to save | Run [`supabase/apply-form-review-annotations.sql`](../supabase/apply-form-review-annotations.sql) or `yarn db:push` (0054) |
| Client exercise notes fail to save during logging | Run [`supabase/apply-scheduled-exercise-client-notes.sql`](../supabase/apply-scheduled-exercise-client-notes.sql) or `yarn db:push` (0055) |
| Progressive overload inbox shows schema notice | Run [`supabase/apply-progressive-overload.sql`](../supabase/apply-progressive-overload.sql) or `yarn db:push` (0056) |
| PR notification toggle missing or won't save | Run [`supabase/apply-notify-prs.sql`](../supabase/apply-notify-prs.sql) or `yarn db:push` (0057) |
| Team challenges tab fails or portal standings empty | Run [`supabase/apply-team-challenges.sql`](../supabase/apply-team-challenges.sql) or `yarn db:push` (0058) |
| Portal shows "Coach" instead of coach name | Run [`supabase/apply-portal-coach-display-name.sql`](../supabase/apply-portal-coach-display-name.sql) or `yarn db:push` (0059) |
| Program card missing "Week X of Y" or weekly completion | Run [`supabase/apply-portal-program-progress.sql`](../supabase/apply-portal-program-progress.sql) or `yarn db:push` (0060) |
| Portal notification toggles fail to save | Run [`supabase/apply-portal-notification-preferences.sql`](../supabase/apply-portal-notification-preferences.sql) or `yarn db:push` (0061) |
| Progressive overload dismiss fails permanently | Run [`supabase/apply-progressive-overload-decisions-delete.sql`](../supabase/apply-progressive-overload-decisions-delete.sql) or `yarn db:push` (0062) |
| Client email nudges cron fails | Run [`supabase/apply-client-email-nudges.sql`](../supabase/apply-client-email-nudges.sql) or `yarn db:push` (0063) |
| Message templates page fails | Run [`supabase/apply-coach-message-templates.sql`](../supabase/apply-coach-message-templates.sql) or `yarn db:push` (0064) |
| Voice message upload or playback fails | Run `yarn db:push` (0065 message media + storage policies) |
| Broadcast send fails | Run `yarn db:push` (0066 coach broadcasts) |
| Team Community tab or portal forum fails | Run `yarn db:push` (0067 team forum) |
| Messages don't update live | Run `yarn db:push` (0068 realtime messaging) |
| Onboarding automation settings fail | Run [`supabase/apply-onboarding-automation.sql`](../supabase/apply-onboarding-automation.sql) or `yarn db:push` (0069) |
| Exercise demo video upload fails | Run [`supabase/apply-exercise-demo-videos.sql`](../supabase/apply-exercise-demo-videos.sql) or `yarn db:push` (0070) |
| Web push subscribe fails | Run [`supabase/apply-web-push-subscriptions.sql`](../supabase/apply-web-push-subscriptions.sql) or `yarn db:push` (0071) |
| Scheduling page fails or booking slots empty | Run [`supabase/apply-coaching-session-booking.sql`](../supabase/apply-coaching-session-booking.sql) or `yarn db:push` (0072) |
| Appointment reminder preference missing | Run [`supabase/apply-appointment-reminders.sql`](../supabase/apply-appointment-reminders.sql) or `yarn db:push` (0073) |
| Booking link or availability exceptions fail | Run [`supabase/apply-scheduling-improvements.sql`](../supabase/apply-scheduling-improvements.sql) or `yarn db:push` (0074) |
| `/book/{slug}` returns 404 | Confirm `apps/next/app/book/[slug]/page.tsx` is deployed; client must use the copied booking URL |
| Wearables page shows schema notice | Run [`supabase/apply-client-wearables.sql`](../supabase/apply-client-wearables.sql) and [`supabase/apply-client-wearable-secrets.sql`](../supabase/apply-client-wearable-secrets.sql) or `yarn db:push` (0051–0052) |
| Delete account fails on server | Add `SUPABASE_SERVICE_ROLE_KEY` to `apps/next/.env.local` (local) or Vercel env (production) |
| Portal shows "No account linked" | Re-send invite or verify `clients.user_id` is set after signup |
| Empty calendar after program assign | Confirm program calendar has workout days; re-assign with a valid start date |
| Coach or portal 404 shows generic Next.js page | Confirm `not-found.tsx` exists under `app/(dashboard)` and `app/portal` |
| `yarn db:check` fails | Run `npx supabase login && yarn db:link && yarn db:push` (applies through 0074) |
