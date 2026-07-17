import loadEnvLocal from './load-env-local.mjs'
import { getGoogleCalendarEvent } from '../lib/google-calendar/api'
import { fetchCoachGoogleCalendarConnection } from '../lib/google-calendar/connection'
import { getValidGoogleCalendarAccessToken } from '../lib/google-calendar/token-store'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function main() {
  const admin = createAdminClient()!
  const coachId = 'd18ca141-c03e-4477-857b-4ce509a4f695'
  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  const token = connection
    ? await getValidGoogleCalendarAccessToken(connection.id)
    : null

  const { data: clients } = await admin
    .from('clients')
    .select('id, full_name')
    .or('full_name.ilike.%Sharpsteen%,full_name.ilike.%McIntosh%')

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) {
    console.log('No matching clients found')
    return
  }

  const { data: appts } = await admin
    .from('coaching_appointments')
    .select(
      'id, starts_at, series_id, google_calendar_event_id, status, client:clients(full_name)'
    )
    .eq('coach_id', coachId)
    .in('client_id', clientIds)
    .eq('status', 'scheduled')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(20)

  for (const appt of appts ?? []) {
    let googleStatus = 'no-id'
    if (appt.google_calendar_event_id && token && connection) {
      const event = await getGoogleCalendarEvent(
        token,
        connection.calendar_id,
        appt.google_calendar_event_id
      )
      googleStatus = event?.status ?? 'missing'
    }
    console.log(
      appt.client?.full_name,
      appt.starts_at,
      appt.series_id ? 'series' : 'solo',
      googleStatus
    )
  }

  const { count: soloSynced } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .is('series_id', null)
    .not('google_calendar_event_id', 'is', null)

  const { count: soloUnsynced } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .is('series_id', null)
    .is('google_calendar_event_id', null)

  console.log(
    JSON.stringify({ soloSynced, soloUnsynced, clients }, null, 2)
  )
}

main().catch(console.error)
