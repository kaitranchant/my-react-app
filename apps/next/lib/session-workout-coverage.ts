import type { SupabaseClient } from '@supabase/supabase-js'

import type { CoachPreferences } from '@/lib/coach-preferences'
import { getDateKeyFromInstant } from '@/lib/session-booking-slots'
import type { CoachingAppointment } from '@/lib/session-booking-types'

export type SessionMissingWorkout = {
  appointmentId: string
  clientId: string
  clientName: string
  dateKey: string
  startsAt: string
}

export function workoutCoverageKey(clientId: string, dateKey: string) {
  return `${clientId}:${dateKey}`
}

/** Build a set of `${clientId}:${scheduled_date}` keys that have at least one workout. */
export async function fetchClientWorkoutCoverageKeys(
  supabase: SupabaseClient,
  clientIds: string[],
  fromDateKey: string,
  toDateKey: string
): Promise<Set<string>> {
  if (clientIds.length === 0) {
    return new Set()
  }

  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select('client_id, scheduled_date')
    .in('client_id', clientIds)
    .gte('scheduled_date', fromDateKey)
    .lte('scheduled_date', toDateKey)

  if (error) {
    throw new Error(error.message)
  }

  const keys = new Set<string>()
  for (const row of data ?? []) {
    if (!row.client_id || !row.scheduled_date) continue
    keys.add(workoutCoverageKey(row.client_id, row.scheduled_date))
  }
  return keys
}

/**
 * Upcoming (or in-range) scheduled coaching sessions with no training-calendar
 * workout on that same coach-local day.
 */
export function findSessionsMissingWorkouts({
  appointments,
  workoutCoverageKeys,
  timezone,
  todayKey,
  throughDateKey,
  statuses = ['scheduled'],
}: {
  appointments: Array<
    Pick<
      CoachingAppointment,
      'id' | 'client_id' | 'starts_at' | 'status' | 'client'
    >
  >
  workoutCoverageKeys: Set<string>
  timezone: CoachPreferences['timezone']
  /** When set, only include sessions on/after this date key. */
  todayKey?: string | null
  /** When set, only include sessions on/before this date key. */
  throughDateKey?: string | null
  statuses?: Array<CoachingAppointment['status']>
}): SessionMissingWorkout[] {
  const statusSet = new Set(statuses)
  const results: SessionMissingWorkout[] = []
  const seen = new Set<string>()

  for (const appointment of appointments) {
    if (!statusSet.has(appointment.status)) continue
    if (!appointment.client_id) continue

    const dateKey = getDateKeyFromInstant(appointment.starts_at, timezone)
    if (todayKey && dateKey < todayKey) continue
    if (throughDateKey && dateKey > throughDateKey) continue

    const coverageKey = workoutCoverageKey(appointment.client_id, dateKey)
    if (workoutCoverageKeys.has(coverageKey)) continue

    // One alert per client/day even if multiple sessions that day.
    if (seen.has(coverageKey)) continue
    seen.add(coverageKey)

    results.push({
      appointmentId: appointment.id,
      clientId: appointment.client_id,
      clientName: appointment.client?.full_name?.trim() || 'Client',
      dateKey,
      startsAt: appointment.starts_at,
    })
  }

  return results.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function appointmentMissingWorkout(
  appointment: Pick<CoachingAppointment, 'client_id' | 'starts_at' | 'status'>,
  workoutCoverageKeys: Set<string>,
  timezone: CoachPreferences['timezone'],
  statuses: Array<CoachingAppointment['status']> = ['scheduled']
): boolean {
  if (!statuses.includes(appointment.status)) return false
  if (!appointment.client_id) return false
  const dateKey = getDateKeyFromInstant(appointment.starts_at, timezone)
  return !workoutCoverageKeys.has(
    workoutCoverageKey(appointment.client_id, dateKey)
  )
}
