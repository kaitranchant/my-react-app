import type { SupabaseClient } from '@supabase/supabase-js'

import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarBusyIntervals,
  getGoogleCalendarEvent,
  getGoogleCalendarEventTimes,
  listGoogleCalendarEventsInRange,
  updateGoogleCalendarEvent,
} from '@/lib/google-calendar/api'
import { isExportedCoachingCalendarSummary } from '@/lib/google-calendar/coaching-event-summary'
import {
  fetchCoachGoogleCalendarConnection,
  type CoachGoogleCalendarConnection,
} from '@/lib/google-calendar/connection'
import { intervalsOverlap } from '@/lib/google-calendar/event-linking'
import { getValidGoogleCalendarAccessToken } from '@/lib/google-calendar/token-store'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCoachingSessionType } from '@/lib/coaching-session-types'
import type { CoachingAppointment } from '@/lib/session-booking-types'
import type { CoachingSessionType } from 'app/types/database'

type AppointmentSyncRow = {
  id: string
  coach_id: string
  client_id: string
  starts_at: string
  ends_at: string
  status: CoachingAppointment['status']
  location: string | null
  pre_session_notes: string | null
  notes: string | null
  google_calendar_event_id: string | null
  google_calendar_updated_at: string | null
  session_type: CoachingSessionType
  client: { full_name: string | null; email: string | null } | null
}

async function fetchAppointmentForSync(
  appointmentId: string
): Promise<AppointmentSyncRow | null> {
  const admin = createAdminClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('coaching_appointments')
    .select(
      `
      id,
      coach_id,
      client_id,
      starts_at,
      ends_at,
      status,
      location,
      pre_session_notes,
      notes,
      session_type,
      google_calendar_event_id,
      google_calendar_updated_at,
      client:clients(full_name, email)
    `
    )
    .eq('id', appointmentId)
    .maybeSingle()

  if (error || !data) return null

  const client = Array.isArray(data.client) ? data.client[0] : data.client

  return {
    ...data,
    client: client ?? null,
  } as AppointmentSyncRow
}

function buildEventPayload(appointment: AppointmentSyncRow) {
  const clientName = appointment.client?.full_name?.trim() || 'Client'
  const notes = appointment.pre_session_notes ?? appointment.notes
  const sessionLabel =
    formatCoachingSessionType(appointment.session_type) ?? 'Session'

  return {
    summary: `${sessionLabel} — ${clientName}`,
    description: notes?.trim() ? notes.trim() : undefined,
    location: appointment.location,
    startsAt: appointment.starts_at,
    endsAt: appointment.ends_at,
  }
}

async function getExportConnection(
  coachId: string
): Promise<CoachGoogleCalendarConnection | null> {
  const admin = createAdminClient()
  if (!admin) return null

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_export_enabled) return null
  return connection
}

async function getConnectedCalendar(
  coachId: string
): Promise<CoachGoogleCalendarConnection | null> {
  const admin = createAdminClient()
  if (!admin) return null
  return fetchCoachGoogleCalendarConnection(admin, coachId)
}

async function persistGoogleEventMetadata(
  appointmentId: string,
  values: {
    google_calendar_event_id?: string | null
    google_calendar_updated_at: string
  }
) {
  const admin = createAdminClient()
  if (!admin) {
    console.error(
      '[google-calendar] cannot persist event metadata — service role unavailable'
    )
    return
  }

  const { error } = await admin
    .from('coaching_appointments')
    .update(values)
    .eq('id', appointmentId)

  if (error) {
    console.error('[google-calendar] persist event metadata failed', error)
  }
}

function isGoogleCalendarAuthError(error: unknown) {
  return (
    error instanceof Error &&
    /\((401|403)\)/.test(error.message)
  )
}

async function withGoogleCalendarAccessToken<T>(
  connectionId: string,
  callback: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    return await callback(await getValidGoogleCalendarAccessToken(connectionId))
  } catch (error) {
    if (!isGoogleCalendarAuthError(error)) {
      throw error
    }

    return await callback(
      await getValidGoogleCalendarAccessToken(connectionId, {
        forceRefresh: true,
      })
    )
  }
}

