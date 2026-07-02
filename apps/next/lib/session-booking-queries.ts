import type { SupabaseClient } from '@supabase/supabase-js'

import { addDaysToDateKey, getCurrentWeekDateKeys, parseDateKey } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { defaultCoachingSessionType } from '@/lib/coaching-session-types'
import { fetchGoogleBusyAppointments } from '@/lib/google-calendar/sync'
import {
  combineDateAndTimeToUtc,
  computeAvailableSlots,
  getCoachDateKeyFromReference,
  getSchedulingDateKeys,
} from '@/lib/session-booking-slots'
import {
  SESSION_BOOKING_SETTINGS_SELECT,
  type ClientSessionPack,
  type CoachAvailabilityException,
  type CoachAvailabilityRule,
  type CoachingAppointment,
  parseSessionBookingSettings,
  type SessionBookingSettings,
} from '@/lib/session-booking-types'

const COACHING_APPOINTMENT_CORE_SELECT = `
  id,
  coach_id,
  client_id,
  starts_at,
  ends_at,
  status,
  location,
  notes,
  pre_session_notes,
  post_session_notes,
  coaching_type,
  session_pack_id,
  booked_by,
  cancelled_at,
  cancellation_reason,
  rescheduled_to_id,
  series_id,
  created_at
`

const COACHING_APPOINTMENT_SELECT_WITH_CLIENT = `
  ${COACHING_APPOINTMENT_CORE_SELECT},
  session_type,
  series:coaching_appointment_series(id, status),
  client:clients(full_name, coaching_type)
`

const COACHING_APPOINTMENT_CORE_SELECT_LEGACY = `
  id,
  coach_id,
  client_id,
  starts_at,
  ends_at,
  status,
  location,
  notes,
  pre_session_notes,
  post_session_notes,
  coaching_type,
  session_pack_id,
  booked_by,
  cancelled_at,
  cancellation_reason,
  rescheduled_to_id,
  created_at
`

const COACHING_APPOINTMENT_SELECT_WITH_CLIENT_LEGACY = `
  ${COACHING_APPOINTMENT_CORE_SELECT_LEGACY},
  client:clients(full_name, coaching_type)
`

const COACHING_APPOINTMENT_SELECT_WITH_CLIENT_NO_SERIES = `
  ${COACHING_APPOINTMENT_CORE_SELECT},
  session_type,
  client:clients(full_name, coaching_type)
`

const COACHING_APPOINTMENT_CLIENT_SELECT = `
  ${COACHING_APPOINTMENT_CORE_SELECT},
  session_type
`

const COACHING_APPOINTMENT_CLIENT_SELECT_LEGACY = COACHING_APPOINTMENT_CORE_SELECT_LEGACY

function isMissingSessionTypeColumn(error: { message?: string } | null) {
  return error?.message?.includes('session_type') ?? false
}

function isMissingSeriesRelation(error: { message?: string } | null) {
  const message = error?.message ?? ''
  return (
    message.includes('series_id') ||
    message.includes('coaching_appointment_series')
  )
}

function normalizeAppointmentClient<T extends { client: unknown }>(row: T) {
  return {
    ...row,
    client: Array.isArray(row.client) ? row.client[0] ?? null : row.client,
  }
}

export async function fetchCoachSessionBookingSettings(
  supabase: SupabaseClient,
  coachId: string
): Promise<SessionBookingSettings> {
  const { data } = await supabase
    .from('profiles')
    .select(SESSION_BOOKING_SETTINGS_SELECT)
    .eq('id', coachId)
    .maybeSingle()

  return parseSessionBookingSettings(data)
}

export async function fetchPortalSessionBookingSettings(
  supabase: SupabaseClient
): Promise<SessionBookingSettings> {
  const { data, error } = await supabase.rpc(
    'get_portal_session_booking_settings'
  )

  if (error || !data) {
    return parseSessionBookingSettings(null)
  }

  return parseSessionBookingSettings(data as Partial<SessionBookingSettings>)
}

export async function fetchCoachAvailabilityRules(
  supabase: SupabaseClient,
  coachId: string
): Promise<CoachAvailabilityRule[]> {
  const { data } = await supabase
    .from('coach_availability_rules')
    .select('id, coach_id, day_of_week, start_time, end_time')
    .eq('coach_id', coachId)
    .order('day_of_week')
    .order('start_time')

  return (data ?? []) as CoachAvailabilityRule[]
}

