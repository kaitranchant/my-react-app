import loadEnvLocal from './load-env-local.mjs'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function main() {
  const admin = createAdminClient()
  const coachId = 'd18ca141-c03e-4477-857b-4ce509a4f695'
  const weekStart = '2026-07-06T00:00:00.000Z'
  const weekEnd = '2026-07-13T00:00:00.000Z'

  const { data: scheduled } = await admin
    .from('coaching_appointments')
    .select('id, starts_at, status, cancellation_reason, series_id, google_calendar_event_id, client:clients(full_name)')
    .eq('coach_id', coachId)
    .gte('starts_at', weekStart)
    .lt('starts_at', weekEnd)
    .order('starts_at')

  const byStatus = Object.groupBy(scheduled ?? [], (a) => a.status)

  console.log('=== BY STATUS ===')
  for (const [status, rows] of Object.entries(byStatus)) {
    console.log(status, rows?.length)
  }

  console.log('\n=== CANCELLED THIS WEEK ===')
  console.log(JSON.stringify(
    (scheduled ?? []).filter((a) => a.status === 'cancelled'),
    null,
    2
  ))

  console.log('\n=== SCHEDULED THIS WEEK ===')
  console.log(JSON.stringify(
    (scheduled ?? []).filter((a) => a.status === 'scheduled'),
    null,
    2
  ))

  const { count: deletedCount } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .gte('starts_at', weekStart)
    .lt('starts_at', weekEnd)

  const { data: recentCancelled } = await admin
    .from('coaching_appointments')
    .select('id, starts_at, status, cancelled_at, cancellation_reason, client:clients(full_name)')
    .eq('coach_id', coachId)
    .eq('status', 'cancelled')
    .gte('cancelled_at', '2026-07-06T00:00:00.000Z')
    .order('cancelled_at', { ascending: false })
    .limit(30)

  console.log('\n=== CANCELLED SINCE JULY 6 ===')
  console.log(JSON.stringify(recentCancelled, null, 2))
}

main().catch(console.error)
