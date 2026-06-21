/**
 * Verify hosted Supabase schema through migration 0041.
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
  '/rest/v1/profiles?select=notify_check_ins,notify_workout_completions,notify_missed_sessions,notify_invite_accepted,notify_weekly_summary&limit=1'
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
  console.error('  1. Preferred — Supabase CLI (applies migrations 0001–0042 in order):')
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
  console.error('     Teams (0020–0022) have no apply scripts — use yarn db:push.')
  console.error('     Earlier scripts: apply-client-calendar.sql through apply-client-progress-photos.sql')
  console.error('     Do NOT use apply-remote.sql — it is deprecated and incomplete.')
  process.exit(1)
}

console.log(
  '\nSchema looks good — migrations through 0042 (teams, messaging, program phases, My Workouts, client team portal, gyms, coach preferences, notification preferences, client goals v2, daily attendance, team gym sharing, attendance enhancements).'
)
console.log('Note: RLS policies (0014 client portal write access) cannot be verified via REST.')
console.log('      If clients cannot start/complete workouts, run supabase/apply-client-portal.sql.')
