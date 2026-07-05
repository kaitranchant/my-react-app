import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarBusyIntervals,
  getGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from '@/lib/google-calendar/api'
import {
  fetchCoachGoogleCalendarConnection,
  type CoachGoogleCalendarConnection,
} from '@/lib/google-calendar/connection'
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

async function persistGoogleEventMetadata(
  appointmentId: string,
  values: {
    google_calendar_event_id?: string | null
    google_calendar_updated_at: string
  }
) {
  const admin = createAdminClient()
  if (!admin) return

  await admin
    .from('coaching_appointments')
    .update(values)
    .eq('id', appointmentId)
}

export async function syncCoachingAppointmentToGoogle(
  appointmentId: string
): Promise<void> {
  try {
    const appointment = await fetchAppointmentForSync(appointmentId)
    if (!appointment || appointment.status !== 'scheduled') return

    const connection = await getExportConnection(appointment.coach_id)
    if (!connection) return

    const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
    const payload = buildEventPayload(appointment)

    if (appointment.google_calendar_event_id) {
      const existingEvent = await getGoogleCalendarEvent(
        accessToken,
        connection.calendar_id,
        appointment.google_calendar_event_id
      )

      if (existingEvent) {
        const result = await updateGoogleCalendarEvent(
          accessToken,
          connection.calendar_id,
          appointment.google_calendar_event_id,
          payload
        )
        await persistGoogleEventMetadata(appointment.id, {
          google_calendar_updated_at: result.updated,
        })
        return
      }

      await persistGoogleEventMetadata(appointment.id, {
        google_calendar_event_id: null,
        google_calendar_updated_at: new Date().toISOString(),
      })
    }

    const result = await createGoogleCalendarEvent(
      accessToken,
      connection.calendar_id,
      payload
    )

    await persistGoogleEventMetadata(appointment.id, {
      google_calendar_event_id: result.id,
      google_calendar_updated_at: result.updated,
    })
  } catch (error) {
    console.error('[google-calendar] sync appointment failed', error)
  }
}

export async function removeCoachingAppointmentFromGoogle(input: {
  coachId: string
  googleCalendarEventId: string | null
}): Promise<void> {
  if (!input.googleCalendarEventId) return

  try {
    const connection = await getExportConnection(input.coachId)
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
