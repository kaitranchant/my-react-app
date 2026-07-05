import {
  computeSeriesHorizonDays,
  getSeriesHorizonEnd,
} from '@/lib/appointment-series'
import { parseCoachPreferences } from '@/lib/coach-preferences'
import { extendCoachRecurringSeriesHorizon } from '@/lib/scheduling/extend-series-horizon'
import {
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvent,
  listGoogleCalendarEventsInRange,
} from '@/lib/google-calendar/api'
import { isExportedCoachingCalendarSummary } from '@/lib/google-calendar/coaching-event-summary'
import { fetchCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import {
  removeCoachingAppointmentFromGoogle,
  syncCoachingAppointmentToGoogle,
} from '@/lib/google-calendar/sync'
import { getValidGoogleCalendarAccessToken } from '@/lib/google-calendar/token-store'
import { fetchCoachSessionBookingSettings } from '@/lib/session-booking-queries'
import { createAdminClient } from '@/lib/supabase/admin'

const GOOGLE_SYNC_CANCELLATION_REASONS = [
  'Removed from Google Calendar',
  'Cancelled in Google Calendar',
] as const

export type RepairRecurringSeriesSyncResult = {
  restoredAppointments: number
  dedupedAppointments: number
  orphanEventsRemoved: number
  resyncedAppointments: number
  horizonExtended: boolean
}

type ScheduledAppointmentRow = {
  id: string
  starts_at: string
  google_calendar_event_id: string | null
  series_id: string | null
}

async function restoreSeriesAppointmentsCancelledByGoogleSync(coachId: string) {
  const admin = createAdminClient()
  if (!admin) return 0

  const { data: seriesRows } = await admin
    .from('coaching_appointment_series')
    .select('id')
    .eq('coach_id', coachId)
    .eq('status', 'active')

  const seriesIds = (seriesRows ?? []).map((series) => series.id)
  if (seriesIds.length === 0) return 0

  const { data: restoredRows, error } = await admin
    .from('coaching_appointments')
    .update({
      status: 'scheduled',
      cancelled_at: null,
      cancellation_reason: null,
      google_calendar_event_id: null,
      google_calendar_updated_at: null,
    })
    .in('series_id', seriesIds)
    .eq('status', 'cancelled')
    .in('cancellation_reason', [...GOOGLE_SYNC_CANCELLATION_REASONS])
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  return restoredRows?.length ?? 0
}

async function dedupeScheduledSeriesAppointments(coachId: string) {
  const admin = createAdminClient()
  if (!admin) return 0

  const { data: appointments, error } = await admin
    .from('coaching_appointments')
    .select('id, starts_at, google_calendar_event_id, series_id')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .not('series_id', 'is', null)
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const groups = new Map<string, ScheduledAppointmentRow[]>()
  for (const appointment of appointments ?? []) {
    if (!appointment.series_id) continue
    const key = `${appointment.series_id}:${appointment.starts_at}`
    const group = groups.get(key) ?? []
    group.push(appointment as ScheduledAppointmentRow)
    groups.set(key, group)
  }

  let deduped = 0

  for (const group of Array.from(groups.values())) {
    if (group.length <= 1) continue

    const keeper =
      group.find((appointment) => appointment.google_calendar_event_id) ??
      group[0]

    for (const duplicate of group) {
      if (duplicate.id === keeper.id) continue

      if (duplicate.google_calendar_event_id) {
        await removeCoachingAppointmentFromGoogle({
          coachId,
          googleCalendarEventId: duplicate.google_calendar_event_id,
        })
      }

      const { error: deleteError } = await admin
        .from('coaching_appointments')
        .delete()
        .eq('id', duplicate.id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      deduped += 1
    }
  }

  return deduped
}

async function removeOrphanCoachingGoogleEvents(
  coachId: string,
  timeMin: string,
  timeMax: string
) {
  const admin = createAdminClient()
  if (!admin) return 0

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_export_enabled) return 0

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
  const events = await listGoogleCalendarEventsInRange(
    accessToken,
    connection.calendar_id,
    timeMin,
    timeMax
  )

  const { data: linkedAppointments } = await admin
    .from('coaching_appointments')
    .select('google_calendar_event_id')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .not('google_calendar_event_id', 'is', null)

  const linkedEventIds = new Set(
    (linkedAppointments ?? [])
      .map((appointment) => appointment.google_calendar_event_id)
      .filter((eventId): eventId is string => Boolean(eventId))
  )

  let removed = 0

  for (const event of events) {
    if (!event.id || linkedEventIds.has(event.id)) continue
    if (!isExportedCoachingCalendarSummary(event.summary)) continue

    await deleteGoogleCalendarEvent(
      accessToken,
      connection.calendar_id,
      event.id
    )
    removed += 1
  }

  return removed
}

async function resyncScheduledAppointmentsToGoogle(
  coachId: string,
  options: { onlyMissing?: boolean } = {}
) {
  const admin = createAdminClient()
  if (!admin) return 0

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_export_enabled) return 0

  let query = admin
    .from('coaching_appointments')
    .select('id')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .order('starts_at', { ascending: true })

  if (options.onlyMissing) {
    query = query.is('google_calendar_event_id', null)
  }

  const { data: appointments, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  let resynced = 0

  for (const appointment of appointments ?? []) {
    const synced = await syncCoachingAppointmentToGoogle(appointment.id)
    if (synced) {
      resynced += 1
    }
  }

  return resynced
}

async function resyncStaleGoogleCalendarLinks(coachId: string) {
  const admin = createAdminClient()
  if (!admin) return 0

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_export_enabled) return 0

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)

  const { data: appointments, error } = await admin
    .from('coaching_appointments')
    .select('id, google_calendar_event_id')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .not('google_calendar_event_id', 'is', null)
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  let resynced = 0

  for (const appointment of appointments ?? []) {
    if (!appointment.google_calendar_event_id) continue

    const existingEvent = await getGoogleCalendarEvent(
      accessToken,
      connection.calendar_id,
      appointment.google_calendar_event_id
    )

    if (existingEvent && existingEvent.status !== 'cancelled') {
      continue
    }

    const synced = await syncCoachingAppointmentToGoogle(appointment.id)
    if (synced) {
      resynced += 1
    }
  }

  return resynced
}

