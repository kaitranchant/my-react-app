import type { GoogleCalendarEvent } from '@/lib/google-calendar/api'
import { getGoogleCalendarEventTimes } from '@/lib/google-calendar/api'
import {
  intervalsOverlap,
  isLinkedCoachingGoogleEvent,
} from '@/lib/google-calendar/event-linking'

export type GoogleCalendarBlockedTime = {
  id: string
  startsAt: string
  endsAt: string
  title: string
}

type ScheduledAppointmentInterval = {
  starts_at: string
  ends_at: string
  google_calendar_event_id: string | null
}

export function filterGoogleCalendarBlockedTimes(
  events: GoogleCalendarEvent[],
  scheduledAppointments: ScheduledAppointmentInterval[]
): GoogleCalendarBlockedTime[] {
  const linkedEventIds = new Set(
    scheduledAppointments
      .map((appointment) => appointment.google_calendar_event_id)
      .filter((eventId): eventId is string => Boolean(eventId))
  )

  const blocked: GoogleCalendarBlockedTime[] = []

  for (const event of events) {
    if (!event.id || event.status === 'cancelled') continue
    if (isLinkedCoachingGoogleEvent(event.id, linkedEventIds)) continue

    const times = getGoogleCalendarEventTimes(event)
    if (!times) continue

    const overlapsAppSession = scheduledAppointments.some((appointment) =>
      intervalsOverlap(
        times.startsAt,
        times.endsAt,
        appointment.starts_at,
        appointment.ends_at
      )
    )

    if (overlapsAppSession) continue

    blocked.push({
      id: event.id,
      startsAt: times.startsAt,
      endsAt: times.endsAt,
      title: event.summary?.trim() || 'Busy',
    })
  }

  return blocked.sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  )
}
