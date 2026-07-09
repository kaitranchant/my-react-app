import { revalidatePath } from 'next/cache'

import {
  getGoogleCalendarEvent,
  getGoogleCalendarEventTimes,
  listGoogleCalendarEventChanges,
  listGoogleCalendarEventsInRange,
  updateGoogleCalendarEvent,
  type GoogleCalendarEvent,
} from '@/lib/google-calendar/api'
import {
  fetchCoachGoogleCalendarConnection,
  fetchCoachGoogleCalendarConnectionById,
  updateCoachGoogleCalendarWatchState,
} from '@/lib/google-calendar/connection'
import { getValidGoogleCalendarAccessToken } from '@/lib/google-calendar/token-store'
import { fetchCoachSessionBookingSettings } from '@/lib/session-booking-queries'
import { createAdminClient } from '@/lib/supabase/admin'

const GOOGLE_ECHO_SKEW_MS = 2_000
const GOOGLE_DELETION_CANCELLATION_REASON = 'Deleted in Google Calendar'

type LinkedAppointment = {
  id: string
  coach_id: string
  client_id: string
  starts_at: string
  ends_at: string
  status: string
  location: string | null
  pre_session_notes: string | null
  notes: string | null
  google_calendar_event_id: string | null
  google_calendar_updated_at: string | null
  updated_at: string
  series_id: string | null
  client: { full_name: string | null; email: string | null } | null
}

export function intervalsOverlap(
  aStartIso: string,
  aEndIso: string,
  bStartIso: string,
  bEndIso: string,
  bufferMinutes: number
): boolean {
  const bufferMs = bufferMinutes * 60_000
  const aStart = new Date(aStartIso).getTime()
  const aEnd = new Date(aEndIso).getTime()
  const bStart = new Date(bStartIso).getTime() - bufferMs
  const bEnd = new Date(bEndIso).getTime() + bufferMs
  return aStart < bEnd && aEnd > bStart
}