export async function fetchCoachAvailabilityExceptions(
  supabase: SupabaseClient,
  coachId: string,
  fromDate: string,
  toDate: string
): Promise<CoachAvailabilityException[]> {
  const { data } = await supabase
    .from('coach_availability_exceptions')
    .select(
      'id, coach_id, exception_date, exception_type, start_time, end_time, notes'
    )
    .eq('coach_id', coachId)
    .gte('exception_date', fromDate)
    .lte('exception_date', toDate)
    .order('exception_date')

  return (data ?? []) as CoachAvailabilityException[]
}

function normalizeAppointmentRows(
  rows: Array<Record<string, unknown>>
): CoachingAppointment[] {
  return rows.map((row) => {
    const seriesRaw = row.series
    const series =
      seriesRaw &&
      typeof seriesRaw === 'object' &&
      seriesRaw !== null &&
      'id' in seriesRaw &&
      'status' in seriesRaw
        ? {
            id: String((seriesRaw as { id: unknown }).id),
            status: (seriesRaw as { status: 'active' | 'cancelled' }).status,
          }
        : null

    return {
      ...normalizeAppointmentClient(row as { client: unknown }),
      session_type:
        typeof row.session_type === 'string'
          ? row.session_type
          : defaultCoachingSessionType,
      series_id:
        typeof row.series_id === 'string' ? row.series_id : null,
      series,
    }
  }) as CoachingAppointment[]
}

export async function fetchCoachingAppointments(
  supabase: SupabaseClient,
  coachId: string,
  fromIso: string,
  toIso: string
): Promise<CoachingAppointment[]> {
  const primary = await supabase
    .from('coaching_appointments')
    .select(COACHING_APPOINTMENT_SELECT_WITH_CLIENT)
    .eq('coach_id', coachId)
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso)
    .order('starts_at')

  if (primary.error && isMissingSessionTypeColumn(primary.error)) {
    const legacy = await supabase
      .from('coaching_appointments')
      .select(COACHING_APPOINTMENT_SELECT_WITH_CLIENT_LEGACY)
      .eq('coach_id', coachId)
      .gte('starts_at', fromIso)
      .lt('starts_at', toIso)
      .order('starts_at')

    if (legacy.error) {
      console.error(
        '[scheduling] fetchCoachingAppointments failed',
        legacy.error.message
      )
      return []
    }

    return normalizeAppointmentRows(
      (legacy.data ?? []) as Array<Record<string, unknown>>
    )
  }

  if (primary.error && isMissingSeriesRelation(primary.error)) {
    const fallback = await supabase
      .from('coaching_appointments')
      .select(COACHING_APPOINTMENT_SELECT_WITH_CLIENT_NO_SERIES)
      .eq('coach_id', coachId)
      .gte('starts_at', fromIso)
      .lt('starts_at', toIso)
      .order('starts_at')

    if (fallback.error) {
      console.error(
        '[scheduling] fetchCoachingAppointments failed',
        fallback.error.message
      )
      return []
    }

    return normalizeAppointmentRows(
      (fallback.data ?? []) as Array<Record<string, unknown>>
    )
  }

  if (primary.error) {
    console.error(
      '[scheduling] fetchCoachingAppointments failed',
      primary.error.message
    )
    return []
  }

  return normalizeAppointmentRows(
    (primary.data ?? []) as Array<Record<string, unknown>>
  )
}

export async function fetchClientCoachingAppointments(
  supabase: SupabaseClient,
  clientId: string,
  fromIso: string,
  toIso: string
): Promise<CoachingAppointment[]> {
  const primary = await supabase
    .from('coaching_appointments')
    .select(COACHING_APPOINTMENT_CLIENT_SELECT)
    .eq('client_id', clientId)
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso)
    .order('starts_at')

  if (primary.error && isMissingSessionTypeColumn(primary.error)) {
    const legacy = await supabase
      .from('coaching_appointments')
      .select(COACHING_APPOINTMENT_CLIENT_SELECT_LEGACY)
      .eq('client_id', clientId)
      .gte('starts_at', fromIso)
      .lt('starts_at', toIso)
      .order('starts_at')

    if (legacy.error) {
      console.error(
        '[scheduling] fetchClientCoachingAppointments failed',
        legacy.error.message
      )
      return []
    }

    return normalizeAppointmentRows(
      (legacy.data ?? []) as Array<Record<string, unknown>>
    )
  }

  if (primary.error) {
    console.error(
      '[scheduling] fetchClientCoachingAppointments failed',
      primary.error.message
    )
    return []
  }

  return normalizeAppointmentRows(
    (primary.data ?? []) as Array<Record<string, unknown>>
  )
}

