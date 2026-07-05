import {
  computeSeriesHorizonDays,
  countWeekIndexesThroughHorizon,
  getSeriesHorizonEnd,
  offsetStartsAtByWeeks,
} from '@/lib/appointment-series'
import { parseCoachPreferences, type CoachPreferences } from '@/lib/coach-preferences'
import { defaultCoachingSessionType } from '@/lib/coaching-session-types'
import {
  deleteGoogleCalendarEvent,
  listGoogleCalendarEventsInRange,
} from '@/lib/google-calendar/api'
import { isExportedCoachingCalendarSummary } from '@/lib/google-calendar/coaching-event-summary'
import { fetchCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import {
  removeCoachingAppointmentFromGoogle,
  syncCoachingAppointmentToGoogle,
} from '@/lib/google-calendar/sync'
import { getValidGoogleCalendarAccessToken } from '@/lib/google-calendar/token-store'
import { finalizeCoachRecurringSeriesGoogleSync } from '@/lib/google-calendar/repair-series-sync'
import {
  getDateKeyFromInstant,
  getDayOfWeekForDateKey,
  validateCoachBookableInstant,
} from '@/lib/session-booking-slots'
import {
  fetchCoachSessionBookingSettings,
  fetchCoachingAppointments,
} from '@/lib/session-booking-queries'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BookAppointmentValues } from '@/lib/validations/session-booking'

async function getCoachPreferencesAdmin(
  coachId: string
): Promise<CoachPreferences> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Admin client unavailable.')
  }

  const { data, error } = await admin
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
    )
    .eq('id', coachId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return parseCoachPreferences(data)
}

export type SeriesSnapshot = {
  coachId: string
  clientId: string
  anchorStartsAt: string
  durationMinutes: number
  location: string | null
  preSessionNotes: string | null
  coachingType: BookAppointmentValues['coachingType']
  sessionType: BookAppointmentValues['sessionType']
  sessionPackId: string | null
  repeatIndefinitely: boolean
}

export type ResetRebookResult = {
  coachId: string
  seriesReset: number
  googleEventsRemoved: number
  seriesRebooked: number
  repair: Awaited<ReturnType<typeof finalizeCoachRecurringSeriesGoogleSync>> & {
    restoredAppointments: number
    horizonExtended: boolean
  }
}

async function resolveCoachId(explicitCoachId?: string) {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Admin client unavailable.')
  }

  if (explicitCoachId?.trim()) {
    return explicitCoachId.trim()
  }

  const { data: activeSeries } = await admin
    .from('coaching_appointment_series')
    .select('coach_id')
    .eq('status', 'active')

  const coachIds = Array.from(
    new Set((activeSeries ?? []).map((row) => row.coach_id))
  )
  if (coachIds.length === 1) {
    return coachIds[0]
  }

  const { data: connections } = await admin
    .from('coach_google_calendar_connections')
    .select('coach_id')
    .order('connected_at', { ascending: false })
    .limit(1)

  if (connections?.[0]?.coach_id) {
    return connections[0].coach_id
  }

  throw new Error(
    `Could not infer coach id. Pass coachId explicitly. Found: ${coachIds.join(', ') || 'none'}`
  )
}

async function loadActiveSeriesSnapshots(coachId: string): Promise<SeriesSnapshot[]> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Admin client unavailable.')
  }

  const { data: seriesRows, error } = await admin
    .from('coaching_appointment_series')
    .select(
      'coach_id, client_id, anchor_starts_at, duration_minutes, location, pre_session_notes, coaching_type, session_type, session_pack_id, max_week_index'
    )
    .eq('coach_id', coachId)
    .eq('status', 'active')
    .order('anchor_starts_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (seriesRows ?? []).map((series) => ({
    coachId: series.coach_id,
    clientId: series.client_id,
    anchorStartsAt: series.anchor_starts_at,
    durationMinutes: series.duration_minutes,
    location: series.location,
    preSessionNotes: series.pre_session_notes,
    coachingType: series.coaching_type,
    sessionType: series.session_type ?? defaultCoachingSessionType,
    sessionPackId: series.session_pack_id,
    repeatIndefinitely: series.max_week_index == null,
  }))
}

