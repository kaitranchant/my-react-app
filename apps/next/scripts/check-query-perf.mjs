/**
 * Verify migration 0083 query optimizations and capture a usage-monitoring baseline.
 * Run: yarn check:query-perf
 *
 * Dashboard metrics (Query Performance, Advisors, Usage graphs) must still be
 * reviewed manually in Supabase Dashboard — this script verifies RPCs, indexes,
 * and inbox count parity for the optimized code paths.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const baselinePath = resolve(repoRoot, 'docs/supabase-usage-baseline.json')

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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const nil = '00000000-0000-0000-0000-000000000000'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/next/.env.local'
  )
  process.exit(1)
}

const serviceHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
}

const checks = []

async function check(name, fn) {
  const started = performance.now()
  try {
    const detail = await fn()
    const ms = Math.round(performance.now() - started)
    checks.push({ name, ok: true, ms, detail })
    console.log(`OK   ${name}${detail ? ` — ${detail}` : ''} (${ms}ms)`)
  } catch (error) {
    const ms = Math.round(performance.now() - started)
    const detail = error instanceof Error ? error.message : String(error)
    checks.push({ name, ok: false, ms, detail })
    console.error(`FAIL ${name} (${ms}ms)`)
    console.error(`     ${detail}`)
  }
}

async function rpc(name, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return text ? JSON.parse(text) : null
}

async function restGet(path) {
  const res = await fetch(`${url}${path}`, { headers: serviceHeaders })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return text ? JSON.parse(text) : null
}

console.log('=== Migration 0083 — RPC verification ===\n')

const rpcChecks = [
  ['count_coach_unread_messages', { p_coach_id: nil }],
  ['get_coach_unread_by_client', { p_coach_id: nil }],
  ['get_coach_latest_messages', { p_coach_id: nil }],
  ['get_client_unread_from_coach', { p_client_ids: [nil] }],
  ['get_client_latest_coach_messages', { p_client_ids: [nil] }],
]

for (const [name, body] of rpcChecks) {
  await check(`RPC ${name}`, async () => {
    await rpc(name, body)
    return 'responds'
  })
}

console.log('\n=== Migration 0083 — index proxy queries ===\n')

const indexProxies = [
  [
    'client_messages_coach_id_created_at_idx',
    `/rest/v1/client_messages?select=id&coach_id=eq.${nil}&order=created_at.desc&limit=1`,
  ],
  [
    'client_scheduled_workouts_client_date_status_idx',
    `/rest/v1/client_scheduled_workouts?select=id&client_id=eq.${nil}&scheduled_date=gte.2020-01-01&status=eq.completed&limit=1`,
  ],
  [
    'client_form_reviews_coach_pending_idx',
    `/rest/v1/client_form_reviews?select=id&coach_id=eq.${nil}&reviewed_at=is.null&limit=1`,
  ],
]

for (const [name, path] of indexProxies) {
  await check(`index query ${name}`, async () => {
    await restGet(path)
    return 'query shape OK'
  })
}

console.log('\n=== Optimized path smoke — inbox count parity ===\n')

let coachId = null
let coachEmail = process.env.E2E_COACH_EMAIL ?? 'e2e-coach@coaching-app.test'

await check('resolve E2E coach profile', async () => {
  const users = await restGet(
    `/auth/v1/admin/users?email=${encodeURIComponent(coachEmail)}`
  )
  const user = users?.users?.[0]
  if (!user?.id) {
    throw new Error(`No auth user for ${coachEmail}`)
  }
  coachId = user.id
  return coachEmail
})

let inboxSmoke = null

if (coachId) {
  await check('inbox badge RPC vs per-client unread sum', async () => {
    const [totalUnread, byClient, latestMessages] = await Promise.all([
      rpc('count_coach_unread_messages', { p_coach_id: coachId }),
      rpc('get_coach_unread_by_client', { p_coach_id: coachId }),
      rpc('get_coach_latest_messages', { p_coach_id: coachId }),
    ])

    const rows = Array.isArray(byClient) ? byClient : []
    const sumByClient = rows.reduce(
      (sum, row) => sum + Number(row.unread_count ?? 0),
      0
    )
    const total = Number(totalUnread ?? 0)
    const latestCount = Array.isArray(latestMessages) ? latestMessages.length : 0

    inboxSmoke = { total, sumByClient, latestCount, clientRows: rows.length }

    if (total !== sumByClient) {
      throw new Error(
        `count_coach_unread_messages=${total} but sum(get_coach_unread_by_client)=${sumByClient}`
      )
    }

    return `total unread=${total}, clients with previews=${latestCount}`
  })

  await check('batched load query shapes (workouts + check-ins)', async () => {
    let probeCoachId = coachId
    let clients = await restGet(
      `/rest/v1/clients?select=id&coach_id=eq.${probeCoachId}&status=eq.active&limit=5`
    )

    if (!clients?.length) {
      const anyCoach = await restGet(
        `/rest/v1/clients?select=coach_id&status=eq.active&limit=1`
      )
      probeCoachId = anyCoach?.[0]?.coach_id ?? null
      if (probeCoachId) {
        clients = await restGet(
          `/rest/v1/clients?select=id&coach_id=eq.${probeCoachId}&status=eq.active&limit=5`
        )
      }
    }

    const clientIds = (clients ?? []).map((c) => c.id)
    if (clientIds.length === 0) {
      return 'no active clients in project (skipped batch probe)'
    }

    const inList = clientIds.join(',')
    const today = new Date().toISOString().slice(0, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 56)
    const startKey = startDate.toISOString().slice(0, 10)

    await Promise.all([
      restGet(
        `/rest/v1/client_scheduled_workouts?select=id,client_id,scheduled_date,status&client_id=in.(${inList})&scheduled_date=gte.${startKey}&limit=100`
      ),
      restGet(
        `/rest/v1/client_check_ins?select=client_id,check_in_date&client_id=in.(${inList})&order=check_in_date.desc&limit=50`
      ),
      restGet(
        `/rest/v1/client_form_reviews?select=id&coach_id=eq.${probeCoachId}&reviewed_at=is.null&limit=1`
      ),
    ])

    return `${clientIds.length} clients — bulk workout/check-in/form-review queries OK`
  })
}

const failed = checks.some((c) => !c.ok)
const snapshot = {
  capturedAt: new Date().toISOString(),
  projectUrl: url,
  coachEmail,
  coachId,
  inboxSmoke,
  checks: checks.map(({ name, ok, ms, detail }) => ({ name, ok, ms, detail })),
  manualDashboardSteps: [
    'Reports → Database / Query Performance: compare top queries (calls, total time) vs pre-deploy',
    'Database → Advisors: re-run and note slow-query warnings',
    'Project Settings → Usage: watch Database compute, Egress, Realtime, Auth over 24–48h',
    'Supabase AI Assistant: ask which queries consumed the most time in the last 24h',
  ],
}

let previous = null
try {
  mkdirSync(dirname(baselinePath), { recursive: true })
  if (existsSync(baselinePath)) {
    previous = JSON.parse(readFileSync(baselinePath, 'utf8'))
  }
  writeFileSync(
    baselinePath,
    JSON.stringify({ current: snapshot, previous: previous?.current ?? null }, null, 2) + '\n'
  )
  console.log(`\nBaseline written to docs/supabase-usage-baseline.json`)
} catch (error) {
  console.warn(
    `Could not write baseline file: ${error instanceof Error ? error.message : error}`
  )
}

console.log('\n=== Manual dashboard follow-up (required) ===\n')
for (const step of snapshot.manualDashboardSteps) {
  console.log(`  • ${step}`)
}

const prior = previous?.current ?? null
if (prior?.capturedAt) {
  console.log(
    `\nPrevious baseline: ${prior.capturedAt} — comparing check latencies:`
  )
  const prevByName = new Map(
    (prior.checks ?? []).map((c) => [c.name, c.ms])
  )
  for (const check of checks) {
    const prevMs = prevByName.get(check.name)
    if (prevMs != null && check.ms != null) {
      const delta = check.ms - prevMs
      const sign = delta >= 0 ? '+' : ''
      console.log(`  ${check.name}: ${prevMs}ms → ${check.ms}ms (${sign}${delta}ms)`)
    }
  }
}

console.log('\n=== 48h follow-up ===')
console.log('  Re-run: yarn check:query-perf')
console.log('  Dashboard: Project Settings → Usage (compute, egress, realtime, auth)')
console.log('  If warning persists: capture top 5 queries from Query Performance and share for Phase 5')

console.log('\n=== Summary ===')
if (failed) {
  console.error(
    'INCOMPLETE: Fix failing checks above before trusting query optimizations.'
  )
  process.exit(1)
}

console.log(
  'All 0083 RPCs and index proxies verified. Inbox count parity OK. Re-check Usage in Supabase Dashboard after 24–48h.'
)