export async function fetchCoachSessionPacks(
  supabase: SupabaseClient,
  coachId: string
): Promise<ClientSessionPack[]> {
  const { data } = await supabase
    .from('client_session_packs')
    .select(
      `
      id,
      client_id,
      coach_id,
      label,
      total_sessions,
      sessions_used,
      expires_at,
      notes,
      price_cents,
      created_at,
      client:clients(full_name)
    `
    )
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => ({
    ...row,
    client: Array.isArray(row.client) ? row.client[0] ?? null : row.client,
  })) as ClientSessionPack[]
}

export async function fetchClientSessionPacks(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientSessionPack[]> {
  const { data } = await supabase
    .from('client_session_packs')
    .select(
      'id, client_id, coach_id, label, total_sessions, sessions_used, expires_at, notes, price_cents, created_at'
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (data ?? []) as ClientSessionPack[]
}

export async function fetchSessionPackUsage(
  supabase: SupabaseClient,
  packId: string,
  coachId: string
): Promise<CoachingAppointment[]> {
  const { data } = await supabase
    .from('coaching_appointments')
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      client_id,
      session_pack_id,
      client:clients(full_name)
    `
    )
    .eq('session_pack_id', packId)
    .eq('coach_id', coachId)
    .order('starts_at', { ascending: false })

  return (data ?? []).map((row) => ({
    ...row,
    client: Array.isArray(row.client) ? row.client[0] ?? null : row.client,
  })) as CoachingAppointment[]
}

export async function fetchAvailableSlotsForCoach(
  supabase: SupabaseClient,
  coachId: string,
  dateKeys: string[],
  coachPreferences: CoachPreferences,
  referenceDate = new Date(),
  options?: {
    ignoreMinNotice?: boolean
    settings?: SessionBookingSettings
    clientTimeZone?: string | null
  }
) {
  const settings =
    options?.settings ??
    (await fetchCoachSessionBookingSettings(supabase, coachId))

  const timeMin = new Date(
    referenceDate.getTime() - 24 * 60 * 60 * 1000
  ).toISOString()
  const timeMax = new Date(
    referenceDate.getTime() +
      (settings.booking_max_days_ahead + 1) * 24 * 60 * 60 * 1000
  ).toISOString()

  const [rules, exceptions, appointments, googleBusy] = await Promise.all([
    fetchCoachAvailabilityRules(supabase, coachId),
    fetchCoachAvailabilityExceptions(
      supabase,
      coachId,
      dateKeys[0]!,
      dateKeys[dateKeys.length - 1]!
    ),
    fetchCoachingAppointments(supabase, coachId, timeMin, timeMax),
    fetchGoogleBusyAppointments(coachId, timeMin, timeMax),
  ])

  return computeAvailableSlots({
    dateKeys,
    rules,
    exceptions,
    appointments: [...appointments, ...googleBusy],
    settings,
    timezone: coachPreferences.timezone,
    referenceDate,
    ignoreMinNotice: options?.ignoreMinNotice,
    clientTimeZone: options?.clientTimeZone,
  })
}

export function getWeekAppointmentRange(
  weekStartsOn: CoachPreferences['weekStartsOn'],
  timezone: CoachPreferences['timezone'],
  referenceDate = new Date()
) {
  const todayKey = getCoachDateKeyFromReference(timezone, referenceDate)
  const weekKeys = getCurrentWeekDateKeys(weekStartsOn, referenceDate)
  const startKey = weekKeys[0]!
  const endKey = weekKeys[weekKeys.length - 1]!

  const startIso = combineDateAndTimeToUtc(startKey, '00:00', timezone).toISOString()
  const endIso = combineDateAndTimeToUtc(
    addDaysToDateKey(endKey, 1),
    '00:00',
    timezone
  ).toISOString()

  return { startKey, endKey, startIso, endIso, todayKey, weekKeys }
}

/** Anchor the scheduling week to the coach's calendar day, not the server clock. */
export function getSchedulingWeekReferenceDate(
  timezone: CoachPreferences['timezone'],
  weekParam?: string | null
) {
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    return parseDateKey(weekParam)
  }

  return parseDateKey(getCoachDateKeyFromReference(timezone))
}

export function getPortalBookingDateKeys(
  settings: SessionBookingSettings,
  timezone: CoachPreferences['timezone'],
  days = 14
) {
  const startKey = getCoachDateKeyFromReference(timezone)
  return getSchedulingDateKeys(startKey, Math.min(days, settings.booking_max_days_ahead))
}
