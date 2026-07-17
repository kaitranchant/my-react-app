import loadEnvLocal from './load-env-local.mjs'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function main() {
  const admin = createAdminClient()
  const coachId = 'd18ca141-c03e-4477-857b-4ce509a4f695'

  const { count: scheduledTotal } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .not('series_id', 'is', null)

  const { count: scheduledSolo } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .is('series_id', null)

  const { count: cancelledSeries } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'cancelled')
    .not('series_id', 'is', null)
    .in('cancellation_reason', [
      'Removed from Google Calendar',
      'Cancelled in Google Calendar',
    ])

  const { data: latestScheduled } = await admin
    .from('coaching_appointments')
    .select('starts_at, client:clients(full_name)')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .not('series_id', 'is', null)
    .order('starts_at', { ascending: false })
    .limit(3)

  const { data: activeSeries } = await admin
    .from('coaching_appointment_series')
    .select('id, status, anchor_starts_at, client:clients(full_name)')
    .eq('coach_id', coachId)
    .eq('status', 'active')

  console.log(JSON.stringify({
    scheduledTotal,
    scheduledSolo,
    cancelledSeries,
    latestScheduled,
    activeSeriesCount: activeSeries?.length,
    activeSeries,
  }, null, 2))
}

main().catch(console.error)
