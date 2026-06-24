/**
 * Verify hosted Supabase schema through migration 0074.
 * Run: yarn db:check
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  for (const envPath of [
    resolve(__dirname, '../.env.local'),
    resolve(__dirname, '../../../.env.local'),
  ]) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq)
      const value = trimmed.slice(eq + 1)
      if (!process.env[key]) process.env[key] = value
    }
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const checks = []
const headers = { apikey: key, Authorization: `Bearer ${key}` }

async function check(name, fn) {
  try {
    await fn()
    checks.push({ name, ok: true })
  } catch (error) {
    checks.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

async function checkRestTable(name, path) {
  await check(name, async () => {
    const res = await fetch(`${url}${path}`, { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || `HTTP ${res.status}`)
    }
  })
}

await check('avatars storage bucket', async () => {
  // Bucket metadata API is not readable with the anon key; probe via public object URL.
  const res = await fetch(
    `${url}/storage/v1/object/public/avatars/.schema-check`,
    { headers: { apikey: key } }
  )
  const body = await res.text()
  if (body.includes('Bucket not found')) {
    throw new Error('Bucket not found')
  }
  if (!body.includes('Object not found') && !res.ok) {
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('clients.invite_status column', async () => {
  const res = await fetch(
    `${url}/rest/v1/clients?select=invite_status&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('clients.avatar_url column', async () => {
  const res = await fetch(`${url}/rest/v1/clients?select=avatar_url&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('programs table', async () => {
  const res = await fetch(`${url}/rest/v1/programs?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('exercises table', async () => {
  const res = await fetch(`${url}/rest/v1/exercises?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('workouts table', async () => {
  const res = await fetch(`${url}/rest/v1/workouts?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('client_scheduled_workouts table', async () => {
  const res = await fetch(
    `${url}/rest/v1/client_scheduled_workouts?select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('scheduled_workout_exercises table', async () => {
  const res = await fetch(
    `${url}/rest/v1/scheduled_workout_exercises?select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('scheduled_workout_exercises.tracking_options column', async () => {
  const res = await fetch(
    `${url}/rest/v1/scheduled_workout_exercises?select=tracking_options&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('program_assignments table', async () => {
  const res = await fetch(
    `${url}/rest/v1/program_assignments?select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('client_scheduled_workouts.started_at column', async () => {
  const res = await fetch(
    `${url}/rest/v1/client_scheduled_workouts?select=started_at&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('workout_log_sets table', async () => {
  const res = await fetch(`${url}/rest/v1/workout_log_sets?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('program_scheduled_workouts table', async () => {
  const res = await fetch(
    `${url}/rest/v1/program_scheduled_workouts?select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('program_scheduled_workout_exercises table', async () => {
  const res = await fetch(
    `${url}/rest/v1/program_scheduled_workout_exercises?select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('client_check_ins table', async () => {
  const res = await fetch(
    `${url}/rest/v1/client_check_ins?select=id,check_in_date,submitted_by,calm_level,sleep_quality&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('exercise_pr_records table', async () => {
  const res = await fetch(
    `${url}/rest/v1/exercise_pr_records?select=id,record_type,e1rm,forced&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('client_progress_photos table', async () => {
  const res = await fetch(
    `${url}/rest/v1/client_progress_photos?select=id,pose,storage_path&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('client_inbody_scans table', async () => {
  const res = await fetch(
    `${url}/rest/v1/client_inbody_scans?select=id,scan_date,weight_lbs,skeletal_muscle_mass_lbs,percent_body_fat&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
})

await check('progress-photos storage bucket', async () => {
  const res = await fetch(
    `${url}/storage/v1/object/progress-photos/.schema-check`,
    { headers: { apikey: key } }
  )
  const body = await res.text()
  if (body.includes('Bucket not found')) {
    throw new Error('Bucket not found')
  }
  if (!body.includes('Object not found') && !res.ok && res.status !== 400) {
    throw new Error(body || `HTTP ${res.status}`)
  }
})

// Migration 0020 — teams
await checkRestTable('teams table', '/rest/v1/teams?select=id&limit=1')
await checkRestTable(
  'team_members table',
  '/rest/v1/team_members?select=id,team_id,client_id&limit=1'
)
await checkRestTable(
  'program_assignments.team_id column',
  '/rest/v1/program_assignments?select=team_id&limit=1'
)

// Migration 0021 — team features
await checkRestTable(
  'team_announcements table',
  '/rest/v1/team_announcements?select=id&limit=1'
)
await checkRestTable('team_events table', '/rest/v1/team_events?select=id&limit=1')
await checkRestTable(
  'team_event_member_status table',
  '/rest/v1/team_event_member_status?select=id&limit=1'
)

// Migration 0022 — team member weight class
await checkRestTable(
  'team_members.weight_class column',
  '/rest/v1/team_members?select=weight_class&limit=1'
)

// Migration 0024 — load prescription
await checkRestTable(
  'scheduled_workout_exercises.weight_percent column',
  '/rest/v1/scheduled_workout_exercises?select=weight_percent,rpe_target&limit=1'
)

// Migration 0025 — client coaching type
await checkRestTable(
  'clients.coaching_type column',
  '/rest/v1/clients?select=coaching_type&limit=1'
)

// Migration 0026 — program phases
await checkRestTable(
  'program_phases table',
  '/rest/v1/program_phases?select=id,name,start_day_offset,end_day_offset&limit=1'
)

// Migration 0027 — client messaging
await checkRestTable(
  'client_message_threads table',
  '/rest/v1/client_message_threads?select=client_id&limit=1'
)
await checkRestTable(
  'client_messages table',
  '/rest/v1/client_messages?select=id,body,sender_role&limit=1'
)

// Migration 0028 — coach self-client
await checkRestTable(
  'clients.is_coach_self column',
  '/rest/v1/clients?select=is_coach_self&limit=1'
)

// Migration 0029 — client team portal (RLS only; verify trigger function exists via teams read)
await checkRestTable('teams table (client portal)', '/rest/v1/teams?select=id&limit=1')

// Migration 0030 — gyms
await checkRestTable('gyms table', '/rest/v1/gyms?select=id,name&limit=1')
await checkRestTable(
  'gym_members table',
  '/rest/v1/gym_members?select=id,gym_id,coach_id,role,status&limit=1'
)
await checkRestTable(
  'gym_invites table',
  '/rest/v1/gym_invites?select=id,email,status&limit=1'
)
await checkRestTable(
  'clients.gym_id column',
  '/rest/v1/clients?select=gym_id&limit=1'
)

await check('get_gym_invite_preview RPC', async () => {
  const res = await fetch(`${url}/rest/v1/rpc/get_gym_invite_preview`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_token: '00000000-0000-4000-8000-000000000000',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Expected array response from get_gym_invite_preview')
  }
})

await checkRestTable(
  'profiles coaching preference columns',
  '/rest/v1/profiles?select=weight_unit,week_starts_on,coach_timezone,default_check_in_frequency&limit=1'
)

await checkRestTable(
  'profiles notification preference columns',
  '/rest/v1/profiles?select=notify_check_ins,notify_form_reviews,notify_workout_completions,notify_missed_sessions,notify_invite_accepted,notify_prs,notify_weekly_summary&limit=1'
)

await checkRestTable(
  'profiles portal notification preference columns',
  '/rest/v1/profiles?select=portal_notify_messages,portal_notify_check_in_reviews,portal_notify_form_review_replies,portal_notify_team_updates,portal_notify_workout_reminders,portal_notify_check_in_reminders,portal_notify_unread_digest,portal_notify_appointment_reminders&limit=1'
)

// Migration 0038 — client goals
await checkRestTable(
  'client_goals table',
  '/rest/v1/client_goals?select=id,client_id,category,title,metric,sort_order&limit=1'
)

// Migration 0039 — extended goal types
await checkRestTable(
  'client_goals v2 columns',
  '/rest/v1/client_goals?select=target_date,performance_metric,habit_source,milestone_type,program_id&limit=1'
)

// Migration 0040 — daily client attendance
await checkRestTable(
  'client_daily_attendance table',
  '/rest/v1/client_daily_attendance?select=id,client_id,coach_id,attendance_date,status,coaching_type&limit=1'
)

// Migration 0041 — team gym sharing
await checkRestTable(
  'teams gym_id column',
  '/rest/v1/teams?select=id,gym_id&limit=1'
)

// Migration 0042 — attendance enhancements (late status + coaching type override)
await checkRestTable(
  'client_daily_attendance coaching_type column',
  '/rest/v1/client_daily_attendance?select=coaching_type&limit=1'
)

// Migration 0043 — leaderboard opt-out
await checkRestTable(
  'clients.leaderboard_opt_out column',
  '/rest/v1/clients?select=leaderboard_opt_out&limit=1'
)

// Migration 0045 — biological sex for Wilks / DOTS
await checkRestTable(
  'clients.biological_sex column',
  '/rest/v1/clients?select=biological_sex&limit=1'
)

// Migration 0047 — team powerlifting exercise mapping
await checkRestTable(
  'teams powerlifting exercise columns',
  '/rest/v1/teams?select=squat_exercise_id,bench_exercise_id,deadlift_exercise_id&limit=1'
)

// Migration 0048 — client form reviews
await checkRestTable(
  'client_form_reviews table',
  '/rest/v1/client_form_reviews?select=id,client_id,coach_id,storage_path,reviewed_at&limit=1'
)

// Migration 0049 — form review workout context
await checkRestTable(
  'client_form_reviews workout context columns',
  '/rest/v1/client_form_reviews?select=scheduled_workout_id,scheduled_exercise_id&limit=1'
)

// Migration 0050 — form review image uploads (bucket from 0048)
await check('form-reviews storage bucket', async () => {
  const res = await fetch(
    `${url}/storage/v1/object/form-reviews/.schema-check`,
    { headers: { apikey: key } }
  )
  const body = await res.text()
  if (body.includes('Bucket not found')) {
    throw new Error('Bucket not found')
  }
  if (!body.includes('Object not found') && !res.ok && res.status !== 400) {
    throw new Error(body || `HTTP ${res.status}`)
  }
})

// Migration 0051 — client wearables
await checkRestTable(
  'client_wearable_connections table',
  '/rest/v1/client_wearable_connections?select=id,client_id,coach_id,provider,status&limit=1'
)

await checkRestTable(
  'client_wearable_daily_metrics table',
  '/rest/v1/client_wearable_daily_metrics?select=id,client_id,provider,metric_date,steps,sleep_hours,hrv_ms,recovery_score&limit=1'
)

// Migration 0052 — wearable OAuth token secrets (RLS enabled, no policies)
await checkRestTable(
  'client_wearable_connection_secrets table',
  '/rest/v1/client_wearable_connection_secrets?select=connection_id,expires_at&limit=1'
)

// Migration 0054 — form review video annotations
await checkRestTable(
  'client_form_reviews coach_annotations column',
  '/rest/v1/client_form_reviews?select=coach_annotations&limit=1'
)

// Migration 0055 — per-exercise client notes during logging
await checkRestTable(
  'scheduled_workout_exercises.client_notes column',
  '/rest/v1/scheduled_workout_exercises?select=client_notes&limit=1'
)

// Migration 0056 — progressive overload coach approval
await checkRestTable(
  'scheduled_workout_exercises.target_weight column',
  '/rest/v1/scheduled_workout_exercises?select=target_weight&limit=1'
)
await checkRestTable(
  'progressive_overload_decisions table',
  '/rest/v1/progressive_overload_decisions?select=id,coach_id,client_id,exercise_id,status&limit=1'
)

// Migration 0058 — team challenges
await checkRestTable(
  'team_challenges table',
  '/rest/v1/team_challenges?select=id,team_id,coach_id,name,metric,start_date,end_date,status&limit=1'
)

// Migration 0059 — portal coach display name RPC
await check('get_portal_coach_display_name RPC', async () => {
  const res = await fetch(`${url}/rest/v1/rpc/get_portal_coach_display_name`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  const data = await res.json()
  if (typeof data !== 'string') {
    throw new Error('Expected text response from get_portal_coach_display_name')
  }
})

// Migration 0060 — portal program progress (RLS policy on program_scheduled_workouts;
// table already verified above; policy cannot be checked via anon REST)

// Migration 0063 — client email nudges
await checkRestTable(
  'client_email_nudges table',
  '/rest/v1/client_email_nudges?select=id,client_id,nudge_type,reference_key,sent_at&limit=1'
)

// Migration 0064 — coach message templates
await checkRestTable(
  'coach_message_templates table',
  '/rest/v1/coach_message_templates?select=id,coach_id,name,body&limit=1'
)

// Migration 0065 — message media (voice notes)
await checkRestTable(
  'client_messages media columns',
  '/rest/v1/client_messages?select=message_type,storage_path,content_type,media_duration_seconds&limit=1'
)

await check('message-media storage bucket', async () => {
  const res = await fetch(
    `${url}/storage/v1/object/message-media/.schema-check`,
    { headers: { apikey: key } }
  )
  const body = await res.text()
  if (body.includes('Bucket not found')) {
    throw new Error('Bucket not found')
  }
  if (!body.includes('Object not found') && !res.ok && res.status !== 400) {
    throw new Error(body || `HTTP ${res.status}`)
  }
})

// Migration 0066 — coach broadcasts
await checkRestTable(
  'coach_broadcasts table',
  '/rest/v1/coach_broadcasts?select=id,coach_id,message_type,body,storage_path&limit=1'
)

await checkRestTable(
  'client_messages.broadcast_id column',
  '/rest/v1/client_messages?select=broadcast_id&limit=1'
)

// Migration 0067 — team forum
await checkRestTable(
  'team_forum_posts table',
  '/rest/v1/team_forum_posts?select=id,team_id,author_id,body,pinned&limit=1'
)

await checkRestTable(
  'team_forum_replies table',
  '/rest/v1/team_forum_replies?select=id,post_id,author_id,body&limit=1'
)

// Migration 0068 — realtime messaging (publication; not verifiable via REST)

// Migration 0069 — onboarding automation
await checkRestTable(
  'profiles onboarding automation columns',
  '/rest/v1/profiles?select=default_onboarding_program_id,onboarding_welcome_template_id&limit=1'
)

await checkRestTable(
  'clients onboarding automation columns',
  '/rest/v1/clients?select=invite_accepted_at,onboarding_automation_at&limit=1'
)

// Migration 0070 — exercise demo videos
await checkRestTable(
  'exercises.demo_video_path column',
  '/rest/v1/exercises?select=demo_video_path&limit=1'
)

await check('exercise-demos storage bucket', async () => {
  const res = await fetch(
    `${url}/storage/v1/object/public/exercise-demos/.schema-check`,
    { headers: { apikey: key } }
  )
  const body = await res.text()
  if (body.includes('Bucket not found')) {
    throw new Error('Bucket not found')
  }
  if (!body.includes('Object not found') && !res.ok && res.status !== 400) {
    throw new Error(body || `HTTP ${res.status}`)
  }
})

// Migration 0071 — web push subscriptions
await checkRestTable(
  'push_subscriptions table',
  '/rest/v1/push_subscriptions?select=id,user_id,endpoint,p256dh,auth&limit=1'
)

// Migration 0072 — coaching session booking
await checkRestTable(
  'profiles session booking columns',
  '/rest/v1/profiles?select=session_booking_enabled,default_session_duration_minutes,booking_buffer_minutes,booking_requires_session_pack&limit=1'
)

await checkRestTable(
  'coach_availability_rules table',
  '/rest/v1/coach_availability_rules?select=id,coach_id,day_of_week,start_time,end_time&limit=1'
)

await checkRestTable(
  'coach_availability_exceptions table',
  '/rest/v1/coach_availability_exceptions?select=id,coach_id,exception_date,exception_type&limit=1'
)

await checkRestTable(
  'client_session_packs table',
  '/rest/v1/client_session_packs?select=id,client_id,coach_id,label,total_sessions,sessions_used&limit=1'
)

await checkRestTable(
  'coaching_appointments table',
  '/rest/v1/coaching_appointments?select=id,coach_id,client_id,starts_at,ends_at,status,booked_by&limit=1'
)

// Migration 0073 — appointment reminders
await checkRestTable(
  'profiles appointment reminder columns',
  '/rest/v1/profiles?select=notify_appointment_reminders,appointment_reminder_hours&limit=1'
)

await checkRestTable(
  'coaching_appointment_reminders table',
  '/rest/v1/coaching_appointment_reminders?select=appointment_id,recipient,sent_at&limit=1'
)

// Migration 0074 — scheduling improvements
await checkRestTable(
  'client_session_packs.price_cents column',
  '/rest/v1/client_session_packs?select=price_cents&limit=1'
)

await checkRestTable(
  'coaching_appointments session notes columns',
  '/rest/v1/coaching_appointments?select=pre_session_notes,post_session_notes,rescheduled_to_id&limit=1'
)

let failed = false
for (const { name, ok, detail } of checks) {
  if (ok) {
    console.log(`OK   ${name}`)
  } else {
    failed = true
    console.error(`FAIL ${name}`)
    if (detail) console.error(`     ${detail}`)
  }
}

if (failed) {
  console.error('\nSchema is incomplete. Fix options:')
  console.error('  1. Preferred — Supabase CLI (applies migrations 0001–0074 in order):')
  console.error('       npx supabase login && yarn db:link && yarn db:push')
  console.error('  2. Supabase Dashboard → SQL → run feature scripts as needed:')
  console.error('       supabase/apply-exercise-prs.sql              (0017 load / PRs)')
  console.error('       supabase/apply-client-inbody-scans.sql       (0019 InBody scans)')
  console.error('       supabase/apply-exercise-load-prescription.sql (0024 %1RM / RPE)')
  console.error('       supabase/apply-client-coaching-type.sql      (0025 coaching type)')
  console.error('       supabase/apply-program-phases.sql            (0026 program phases)')
  console.error('       supabase/apply-client-messages.sql           (0027 messaging)')
  console.error('       supabase/apply-coach-self-client.sql         (0028 My Workouts)')
  console.error('       supabase/apply-team-client-portal.sql        (0029 client team portal)')
  console.error('       supabase/apply-gyms.sql                      (0030 gyms)')
  console.error('       supabase/apply-gym-create-fix.sql            (0031 gym create RLS)')
  console.error('       supabase/apply-multi-gym.sql                   (0032 multi-gym membership)')
  console.error('       supabase/apply-gym-peer-profiles.sql           (0033 gym peer profiles)')
  console.error('       supabase/apply-coach-preferences.sql         (0034 coach preferences)')
  console.error('       supabase/apply-notification-preferences.sql  (0035 notification preferences)')
  console.error('       supabase/apply-client-goals.sql            (0038 client goals)')
  console.error('       supabase/apply-client-goals-v2.sql         (0039 goal types)')
  console.error('       supabase/apply-client-daily-attendance.sql (0040 daily attendance)')
  console.error('       supabase/apply-team-gym.sql                   (0041 team gym sharing)')
  console.error('       supabase/apply-attendance-enhancements.sql   (0042 attendance enhancements)')
  console.error('       supabase/apply-leaderboard-opt-out.sql        (0043 leaderboard opt-out)')
  console.error('       supabase/apply-portal-leaderboards.sql         (0044 portal leaderboards)')
  console.error('       supabase/apply-client-biological-sex.sql       (0045 biological sex)')
  console.error('       supabase/apply-portal-leaderboard-bodyweight.sql (0046 leaderboard bodyweight)')
  console.error('       supabase/apply-team-powerlifting-exercises.sql (0047 team lift mapping)')
  console.error('       supabase/apply-client-form-reviews.sql         (0048 form reviews)')
  console.error('       supabase/apply-client-form-review-workout-context.sql (0049 workout context)')
  console.error('       supabase/apply-form-review-images.sql          (0050 form review images)')
  console.error('       supabase/apply-client-wearables.sql            (0051 wearables)')
  console.error('       supabase/apply-client-wearable-secrets.sql     (0052 wearable OAuth tokens)')
  console.error('       supabase/apply-notify-form-reviews.sql         (0053 form review notifications)')
  console.error('       supabase/apply-form-review-annotations.sql     (0054 form review annotations)')
  console.error('       supabase/apply-scheduled-exercise-client-notes.sql (0055 exercise client notes)')
  console.error('       supabase/apply-progressive-overload.sql        (0056 progressive overload)')
  console.error('       supabase/apply-notify-prs.sql                  (0057 PR notifications)')
  console.error('       supabase/apply-team-challenges.sql             (0058 team challenges)')
  console.error('       supabase/apply-portal-coach-display-name.sql   (0059 portal coach name)')
  console.error('       supabase/apply-portal-program-progress.sql     (0060 portal program progress)')
  console.error('       supabase/apply-portal-notification-preferences.sql (0061 portal notification prefs)')
  console.error('       supabase/apply-progressive-overload-decisions-delete.sql (0062 overload undo)')
  console.error('       supabase/apply-client-email-nudges.sql       (0063 client email nudges)')
  console.error('       supabase/apply-coach-message-templates.sql   (0064 message templates)')
  console.error('       supabase/apply-onboarding-automation.sql     (0069 onboarding automation)')
  console.error('       supabase/apply-exercise-demo-videos.sql      (0070 exercise demo videos)')
  console.error('       supabase/apply-web-push-subscriptions.sql    (0071 web push)')
  console.error('       supabase/apply-coaching-session-booking.sql  (0072 session booking)')
  console.error('       supabase/apply-appointment-reminders.sql     (0073 appointment reminders)')
  console.error('       supabase/apply-scheduling-improvements.sql   (0074 scheduling improvements)')
  console.error('     Migrations 0065–0068 (message media, broadcasts, forum, realtime) — use yarn db:push.')
  console.error('     Teams (0020–0022) have no apply scripts — use yarn db:push.')
  console.error('     Earlier scripts: apply-client-calendar.sql through apply-client-progress-photos.sql')
  console.error('     Do NOT use apply-remote.sql — it is deprecated and incomplete.')
  process.exit(1)
}

console.log(
  '\nSchema looks good — migrations through 0074 (portal notifications, email nudges, message templates, voice/broadcast messaging, team forum, onboarding automation, exercise demos, web push, session scheduling, appointment reminders).'
)
console.log('Note: RLS policies (0014 client portal write access) cannot be verified via REST.')
console.log('      If clients cannot start/complete workouts, run supabase/apply-client-portal.sql.')