async function purgeExportedGoogleEvents(coachId: string) {
  const admin = createAdminClient()
  if (!admin) return 0

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_export_enabled) return 0

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
  const timeMin = new Date().toISOString()
  const timeMax = new Date(
    Date.now() + 400 * 24 * 60 * 60 * 1000
  ).toISOString()

  const events = await listGoogleCalendarEventsInRange(
    accessToken,
    connection.calendar_id,
    timeMin,
    timeMax
  )

  let removed = 0
  for (const event of events) {
    if (!event.id || !isExportedCoachingCalendarSummary(event.summary)) continue
    await deleteGoogleCalendarEvent(
      accessToken,
      connection.calendar_id,
      event.id
    )
    removed += 1
  }

  return removed
}

async function teardownActiveSeries(coachId: string) {
  const admin = createAdminClient()
  if (!admin) return 0

  const { data: seriesRows } = await admin
    .from('coaching_appointment_series')
    .select('id')
    .eq('coach_id', coachId)
    .eq('status', 'active')

  let reset = 0

  for (const series of seriesRows ?? []) {
    const { data: appointments } = await admin
      .from('coaching_appointments')
      .select('id, google_calendar_event_id')
      .eq('series_id', series.id)

    for (const appointment of appointments ?? []) {
      if (appointment.google_calendar_event_id) {
        await removeCoachingAppointmentFromGoogle({
          coachId,
          googleCalendarEventId: appointment.google_calendar_event_id,
        })
      }
    }

    if (appointments?.length) {
      const { error: deleteError } = await admin
        .from('coaching_appointments')
        .delete()
        .in(
          'id',
          appointments.map((appointment) => appointment.id)
        )

      if (deleteError) {
        throw new Error(deleteError.message)
      }
    }

    const { error: seriesError } = await admin
      .from('coaching_appointment_series')
      .update({ status: 'cancelled' })
      .eq('id', series.id)

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    reset += 1
  }

  return reset
}

async function createSeries(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  snapshot: SeriesSnapshot
) {
  const row = {
    coach_id: snapshot.coachId,
    client_id: snapshot.clientId,
    anchor_starts_at: snapshot.anchorStartsAt,
    duration_minutes: snapshot.durationMinutes,
    location: snapshot.location,
    pre_session_notes: snapshot.preSessionNotes,
    coaching_type: snapshot.coachingType ?? null,
    session_type: snapshot.sessionType ?? defaultCoachingSessionType,
    session_pack_id: snapshot.sessionPackId,
    max_week_index: snapshot.repeatIndefinitely ? null : 0,
    status: 'active' as const,
  }

  const result = await admin
    .from('coaching_appointment_series')
    .insert(row)
    .select('id')
    .single()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.data.id
}

