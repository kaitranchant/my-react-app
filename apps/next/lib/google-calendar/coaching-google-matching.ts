import type { CoachingSessionType } from 'app/types/database'

import {
  getGoogleCalendarEventTimes,
  type GoogleCalendarEvent,
} from '@/lib/google-calendar/api'
import { isExportedCoachingCalendarSummary } from '@/lib/google-calendar/coaching-event-summary'
import { isLinkedCoachingGoogleEvent } from '@/lib/google-calendar/event-linking'
import { formatCoachingSessionType } from '@/lib/coaching-session-types'

export type AppointmentGoogleMatchInput = {
  id: string
  starts_at: string
  ends_at: string
  google_calendar_event_id: string | null
  session_type?: CoachingSessionType | string | null
  client?: { full_name: string | null } | null
}

export function buildExportedCoachingEventSummary(
  sessionType: CoachingSessionType | string | null | undefined,
  clientName: string | null | undefined
): string {
  const sessionLabel =
    formatCoachingSessionType(sessionType as CoachingSessionType) ?? 'Session'
  const name = clientName?.trim() || 'Client'
  return `${sessionLabel} — ${name}`
}

export function appointmentInstantMatches(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
): boolean {
  const leftStartMs = Date.parse(leftStart)
  const leftEndMs = Date.parse(leftEnd)
  const rightStartMs = Date.parse(rightStart)
  const rightEndMs = Date.parse(rightEnd)

  if (
    !Number.isFinite(leftStartMs) ||
    !Number.isFinite(leftEndMs) ||
    !Number.isFinite(rightStartMs) ||
    !Number.isFinite(rightEndMs)
  ) {
    return false
  }

  return leftStartMs === rightStartMs && leftEndMs === rightEndMs
}

export function isGoogleCoachingEventMissing(
  event: GoogleCalendarEvent | null | undefined
): boolean {
  return !event || event.status === 'cancelled'
}

export function googleEventMatchesCoachingAppointment(
  event: GoogleCalendarEvent,
  appointment: AppointmentGoogleMatchInput
): boolean {
  if (!event.id) return false

  if (appointment.google_calendar_event_id) {
    if (
      isLinkedCoachingGoogleEvent(
        event.id,
        new Set([appointment.google_calendar_event_id])
      )
    ) {
      return true
    }
  }

  const times = getGoogleCalendarEventTimes(event)
  if (!times) return false
  if (
    !appointmentInstantMatches(
      appointment.starts_at,
      appointment.ends_at,
      times.startsAt,
      times.endsAt
    )
  ) {
    return false
  }

  if (!isExportedCoachingCalendarSummary(event.summary)) {
    return false
  }

  const clientName = appointment.client?.full_name?.trim() || 'Client'
  const expected = buildExportedCoachingEventSummary(
    appointment.session_type,
    clientName
  )

  if (event.summary?.trim() === expected) {
    return true
  }

  return event.summary?.includes(clientName) ?? false
}

export function shouldRemoveAppointmentAfterGoogleDeletion(
  appointment: AppointmentGoogleMatchInput,
  googleEvents: GoogleCalendarEvent[]
): boolean {
  const matches = googleEvents.filter((event) =>
    googleEventMatchesCoachingAppointment(event, appointment)
  )

  if (appointment.google_calendar_event_id) {
    if (matches.length === 0) {
      return true
    }

    return matches.every((event) => event.status === 'cancelled')
  }

  const exportedMatches = matches.filter((event) =>
    isExportedCoachingCalendarSummary(event.summary)
  )

  if (exportedMatches.length === 0) {
    return false
  }

  return exportedMatches.every((event) => event.status === 'cancelled')
}