export type CoachingAppointmentGoogleSyncResult = {
  ok: boolean
  googleEventId: string | null
  googleCalendarUpdatedAt: string | null
}

const emptyGoogleSyncResult: CoachingAppointmentGoogleSyncResult = {
  ok: true,
  googleEventId: null,
  googleCalendarUpdatedAt: null,
}

export async function applyGoogleCalendarLinkToAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
  link: { googleEventId: string; googleCalendarUpdatedAt: string }
): Promise<void> {
  const { error } = await supabase
    .from('coaching_appointments')
    .update({
      google_calendar_event_id: link.googleEventId,
      google_calendar_updated_at: link.googleCalendarUpdatedAt,
    })
    .eq('id', appointmentId)

  if (error) {
    console.error('[google-calendar] coach persist event link failed', error)
  }
}

export async function syncCoachingAppointmentToGoogle(
  appointmentId: string
): Promise<CoachingAppointmentGoogleSyncResult> {
  try {
    const appointment = await fetchAppointmentForSync(appointmentId)
    if (!appointment || appointment.status !== 'scheduled') {
      return emptyGoogleSyncResult
    }

    const connection = await getExportConnection(appointment.coach_id)
    if (!connection) {
      return emptyGoogleSyncResult
    }

    const payload = buildEventPayload(appointment)

    if (appointment.google_calendar_event_id) {
      const existingEvent = await withGoogleCalendarAccessToken(
        connection.id,
        (accessToken) =>
          getGoogleCalendarEvent(
            accessToken,
            connection.calendar_id,
            appointment.google_calendar_event_id!
          )
      )

      if (existingEvent && existingEvent.status !== 'cancelled') {
        const result = await withGoogleCalendarAccessToken(
          connection.id,
          (accessToken) =>
            updateGoogleCalendarEvent(
              accessToken,
              connection.calendar_id,
              appointment.google_calendar_event_id!,
              payload
            )
        )
        await persistGoogleEventMetadata(appointment.id, {
          google_calendar_updated_at: result.updated,
        })
        return {
          ok: true,
          googleEventId: appointment.google_calendar_event_id,
          googleCalendarUpdatedAt: result.updated,
        }
      }

      await persistGoogleEventMetadata(appointment.id, {
        google_calendar_event_id: null,
        google_calendar_updated_at: new Date().toISOString(),
      })
    }

    const result = await withGoogleCalendarAccessToken(connection.id, (accessToken) =>
      createGoogleCalendarEvent(accessToken, connection.calendar_id, payload)
    )

    await persistGoogleEventMetadata(appointment.id, {
      google_calendar_event_id: result.id,
      google_calendar_updated_at: result.updated,
    })
    return {
      ok: true,
      googleEventId: result.id,
      googleCalendarUpdatedAt: result.updated,
    }
  } catch (error) {
    console.error('[google-calendar] sync appointment failed', error)
    return {
      ok: false,
      googleEventId: null,
      googleCalendarUpdatedAt: null,
    }
  }
}

export async function removeCoachingAppointmentFromGoogle(input: {
  coachId: string
  googleCalendarEventId: string | null
}): Promise<void> {
  if (!input.googleCalendarEventId) return

  try {
    // Deleting must work even if export sync was later turned off; otherwise
    // stopped series leave orphan "Google Calendar busy" blocks on the schedule.
    const connection = await getConnectedCalendar(input.coachId)
    if (!connection) return

    const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
    await deleteGoogleCalendarEvent(
      accessToken,
      connection.calendar_id,
      input.googleCalendarEventId
    )
  } catch (error) {
    console.error('[google-calendar] delete appointment event failed', error)
  }
}