function parseGoogleUpdatedAt(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getAppointmentLastEditMs(appointment: LinkedAppointment): number {
  return Math.max(
    Date.parse(appointment.updated_at),
    appointment.google_calendar_updated_at
      ? Date.parse(appointment.google_calendar_updated_at)
      : 0
  )
}

function shouldApplyGoogleChange(
  appointment: LinkedAppointment,
  eventUpdatedAt: string | undefined
): boolean {
  const googleMs = parseGoogleUpdatedAt(eventUpdatedAt)
  if (googleMs == null) return true

  const appointmentMs = getAppointmentLastEditMs(appointment)
  const storedGoogleMs = appointment.google_calendar_updated_at
    ? Date.parse(appointment.google_calendar_updated_at)
    : 0

  if (Math.abs(googleMs - storedGoogleMs) <= GOOGLE_ECHO_SKEW_MS) {
    return false
  }

  return googleMs >= appointmentMs
}

async function fetchLinkedAppointmentByEventId(
  coachId: string,
  eventId: string
): Promise<LinkedAppointment | null> {
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
      google_calendar_event_id,
      google_calendar_updated_at,
      updated_at,
      series_id,
      client:clients(full_name, email)
    `
    )
    .eq('coach_id', coachId)
    .eq('google_calendar_event_id', eventId)
    .maybeSingle()

  if (error || !data) return null

  const client = Array.isArray(data.client) ? data.client[0] : data.client
  return { ...data, client: client ?? null } as LinkedAppointment
}

export async function validateInboundGoogleReschedule(input: {
  coachId: string
  appointmentId: string
  googleEventId: string
  startsAt: string
  endsAt: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return { ok: false, reason: 'Calendar sync is unavailable.' }
  }

  const settings = await fetchCoachSessionBookingSettings(admin, input.coachId)
  const buffer = settings.booking_buffer_minutes

  const { data: appointments } = await admin
    .from('coaching_appointments')
    .select('id, starts_at, ends_at, status')
    .eq('coach_id', input.coachId)
    .eq('status', 'scheduled')
    .neq('id', input.appointmentId)

  for (const appointment of appointments ?? []) {
    if (
      intervalsOverlap(
        input.startsAt,
        input.endsAt,
        appointment.starts_at,
        appointment.ends_at,
        buffer
      )
    ) {
      return {
        ok: false,
        reason: 'That time conflicts with another coaching session.',
      }
    }
  }

  const connection = await fetchCoachGoogleCalendarConnection(admin, input.coachId)
  if (!connection) {
    return { ok: false, reason: 'Google Calendar is not connected.' }
  }

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
  const googleEvents = await listGoogleCalendarEventsInRange(
    accessToken,
    connection.calendar_id,
    input.startsAt,
    input.endsAt
  )

  for (const event of googleEvents) {
    if (event.id === input.googleEventId || event.status === 'cancelled') {
      continue
    }

    const times = getGoogleCalendarEventTimes(event)
    if (!times) continue

    if (
      intervalsOverlap(
        input.startsAt,
        input.endsAt,
        times.startsAt,
        times.endsAt,
        buffer
      )
    ) {
      return {
        ok: false,
        reason: 'That time conflicts with another Google Calendar event.',
      }
    }
  }

  return { ok: true }
}

async function cancelAppointmentFromGoogleDeletion(
  appointment: Pick<LinkedAppointment, 'id'>,
  googleUpdatedAt?: string
): Promise<'applied' | 'skipped'> {
  const admin = createAdminClient()
  if (!admin) return 'skipped'

  const nowIso = new Date().toISOString()

  const { data, error } = await admin
    .from('coaching_appointments')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancellation_reason: GOOGLE_DELETION_CANCELLATION_REASON,
      google_calendar_event_id: null,
      google_calendar_updated_at: googleUpdatedAt ?? nowIso,
    })
    .eq('id', appointment.id)
    .eq('status', 'scheduled')
    .select('id')

  if (error) {
    console.error('[google-calendar] cancel appointment from deletion failed', error)
    return 'skipped'
  }

  if (!data?.length) {
    return 'skipped'
  }

  revalidatePath('/scheduling')
  revalidatePath('/portal/sessions')
  return 'applied'
}

export async function reconcileGoogleDeletedAppointmentsForCoach(
  coachId: string,
  options?: { timeMin?: string; timeMax?: string }
): Promise<number> {
  const admin = createAdminClient()
  if (!admin) return 0

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection) return 0

  let accessToken: string
  try {
    accessToken = await getValidGoogleCalendarAccessToken(connection.id)
  } catch (error) {
    console.warn('[google-calendar] reconcile skipped — auth unavailable', error)
    return 0
  }

  let query = admin
    .from('coaching_appointments')
    .select('id, google_calendar_event_id')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .not('google_calendar_event_id', 'is', null)

  if (options?.timeMin) {
    query = query.gte('starts_at', options.timeMin)
  }
  if (options?.timeMax) {
    query = query.lte('starts_at', options.timeMax)
  }

  const { data: appointments, error } = await query

  if (error) {
    console.error('[google-calendar] reconcile appointment lookup failed', error)
    return 0
  }

  let cancelled = 0

  for (const appointment of appointments ?? []) {
    if (!appointment.google_calendar_event_id) continue

    const event = await getGoogleCalendarEvent(
      accessToken,
      connection.calendar_id,
      appointment.google_calendar_event_id
    )

    if (event && event.status !== 'cancelled') {
      continue
    }

    const result = await cancelAppointmentFromGoogleDeletion(
      appointment,
      event?.updated
    )
    if (result === 'applied') {
      cancelled += 1
    }
  }

  return cancelled
}

async function revertGoogleEventToAppointment(
  connectionId: string,
  calendarId: string,
  appointment: LinkedAppointment
): Promise<void> {
  if (!appointment.google_calendar_event_id) return

  const accessToken = await getValidGoogleCalendarAccessToken(connectionId)
  const clientName = appointment.client?.full_name?.trim() || 'Client'
  const notes = appointment.pre_session_notes ?? appointment.notes

  await updateGoogleCalendarEvent(
    accessToken,
    calendarId,
    appointment.google_calendar_event_id,
    {
      summary: `Coaching session — ${clientName}`,
      description: notes?.trim() ? notes.trim() : undefined,
      location: appointment.location,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
    }
  )
}

async function applyGoogleEventUpdate(
  connectionId: string,
  calendarId: string,
  appointment: LinkedAppointment,
  event: GoogleCalendarEvent
): Promise<'applied' | 'rejected' | 'skipped'> {
  if (event.status === 'cancelled') {
    return cancelAppointmentFromGoogleDeletion(appointment, event.updated)
  }

  if (!shouldApplyGoogleChange(appointment, event.updated)) {
    return 'skipped'
  }

  const times = getGoogleCalendarEventTimes(event)
  if (!times) return 'skipped'

  const timeChanged =
    times.startsAt !== appointment.starts_at || times.endsAt !== appointment.ends_at

  if (timeChanged) {
    const validation = await validateInboundGoogleReschedule({
      coachId: appointment.coach_id,
      appointmentId: appointment.id,
      googleEventId: event.id,
      startsAt: times.startsAt,
      endsAt: times.endsAt,
    })

    if (!validation.ok) {
      await revertGoogleEventToAppointment(connectionId, calendarId, appointment)
      return 'rejected'
    }
  }

  const admin = createAdminClient()
  if (!admin) return 'skipped'

  await admin
    .from('coaching_appointments')
    .update({
      starts_at: times.startsAt,
      ends_at: times.endsAt,
      location: event.location ?? appointment.location,
      pre_session_notes: event.description ?? appointment.pre_session_notes,
      notes: event.description ?? appointment.notes,
      google_calendar_updated_at: event.updated ?? new Date().toISOString(),
    })
    .eq('id', appointment.id)

  revalidatePath('/scheduling')
  revalidatePath('/portal/sessions')
  return 'applied'
}

async function applyGoogleEventDeletion(
  appointment: LinkedAppointment,
  deletedEventUpdatedAt?: string
): Promise<'applied' | 'skipped'> {
  return cancelAppointmentFromGoogleDeletion(
    appointment,
    deletedEventUpdatedAt
  )
}

export async function syncCoachCalendarFromGoogle(
  connectionId: string
): Promise<{ applied: number; rejected: number; skipped: number }> {
  const connection = await fetchCoachGoogleCalendarConnectionById(connectionId)
  if (!connection) {
    return { applied: 0, rejected: 0, skipped: 0 }
  }

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
  const { events, nextSyncToken } = await listGoogleCalendarEventChanges(
    accessToken,
    connection.calendar_id,
    { syncToken: connection.calendar_sync_token }
  )

  let applied = 0
  let rejected = 0
  let skipped = 0

  for (const event of events) {
    if (!event.id) continue

    const appointment = await fetchLinkedAppointmentByEventId(
      connection.coach_id,
      event.id
    )
    if (!appointment || appointment.status !== 'scheduled') {
      continue
    }

    if (event.status === 'cancelled') {
      const result = await applyGoogleEventDeletion(appointment, event.updated)
      if (result === 'applied') applied += 1
      else skipped += 1
      continue
    }

    const result = await applyGoogleEventUpdate(
      connection.id,
      connection.calendar_id,
      appointment,
      event
    )

    if (result === 'applied') applied += 1
    else if (result === 'rejected') rejected += 1
    else skipped += 1
  }

  await updateCoachGoogleCalendarWatchState(connection.id, {
    calendar_sync_token: nextSyncToken,
    last_calendar_sync_at: new Date().toISOString(),
  })

  const reconciled = await reconcileGoogleDeletedAppointmentsForCoach(
    connection.coach_id,
    {
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }
  )

  return { applied: applied + reconciled, rejected, skipped }
}

export async function refreshLinkedGoogleEvent(
  coachId: string,
  googleEventId: string
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  const { data: connectionRow } = await admin
    .from('coach_google_calendar_connections')
    .select('id')
    .eq('coach_id', coachId)
    .maybeSingle()

  if (!connectionRow) return

  const connection = await fetchCoachGoogleCalendarConnectionById(connectionRow.id)
  if (!connection) return

  const appointment = await fetchLinkedAppointmentByEventId(coachId, googleEventId)
  if (!appointment) return

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
  const event = await getGoogleCalendarEvent(
    accessToken,
    connection.calendar_id,
    googleEventId
  )

  if (!event) {
    await applyGoogleEventDeletion(appointment)
    return
  }

  await applyGoogleEventUpdate(
    connection.id,
    connection.calendar_id,
    appointment,
    event
  )
}
