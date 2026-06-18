/**
 * Verify Supabase has avatar storage and key client columns.
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
  console.error('  1. Supabase Dashboard → SQL → run:')
  console.error('       supabase/apply-programs.sql  (programs tab)')
  console.error('       supabase/apply-library.sql   (exercises + workouts tabs)')
  console.error('       supabase/apply-workout-logging.sql (workout logging)')
  console.error('       supabase/apply-program-calendar.sql (program calendar)')
  console.error('     Or run the full supabase/apply-remote.sql')
  console.error('  2. CLI: npx supabase login && yarn db:link && yarn db:push')
  process.exit(1)
}

console.log('\nSchema looks good — library, program calendar, and avatars should work.')