export async function removeCoachingAppointmentsFromGoogle(input: {
  coachId: string
  googleCalendarEventIds: Array<string | null | undefined>
}): Promise<void> {
  const uniqueIds = Array.from(
    new Set(
      input.googleCalendarEventIds.filter(
        (eventId): eventId is string => Boolean(eventId)
      )
    )
  )

  if (uniqueIds.length === 0) return

  await Promise.all(
    uniqueIds.map((googleCalendarEventId) =>
      removeCoachingAppointmentFromGoogle({
        coachId: input.coachId,
        googleCalendarEventId,
      })
    )
  )
}

/**
 * Delete exported coaching Google events for a client that no longer have a
 * matching scheduled appointment. Safe when the client still has other series.
 */
export async function purgeOrphanExportedGoogleEventsForClient(input: {
  coachId: string
  clientId: string
  clientName: string
  timeMin?: string
  timeMax?: string
}): Promise<number> {
  const admin = createAdminClient()
  if (!admin) return 0

  const clientName = input.clientName.trim().toLowerCase()
  if (!clientName) return 0

  const connection = await getConnectedCalendar(input.coachId)
  if (!connection) return 0

  const timeMin = input.timeMin ?? new Date().toISOString()
  const timeMax =
    input.timeMax ??
    new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString()

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
        .eq('coach_id', input.coachId)
        .eq('client_id', input.clientId)
        .eq('status', 'scheduled')
        .lt('starts_at', timeMax)
        .gt('ends_at', timeMin),
    ])

    if (appointmentsResult.error) {
      throw new Error(appointmentsResult.error.message)
    }

    const remaining = appointmentsResult.data ?? []
    const linkedIds = new Set(
      remaining
        .map((row) => row.google_calendar_event_id)
        .filter((id): id is string => Boolean(id))
    )

    let removed = 0
    for (const event of events) {
      if (!event.id || event.status === 'cancelled') continue
      if (!isExportedCoachingCalendarSummary(event.summary)) continue
      if (!event.summary?.toLowerCase().includes(clientName)) continue
      if (linkedIds.has(event.id)) continue

      const times = getGoogleCalendarEventTimes(event)
      if (!times) continue

      const stillBooked = remaining.some((appointment) =>
        intervalsOverlap(
          times.startsAt,
          times.endsAt,
          appointment.starts_at,
          appointment.ends_at
        )
      )
      if (stillBooked) continue

      await deleteGoogleCalendarEvent(
        accessToken,
        connection.calendar_id,
        event.id
      )
      removed += 1
    }

    return removed
  } catch (error) {
    console.error(
      '[google-calendar] purge orphan client events failed',
      error
    )
    return 0
  }
}

export async function fetchGoogleBusyAppointments(
  coachId: string,
  timeMin: string,
  timeMax: string
): Promise<CoachingAppointment[]> {
  const admin = createAdminClient()
  if (!admin) return []

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_busy_enabled) return []

  try {
    const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
    const busy = await fetchGoogleCalendarBusyIntervals(
      accessToken,
      connection.calendar_id,
      timeMin,
      timeMax
    )

    return busy.map((interval, index) => ({
      id: `google-busy-${index}`,
      coach_id: coachId,
      client_id: '',
      starts_at: interval.startsAt,
      ends_at: interval.endsAt,
      status: 'scheduled' as const,
      location: null,
      notes: null,
      pre_session_notes: null,
      post_session_notes: null,
      coaching_type: null,
      session_type: 'coaching' as const,
      session_pack_id: null,
      booked_by: 'coach' as const,
      cancelled_at: null,
      cancellation_reason: null,
      rescheduled_to_id: null,
      series_id: null,
      created_at: interval.startsAt,
    }))
  } catch (error) {
    console.error('[google-calendar] freeBusy fetch failed', error)
    return []
  }
}

export function queueCoachingAppointmentGoogleSync(appointmentId: string) {
  void syncCoachingAppointmentToGoogle(appointmentId)
}

export function queueCoachingAppointmentGoogleRemoval(input: {
  coachId: string
  googleCalendarEventId: string | null
}) {
  void removeCoachingAppointmentFromGoogle(input)
}
