import type { SupabaseClient } from '@supabase/supabase-js'

import {
  listGoogleCalendarEventsInRange,
} from '@/lib/google-calendar/api'
import {
  applyGoogleEventMarkers,
  filterGoogleCalendarBlockedTimes,
  CALENDAR_OCCUPYING_APPOINTMENT_STATUSES,
  type GoogleCalendarBlockedTime,
} from '@/lib/google-calendar/blocked-times-filter'
import { fetchCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import { fetchCoachGoogleEventMarkers } from '@/lib/google-calendar/event-markers'
import { getValidGoogleCalendarAccessToken } from '@/lib/google-calendar/token-store'
import { createAdminClient } from '@/lib/supabase/admin'

export type { GoogleCalendarBlockedTime } from '@/lib/google-calendar/blocked-times-filter'

export async function fetchGoogleCalendarBlockedTimes(
  coachId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarBlockedTime[]> {
  const admin = createAdminClient()
  if (!admin) return []

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection) return []

  try {
    const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
    const [events, appointmentsResult] = await Promise.all([
      listGoogleCalendarEventsInRange(
        accessToken,
        connection.calendar_id,
        timeMin,
        timeMax
      ),
      admin
        .from('coaching_appointments')
        .select('starts_at, ends_at, google_calendar_event_id')
        .eq('coach_id', coachId)
        .in('status', [...CALENDAR_OCCUPYING_APPOINTMENT_STATUSES])
        .lt('starts_at', timeMax)
        .gt('ends_at', timeMin),
    ])

    if (appointmentsResult.error) {
      throw new Error(appointmentsResult.error.message)
    }

    return filterGoogleCalendarBlockedTimes(
      events,
      appointmentsResult.data ?? []
    )
  } catch (error) {
    console.error('[google-calendar] blocked times fetch failed', error)
    return []
  }
}

export async function attachGoogleEventMarkers(
  supabase: SupabaseClient,
  coachId: string,
  blockedTimes: GoogleCalendarBlockedTime[]
): Promise<GoogleCalendarBlockedTime[]> {
  if (blockedTimes.length === 0) {
    return blockedTimes
  }

  const markers = await fetchCoachGoogleEventMarkers(
    supabase,
    coachId,
    blockedTimes.map((blockedTime) => blockedTime.id)
  )

  return applyGoogleEventMarkers(blockedTimes, markers)
}