async function insertSeriesOccurrence(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  snapshot: SeriesSnapshot,
  seriesId: string,
  startsAtIso: string,
  endsAt: string
) {
  const { data, error } = await admin
    .from('coaching_appointments')
    .insert({
      coach_id: snapshot.coachId,
      client_id: snapshot.clientId,
      starts_at: startsAtIso,
      ends_at: endsAt,
      location: snapshot.location,
      pre_session_notes: snapshot.preSessionNotes,
      notes: snapshot.preSessionNotes,
      coaching_type: snapshot.coachingType ?? null,
      session_type: snapshot.sessionType ?? defaultCoachingSessionType,
      session_pack_id: snapshot.sessionPackId,
      series_id: seriesId,
      booked_by: 'coach',
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create appointment.')
  }

  await syncCoachingAppointmentToGoogle(data.id)
  return data.id
}

async function bookIndefiniteSeriesSnapshot(snapshot: SeriesSnapshot) {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Admin client unavailable.')
  }

  const settings = await fetchCoachSessionBookingSettings(admin, snapshot.coachId)
  const timeMin = new Date(
    new Date(snapshot.anchorStartsAt).getTime() - 24 * 60 * 60 * 1000
  ).toISOString()
  const horizonDays = computeSeriesHorizonDays(settings.booking_max_days_ahead)
  const horizonEnd = getSeriesHorizonEnd(new Date(), horizonDays)
  const timeMax = new Date(
    horizonEnd.getTime() + snapshot.durationMinutes * 60_000 + 24 * 60 * 60 * 1000
  ).toISOString()

  const appointments = await fetchCoachingAppointments(
    admin,
    snapshot.coachId,
    timeMin,
    timeMax
  )

  const anchorValidation = validateCoachBookableInstant({
    startsAt: snapshot.anchorStartsAt,
    settings,
    appointments,
    durationMinutes: snapshot.durationMinutes,
  })

  if (!anchorValidation.ok) {
    throw new Error(
      `Anchor slot unavailable (${snapshot.anchorStartsAt}): ${anchorValidation.error}`
    )
  }

  const seriesId = await createSeries(admin, snapshot)
  const weekIndexes = countWeekIndexesThroughHorizon(
    snapshot.anchorStartsAt,
    horizonEnd
  )

  for (const weekIndex of weekIndexes) {
    const startsAtIso = offsetStartsAtByWeeks(snapshot.anchorStartsAt, weekIndex)
    const endsAt = new Date(
      new Date(startsAtIso).getTime() + snapshot.durationMinutes * 60_000
    ).toISOString()

    const slotValidation = validateCoachBookableInstant({
      startsAt: startsAtIso,
      settings,
      appointments,
      durationMinutes: snapshot.durationMinutes,
    })

    if (!slotValidation.ok) {
      continue
    }

    await insertSeriesOccurrence(
      admin,
      snapshot,
      seriesId,
      startsAtIso,
      endsAt
    )
  }
}

export async function resetAndRebookCoachRecurringSeries(
  coachId?: string
): Promise<ResetRebookResult> {
  const resolvedCoachId = await resolveCoachId(coachId)
  const snapshots = await loadActiveSeriesSnapshots(resolvedCoachId)

  if (snapshots.length === 0) {
    return {
      coachId: resolvedCoachId,
      seriesReset: 0,
      googleEventsRemoved: 0,
      seriesRebooked: 0,
      repair: {
        restoredAppointments: 0,
        dedupedAppointments: 0,
        orphanEventsRemoved: 0,
        resyncedAppointments: 0,
        horizonExtended: false,
      },
    }
  }

  const googleEventsRemoved = await purgeExportedGoogleEvents(resolvedCoachId)
  const seriesReset = await teardownActiveSeries(resolvedCoachId)

  for (const snapshot of snapshots) {
    await bookIndefiniteSeriesSnapshot(snapshot)
  }

  const repair = await finalizeCoachRecurringSeriesGoogleSync(resolvedCoachId)

  return {
    coachId: resolvedCoachId,
    seriesReset,
    googleEventsRemoved,
    seriesRebooked: snapshots.length,
    repair: {
      restoredAppointments: 0,
      horizonExtended: true,
      ...repair,
    },
  }
}

export async function previewActiveRecurringSeries(coachId?: string) {
  const resolvedCoachId = await resolveCoachId(coachId)
  const snapshots = await loadActiveSeriesSnapshots(resolvedCoachId)
  const coachPreferences = await getCoachPreferencesAdmin(resolvedCoachId)

  return snapshots.map((snapshot) => ({
    ...snapshot,
    dayOfWeek: getDayOfWeekForDateKey(
      getDateKeyFromInstant(snapshot.anchorStartsAt, coachPreferences.timezone),
      coachPreferences.timezone
    ),
  }))
}
