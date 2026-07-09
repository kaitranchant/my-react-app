import { parseCoachPreferences } from '@/lib/coach-preferences'
import { toGoogleCalendarAuthError } from '@/lib/google-calendar/auth-errors'
import { reconcileGoogleDeletedAppointmentsForCoach } from '@/lib/google-calendar/inbound-sync'
import { extendCoachRecurringSeriesHorizon } from '@/lib/scheduling/extend-series-horizon'
import { fetchCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import {
  syncCoachingAppointmentToGoogle,
} from '@/lib/google-calendar/sync'
import {
  getValidGoogleCalendarAccessToken,
  hasGoogleCalendarTokens,
} from '@/lib/google-calendar/token-store'
import { createAdminClient } from '@/lib/supabase/admin'

export type RepairRecurringSeriesSyncResult = {
  restoredAppointments: number
  dedupedAppointments: number
  resyncedAppointments: number
  horizonExtended: boolean
  reconnectRequired?: boolean
}

type ScheduledAppointmentRow = {
  id: string
  starts_at: string
  google_calendar_event_id: string | null
  series_id: string | null
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

export async function resyncAllScheduledAppointmentsToGoogle(
  coachId: string
): Promise<number> {
  return resyncScheduledAppointmentsToGoogle(coachId)
}

async function cancelAppointmentsDeletedInGoogle(coachId: string) {
  return reconcileGoogleDeletedAppointmentsForCoach(coachId, {
    timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })
}

async function canUseGoogleCalendarExport(
  coachId: string
): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) return false

  const connection = await fetchCoachGoogleCalendarConnection(admin, coachId)
  if (!connection?.sync_export_enabled) return false
  if (!(await hasGoogleCalendarTokens(connection.id))) return false

  try {
    await getValidGoogleCalendarAccessToken(connection.id)
    return true
  } catch (error) {
    if (toGoogleCalendarAuthError(error)) {
      return false
    }
    throw error
  }
}

export async function repairCoachRecurringSeriesGoogleSync(
  coachId: string
): Promise<RepairRecurringSeriesSyncResult> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Calendar repair is unavailable.')
  }

  const restoredAppointments = 0
  const dedupedAppointments = await dedupeScheduledSeriesAppointments(coachId)

  let horizonExtended = false
  let resyncedAppointments = 0
  let reconnectRequired = !(await canUseGoogleCalendarExport(coachId))

  if (!reconnectRequired) {
    try {
      const { data: profile } = await admin
        .from('profiles')
        .select(
          'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
        )
        .eq('id', coachId)
        .maybeSingle()
      const coachPreferences = parseCoachPreferences(profile)
      await extendCoachRecurringSeriesHorizon(
        admin,
        coachId,
        { timezone: coachPreferences.timezone },
        { awaitGoogleSync: false }
      )
      horizonExtended = true

      resyncedAppointments =
        (await cancelAppointmentsDeletedInGoogle(coachId)) +
        (await resyncScheduledAppointmentsToGoogle(coachId, {
          onlyMissing: true,
        }))
    } catch (error) {
      if (toGoogleCalendarAuthError(error)) {
        reconnectRequired = true
      } else {
        throw error
      }
    }
  }

  return {
    restoredAppointments,
    dedupedAppointments,
    resyncedAppointments,
    horizonExtended,
    reconnectRequired,
  }
}

export async function maintainCoachRecurringSeriesHorizon(
  coachId: string
): Promise<{ horizonBooked: number; resyncedAppointments: number }> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Calendar maintenance is unavailable.')
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
    { timezone: coachPreferences.timezone },
    { awaitGoogleSync: true }
  )

  const resyncedAppointments =
    (await cancelAppointmentsDeletedInGoogle(coachId)) +
    (await resyncScheduledAppointmentsToGoogle(coachId, {
      onlyMissing: true,
    }))

  return { horizonBooked, resyncedAppointments }
}

export async function finalizeCoachRecurringSeriesGoogleSync(
  coachId: string
): Promise<
  Pick<
    RepairRecurringSeriesSyncResult,
    'dedupedAppointments' | 'resyncedAppointments'
  > & { horizonBooked: number }
> {
  const maintained = await maintainCoachRecurringSeriesHorizon(coachId)
  const dedupedAppointments = await dedupeScheduledSeriesAppointments(coachId)

  return {
    dedupedAppointments,
    resyncedAppointments: maintained.resyncedAppointments,
    horizonBooked: maintained.horizonBooked,
  }
}
