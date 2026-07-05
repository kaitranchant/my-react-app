import {
  computeSeriesHorizonDays,
  countWeekIndexesThroughHorizon,
  getLatestSeriesWeekIndex,
  getSeriesHorizonEnd,
  offsetStartsAtByWeeks,
  type SeriesScheduleContext,
} from '@/lib/appointment-series'
import { defaultCoachingSessionType } from '@/lib/coaching-session-types'
import {
  queueCoachingAppointmentGoogleSync,
  syncCoachingAppointmentToGoogle,
} from '@/lib/google-calendar/sync'
import { validateCoachBookableInstant } from '@/lib/session-booking-slots'
import {
  fetchCoachSessionBookingSettings,
  fetchCoachingAppointments,
} from '@/lib/session-booking-queries'
import type { SupabaseClient } from '@supabase/supabase-js'

type ExtendSeriesHorizonOptions = {
  /** When true, wait for each Google Calendar export (scripts/cron). */
  awaitGoogleSync?: boolean
}

export async function extendCoachRecurringSeriesHorizon(
  supabase: SupabaseClient,
  coachId: string,
  schedule: SeriesScheduleContext,
  options: ExtendSeriesHorizonOptions = {}
): Promise<{ bookedCount: number }> {
  const settings = await fetchCoachSessionBookingSettings(supabase, coachId)
  const horizonDays = computeSeriesHorizonDays(settings.booking_max_days_ahead)
  const horizonEnd = getSeriesHorizonEnd(new Date(), horizonDays)

  const { data: seriesRows, error: seriesError } = await supabase
    .from('coaching_appointment_series')
    .select(
      'id, client_id, anchor_starts_at, duration_minutes, location, pre_session_notes, coaching_type, session_type, session_pack_id, max_week_index'
    )
    .eq('coach_id', coachId)
    .eq('status', 'active')

  if (seriesError) {
    throw new Error(seriesError.message)
  }

  let bookedCount = 0

  for (const series of seriesRows ?? []) {
    if (
      typeof series.max_week_index === 'number' &&
      series.max_week_index >= 0
    ) {
      continue
    }

    const { data: existingOccurrences, error: occurrencesError } = await supabase
      .from('coaching_appointments')
      .select('starts_at')
      .eq('series_id', series.id)
      .eq('status', 'scheduled')

    if (occurrencesError) {
      throw new Error(occurrencesError.message)
    }

    const lastWeekIndex = getLatestSeriesWeekIndex(
      series.anchor_starts_at,
      (existingOccurrences ?? []).map((appointment) => appointment.starts_at),
      schedule
    )

    const weekIndexes = countWeekIndexesThroughHorizon(
      series.anchor_starts_at,
      horizonEnd
    ).filter((weekIndex) => weekIndex > lastWeekIndex)

    if (weekIndexes.length === 0) continue

    const firstWeekIndex = Math.min(...weekIndexes)
    const lastWeekIndexToBook = Math.max(...weekIndexes)
    const firstStartsAt = offsetStartsAtByWeeks(
      series.anchor_starts_at,
      firstWeekIndex
    )
    const lastStartsAt = offsetStartsAtByWeeks(
      series.anchor_starts_at,
      lastWeekIndexToBook
    )
    const durationMs = series.duration_minutes * 60_000
    const timeMin = new Date(
      new Date(firstStartsAt).getTime() - 24 * 60 * 60 * 1000
    ).toISOString()
    const timeMax = new Date(
      new Date(lastStartsAt).getTime() + durationMs + 24 * 60 * 60 * 1000
    ).toISOString()

    const appointments = await fetchCoachingAppointments(
      supabase,
      coachId,
      timeMin,
      timeMax
    )

    for (const weekIndex of weekIndexes) {
      const startsAtIso = offsetStartsAtByWeeks(
        series.anchor_starts_at,
        weekIndex
      )

      const { data: existing } = await supabase
        .from('coaching_appointments')
        .select('id')
        .eq('series_id', series.id)
        .eq('starts_at', startsAtIso)
        .eq('status', 'scheduled')
        .maybeSingle()

      if (existing) continue

      const slotValidation = validateCoachBookableInstant({
        startsAt: startsAtIso,
        settings,
        appointments,
        durationMinutes: series.duration_minutes,
      })

      if (!slotValidation.ok) {
        continue
      }

      const endsAt = new Date(
        new Date(startsAtIso).getTime() + durationMs
      ).toISOString()

      const { data: inserted, error: insertError } = await supabase
        .from('coaching_appointments')
        .insert({
          coach_id: coachId,
          client_id: series.client_id,
          starts_at: startsAtIso,
          ends_at: endsAt,
          location: series.location,
          pre_session_notes: series.pre_session_notes,
          notes: series.pre_session_notes,
          coaching_type: series.coaching_type ?? null,
          session_type: series.session_type ?? defaultCoachingSessionType,
          session_pack_id: series.session_pack_id,
          series_id: series.id,
          booked_by: 'coach',
          status: 'scheduled',
        })
        .select('id')
        .single()

      if (insertError) {
        if (insertError.code === '23505') continue
        throw new Error(insertError.message)
      }

      if (inserted?.id) {
        if (options.awaitGoogleSync) {
          await syncCoachingAppointmentToGoogle(inserted.id)
        } else {
          queueCoachingAppointmentGoogleSync(inserted.id)
        }
        bookedCount += 1
      }
    }
  }

  return { bookedCount }
}