export async function repairCoachRecurringSeriesGoogleSync(
  coachId: string
): Promise<RepairRecurringSeriesSyncResult> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Calendar repair is unavailable.')
  }

  const settings = await fetchCoachSessionBookingSettings(admin, coachId)
  const horizonDays = computeSeriesHorizonDays(settings.booking_max_days_ahead)
  const horizonEnd = getSeriesHorizonEnd(new Date(), horizonDays)
  const timeMin = new Date().toISOString()
  const timeMax = new Date(
    horizonEnd.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  const restoredAppointments =
    await restoreSeriesAppointmentsCancelledByGoogleSync(coachId)
  const dedupedAppointments = await dedupeScheduledSeriesAppointments(coachId)

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
    )
    .eq('id', coachId)
    .maybeSingle()
  const coachPreferences = parseCoachPreferences(profile)
  await extendCoachRecurringSeriesHorizon(admin, coachId, {
    timezone: coachPreferences.timezone,
  })

  const resyncedAppointments =
    (await resyncStaleGoogleCalendarLinks(coachId)) +
    (await resyncScheduledAppointmentsToGoogle(coachId, {
      onlyMissing: true,
    }))
  let orphanEventsRemoved = 0
  try {
    orphanEventsRemoved = await removeOrphanCoachingGoogleEvents(
      coachId,
      timeMin,
      timeMax
    )
  } catch (error) {
    console.error('[google-calendar] orphan cleanup failed', error)
  }

  return {
    restoredAppointments,
    dedupedAppointments,
    orphanEventsRemoved,
    resyncedAppointments,
    horizonExtended: true,
  }
}

export async function finalizeCoachRecurringSeriesGoogleSync(
  coachId: string
): Promise<
  Pick<
    RepairRecurringSeriesSyncResult,
    'dedupedAppointments' | 'orphanEventsRemoved' | 'resyncedAppointments'
  > & { horizonBooked: number }
> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Calendar repair is unavailable.')
  }

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
    )
    .eq('id', coachId)
    .maybeSingle()

  const coachPreferences = parseCoachPreferences(profile)
  const { bookedCount: horizonBooked } = await extendCoachRecurringSeriesHorizon(
    admin,
    coachId,
    { timezone: coachPreferences.timezone }
  )

  const settings = await fetchCoachSessionBookingSettings(admin, coachId)
  const horizonDays = computeSeriesHorizonDays(settings.booking_max_days_ahead)
  const horizonEnd = getSeriesHorizonEnd(new Date(), horizonDays)
  const timeMin = new Date().toISOString()
  const timeMax = new Date(
    horizonEnd.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  const dedupedAppointments = await dedupeScheduledSeriesAppointments(coachId)
  const resyncedAppointments =
    (await resyncStaleGoogleCalendarLinks(coachId)) +
    (await resyncScheduledAppointmentsToGoogle(coachId, {
      onlyMissing: true,
    }))
  let orphanEventsRemoved = 0
  try {
    orphanEventsRemoved = await removeOrphanCoachingGoogleEvents(
      coachId,
      timeMin,
      timeMax
    )
  } catch (error) {
    console.error('[google-calendar] orphan cleanup failed', error)
  }

  return {
    dedupedAppointments,
    orphanEventsRemoved,
    resyncedAppointments,
    horizonBooked,
  }
}
