import loadEnvLocal from './load-env-local.mjs'
import { getGoogleCalendarEvent, listGoogleCalendarEventsInRange } from '../lib/google-calendar/api'
import { isExportedCoachingCalendarSummary } from '../lib/google-calendar/coaching-event-summary'
import { fetchCoachGoogleCalendarConnection } from '../lib/google-calendar/connection'
import { getValidGoogleCalendarAccessToken } from '../lib/google-calendar/token-store'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function main() {
  const admin = createAdminClient()!
  const coachId =
    process.env.COACH_ID?.trim() || 'd18ca141-c03e-4477-857b-4ce509a4f695'
  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection) {
    throw new Error('No Google Calendar connection')
  }

  const token = await getValidGoogleCalendarAccessToken(connection.id)
  const timeMin = new Date().toISOString()
  const timeMax = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: appointments } = await admin
    .from('coaching_appointments')
    .select('id, starts_at, google_calendar_event_id, client:clients(full_name)')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .gte('starts_at', timeMin)
    .order('starts_at')

  let missingId = 0
  let staleLink = 0
  let confirmed = 0

  for (const appt of appointments ?? []) {
    if (!appt.google_calendar_event_id) {
      missingId += 1
      continue
    }

    const event = await getGoogleCalendarEvent(
      token,
      connection.calendar_id,
      appt.google_calendar_event_id
    )

    if (!event || event.status === 'cancelled') {
      staleLink += 1
    } else {
      confirmed += 1
    }
  }

  const googleEvents = await listGoogleCalendarEventsInRange(
    token,
    connection.calendar_id,
    timeMin,
    timeMax
  )
  const coachingEvents = googleEvents.filter((event) =>
    isExportedCoachingCalendarSummary(event.summary)
  )

  console.log(
    JSON.stringify(
      {
        scheduledAppointments: appointments?.length ?? 0,
        missingGoogleId: missingId,
        staleGoogleLink: staleLink,
        confirmedGoogleLink: confirmed,
        googleCoachingStyleEvents: coachingEvents.length,
        googleTotalEvents: googleEvents.length,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
