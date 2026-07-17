import loadEnvLocal from './load-env-local.mjs'
import { getGoogleCalendarEvent } from '../lib/google-calendar/api'
import { fetchCoachGoogleCalendarConnection } from '../lib/google-calendar/connection'
import { getValidGoogleCalendarAccessToken } from '../lib/google-calendar/token-store'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function main() {
  const admin = createAdminClient()
  const coachId = 'd18ca141-c03e-4477-857b-4ce509a4f695'
  const connection = await fetchCoachGoogleCalendarConnection(admin!, coachId)
  const token = await getValidGoogleCalendarAccessToken(connection!.id)

  const { data: appts } = await admin!
    .from('coaching_appointments')
    .select('starts_at, google_calendar_event_id, client:clients(full_name)')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .gte('starts_at', '2026-07-06T00:00:00.000Z')
    .lt('starts_at', '2026-07-13T00:00:00.000Z')
    .order('starts_at')

  for (const appt of appts ?? []) {
    const eventId = appt.google_calendar_event_id
    let status = 'no-id'
    if (eventId) {
      const event = await getGoogleCalendarEvent(token, connection!.calendar_id, eventId)
      status = event?.status ?? 'missing'
    }
    console.log(
      appt.client?.full_name,
      appt.starts_at,
      eventId?.slice(0, 12),
      status
    )
  }
}

main().catch(console.error)
