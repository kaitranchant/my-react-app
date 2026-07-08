'use server'

import { defaultCoachingSessionType } from '@/lib/coaching-session-types'

import { revalidatePath } from 'next/cache'

import type { ActionResult } from '@/app/(dashboard)/attendance/actions'
import {
  computeSeriesHorizonDays,
  countWeekIndexesThroughHorizon,
  getSeriesHorizonEnd,
  getWeekIndexFromAnchor,
  isOrphanSeriesOccurrenceAtOrAfterWeek,
  isSeriesOccurrenceAtOrAfterWeek,
  offsetStartsAtByWeeks,
  subtractStartsAtByWeeks,
  type SeriesScheduleContext,
} from '@/lib/appointment-series'
import { extendCoachRecurringSeriesHorizon } from '@/lib/scheduling/extend-series-horizon'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchGoogleCalendarBlockedTimes, attachGoogleEventMarkers } from '@/lib/google-calendar/blocked-times'
import type { GoogleCalendarBlockedTime } from '@/lib/google-calendar/blocked-times'
import { fetchCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import { fetchGoogleBusyAppointments } from '@/lib/google-calendar/sync'
import { requireClientAccess } from '@/lib/gym-access'
import { requirePortalClientContext } from '@/lib/portal-client'
import { fetchAvailableSlotsForCoach, fetchCoachBookableSlotsForCoach, fetchClientWeeklySessionTargets, fetchCoachSessionBookingSettings, fetchCoachingAppointments, fetchPortalSessionBookingSettings, getSchedulingWeekReferenceDate, getWeekAppointmentRange } from '@/lib/session-booking-queries'
import {
  computeWeeklyAnchorStartsAtForDay,
  formatAppointmentRange,
  getDateKeyFromInstant,
  resolveRepeatDaysOfWeek,
  validateCoachBookableInstant,
} from '@/lib/session-booking-slots'
import { sessionBookingSettingsToRow } from '@/lib/session-booking-types'
import {
  queueCoachingAppointmentGoogleRemoval,
  queueCoachingAppointmentGoogleSync,
} from '@/lib/google-calendar/sync'
import { createClient } from '@/lib/supabase/server'
import {
  availabilityExceptionSchema,
  availabilityRuleSchema,
  bookAppointmentSchema,
  cancelAppointmentSchema,
  clearGoogleEventMarkerSchema,
  deleteAppointmentSchema,
  rescheduleAppointmentSchema,
  sessionBookingSettingsSchema,
  sessionPackSchema,
  updateAppointmentNotesSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  upsertGoogleEventMarkerSchema,
} from '@/lib/validations/session-booking'
import { notifyClientOfCoachMessage } from '@/lib/notifications/notify-client-coach-message'
import type { CoachingAppointment } from '@/lib/session-booking-types'

function revalidateScheduling() {
  revalidatePath('/scheduling')
  revalidatePath('/portal/sessions')
}

async function requireCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }
  return { supabase, user }
}

export async function updateSessionBookingSettings(
  values: import('@/lib/validations/session-booking').SessionBookingSettingsValues
): Promise<ActionResult> {
  const parsed = sessionBookingSettingsSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid booking settings.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  if (parsed.data.sessionBookingEnabled) {
    const coachPreferences = await getCoachPreferencesForUser(ctx.user.id)
    if (coachPreferences.timezone === 'auto') {
      return {
        success: false,
        error: 'Set your timezone in Coaching preferences before enabling client booking.',
      }
    }
  }

  const { error } = await ctx.supabase
    .from('profiles')
    .update(sessionBookingSettingsToRow(parsed.data))
    .eq('id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  return { success: true }
}

export async function replaceAvailabilityRules(
  rules: import('@/lib/validations/session-booking').AvailabilityRuleValues[]
): Promise<ActionResult> {
  const parsedRules = rules.map((rule) => availabilityRuleSchema.safeParse(rule))
  if (parsedRules.some((result) => !result.success)) {
    return { success: false, error: 'Invalid availability rules.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error: deleteError } = await ctx.supabase
    .from('coach_availability_rules')
    .delete()
    .eq('coach_id', ctx.user.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  if (parsedRules.length > 0) {
    const { error: insertError } = await ctx.supabase
      .from('coach_availability_rules')
      .insert(
        parsedRules.map((result) => ({
          coach_id: ctx.user.id,
          day_of_week: result.data!.dayOfWeek,
          start_time: result.data!.startTime,
          end_time: result.data!.endTime,
        }))
      )

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidateScheduling()
  return { success: true }
}

export async function createAvailabilityException(
  values: import('@/lib/validations/session-booking').AvailabilityExceptionValues
): Promise<ActionResult> {
  const parsed = availabilityExceptionSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid availability exception.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase.from('coach_availability_exceptions').insert({
    coach_id: ctx.user.id,
    exception_date: parsed.data.exceptionDate,
    exception_type: parsed.data.exceptionType,
    start_time: parsed.data.startTime ?? null,
    end_time: parsed.data.endTime ?? null,
    notes: parsed.data.notes ?? null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  return { success: true }
}

export async function deleteAvailabilityException(
  exceptionId: string
): Promise<ActionResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase
    .from('coach_availability_exceptions')
    .delete()
    .eq('id', exceptionId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  return { success: true }
}

export async function createSessionPack(
  values: import('@/lib/validations/session-booking').SessionPackValues
): Promise<ActionResult> {
  const parsed = sessionPackSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid session pack.' }
  }

  const access = await requireClientAccess(parsed.data.clientId)
  if (!access) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await access.supabase.from('client_session_packs').insert({
    client_id: parsed.data.clientId,
    coach_id: access.user.id,
    label: parsed.data.label.trim(),
    total_sessions: parsed.data.totalSessions,
    expires_at: parsed.data.expiresAt ?? null,
    price_cents: parsed.data.priceCents ?? null,
    notes: parsed.data.notes ?? null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  return { success: true }
}

async function validateBookableSlot(options: {
  coachId: string
  clientId: string
  startsAt: string
  sessionPackId?: string | null
  ignoreMinNotice?: boolean
  coachBooking?: boolean
  settings?: Awaited<ReturnType<typeof fetchCoachSessionBookingSettings>>
  clientTimeZone?: string | null
  excludeAppointmentId?: string
  excludeAppointmentIds?: string[]
}): Promise<
  | { ok: false; error: string }
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      settings: Awaited<ReturnType<typeof fetchCoachSessionBookingSettings>>
      endsAt: string
      sessionPackId: string | null
    }
> {
  const supabase = await createClient()
  const coachPreferences = await getCoachPreferencesForUser(options.coachId)
  const settings =
    options.settings ??
    (await fetchCoachSessionBookingSettings(supabase, options.coachId))
  const dateKey = getDateKeyFromInstant(
    options.startsAt,
    coachPreferences.timezone,
    options.clientTimeZone
  )

  if (options.coachBooking) {
    const timeMin = new Date(
      new Date(options.startsAt).getTime() - 24 * 60 * 60 * 1000
    ).toISOString()
    const timeMax = new Date(
      new Date(options.startsAt).getTime() + 24 * 60 * 60 * 1000
    ).toISOString()
    const [appointments, googleBusy] = await Promise.all([
      fetchCoachingAppointments(supabase, options.coachId, timeMin, timeMax),
      fetchGoogleBusyAppointments(options.coachId, timeMin, timeMax),
    ])
    const excludedIds = new Set(
      [
        options.excludeAppointmentId,
        ...(options.excludeAppointmentIds ?? []),
      ].filter((id): id is string => Boolean(id))
    )
    const filteredAppointments = excludedIds.size
      ? appointments.filter((appointment) => !excludedIds.has(appointment.id))
      : appointments
    const coachValidation = validateCoachBookableInstant({
      startsAt: options.startsAt,
      settings,
      appointments: [...filteredAppointments, ...googleBusy],
    })

    if (!coachValidation.ok) {
      return { ok: false, error: coachValidation.error }
    }

    if (settings.booking_requires_session_pack) {
      if (!options.sessionPackId) {
        return { ok: false, error: 'A session pack is required to book.' }
      }

      const { data: pack } = await supabase
        .from('client_session_packs')
        .select('id, client_id, total_sessions, sessions_used, expires_at')
        .eq('id', options.sessionPackId)
        .eq('client_id', options.clientId)
        .maybeSingle()

      if (!pack || pack.sessions_used >= pack.total_sessions) {
        return { ok: false, error: 'No sessions remaining in that pack.' }
      }

      if (pack.expires_at && pack.expires_at < dateKey) {
        return { ok: false, error: 'That session pack has expired.' }
      }
    }

    return {
      ok: true,
      supabase,
      settings,
      endsAt: coachValidation.endsAt,
      sessionPackId: options.sessionPackId ?? null,
    }
  }

  const slots = await fetchAvailableSlotsForCoach(
    supabase,
    options.coachId,
    [dateKey],
    coachPreferences,
    new Date(),
    {
      ignoreMinNotice: options.ignoreMinNotice,
      settings,
      clientTimeZone: options.clientTimeZone,
      excludeAppointmentId: options.excludeAppointmentId,
    }
  )

  const matchingSlot = slots.find((slot) => slot.startsAt === options.startsAt)
  if (!matchingSlot) {
    return { ok: false, error: 'That time slot is no longer available.' }
  }

  if (settings.booking_requires_session_pack) {
    if (!options.sessionPackId) {
      return { ok: false, error: 'A session pack is required to book.' }
    }

    const { data: pack } = await supabase
      .from('client_session_packs')
      .select('id, client_id, total_sessions, sessions_used, expires_at')
      .eq('id', options.sessionPackId)
      .eq('client_id', options.clientId)
      .maybeSingle()

    if (!pack || pack.sessions_used >= pack.total_sessions) {
      return { ok: false, error: 'No sessions remaining in that pack.' }
    }

    if (pack.expires_at && pack.expires_at < matchingSlot.dateKey) {
      return { ok: false, error: 'That session pack has expired.' }
    }
  }

  return {
    ok: true,
    supabase,
    settings,
    endsAt: matchingSlot.endsAt,
    sessionPackId: options.sessionPackId ?? null,
  }
}

async function incrementSessionPackUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packId: string
) {
  const { data: pack } = await supabase
    .from('client_session_packs')
    .select('sessions_used, total_sessions')
    .eq('id', packId)
    .maybeSingle()

  if (!pack || pack.sessions_used >= pack.total_sessions) return

  await supabase
    .from('client_session_packs')
    .update({ sessions_used: pack.sessions_used + 1 })
    .eq('id', packId)
}

async function chargeSessionPackForAppointment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packId: string | null | undefined
) {
  if (!packId) return
  await incrementSessionPackUsage(supabase, packId)
}

async function insertCoachingAppointment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: {
    coachId: string
    clientId: string
    startsAt: string
    endsAt: string
    location: string | null
    preSessionNotes: string | null
    coachingType: import('@/lib/validations/session-booking').BookAppointmentValues['coachingType']
    sessionType: import('@/lib/validations/session-booking').BookAppointmentValues['sessionType']
    sessionPackId: string | null
    bookedBy: 'coach' | 'client'
    seriesId?: string | null
  }
) {
  const row = {
    coach_id: values.coachId,
    client_id: values.clientId,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    location: values.location,
    pre_session_notes: values.preSessionNotes,
    notes: values.preSessionNotes,
    coaching_type: values.coachingType ?? null,
    session_type: values.sessionType ?? defaultCoachingSessionType,
    session_pack_id: values.sessionPackId,
    series_id: values.seriesId ?? null,
    booked_by: values.bookedBy,
    status: 'scheduled' as const,
  }

  const result = await supabase
    .from('coaching_appointments')
    .insert(row)
    .select('id')
    .single()

  if (result.error?.message.includes('session_type')) {
    const { session_type: _sessionType, series_id: _seriesId, ...legacyRow } = row
    return supabase
      .from('coaching_appointments')
      .insert(legacyRow)
      .select('id')
      .single()
  }

  if (result.error?.message.includes('series_id')) {
    const { series_id: _seriesId, ...legacyRow } = row
    return supabase
      .from('coaching_appointments')
      .insert(legacyRow)
      .select('id')
      .single()
  }

  return result
}

type WeeklyBookingTemplate = {
  coachId: string
  clientId: string
  location: string | null
  preSessionNotes: string | null
  coachingType: import('@/lib/validations/session-booking').BookAppointmentValues['coachingType']
  sessionType: import('@/lib/validations/session-booking').BookAppointmentValues['sessionType']
  sessionPackId: string | null
  clientTimeZone?: string
  seriesId?: string | null
}

type CoachSeriesBookingContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  settings: Awaited<ReturnType<typeof fetchCoachSessionBookingSettings>>
  durationMinutes: number
}

async function seriesOccurrenceExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seriesId: string,
  startsAtIso: string,
  coachId: string,
  clientId: string
) {
  const { data: bySeries } = await supabase
    .from('coaching_appointments')
    .select('id')
    .eq('series_id', seriesId)
    .eq('starts_at', startsAtIso)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (bySeries) {
    return true
  }

  const { data: bySlot } = await supabase
    .from('coaching_appointments')
    .select('id')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('starts_at', startsAtIso)
    .eq('status', 'scheduled')
    .maybeSingle()

  return Boolean(bySlot)
}

function isDuplicateSeriesOccurrenceError(error: { code?: string; message?: string } | null) {
  return error?.code === '23505'
}

async function bookWeeklyAppointmentOccurrences(options: {
  anchorStartsAtIso: string
  weekIndexes: number[]
  template: WeeklyBookingTemplate
  abortOnFailure: boolean
  weekLabelPrefix?: string
  coachSeriesContext?: CoachSeriesBookingContext
}): Promise<ActionResult & { bookedCount?: number }> {
  const supabase =
    options.coachSeriesContext?.supabase ?? (await createClient())
  let bookedCount = 0
  let cachedAppointments: CoachingAppointment[] | null = null

  if (options.coachSeriesContext && options.weekIndexes.length > 0) {
    const firstWeekIndex = Math.min(...options.weekIndexes)
    const lastWeekIndex = Math.max(...options.weekIndexes)
    const firstStartsAt = offsetStartsAtByWeeks(
      options.anchorStartsAtIso,
      firstWeekIndex
    )
    const lastStartsAt = offsetStartsAtByWeeks(
      options.anchorStartsAtIso,
      lastWeekIndex
    )
    const durationMs = options.coachSeriesContext.durationMinutes * 60_000
    const timeMin = new Date(
      new Date(firstStartsAt).getTime() - 24 * 60 * 60 * 1000
    ).toISOString()
    const timeMax = new Date(
      new Date(lastStartsAt).getTime() + durationMs + 24 * 60 * 60 * 1000
    ).toISOString()
    cachedAppointments = await fetchCoachingAppointments(
      supabase,
      options.template.coachId,
      timeMin,
      timeMax
    )
  }

  for (const weekIndex of options.weekIndexes) {
    const startsAtIso = offsetStartsAtByWeeks(
      options.anchorStartsAtIso,
      weekIndex
    )

    if (
      options.template.seriesId &&
      (await seriesOccurrenceExists(
        supabase,
        options.template.seriesId,
        startsAtIso,
        options.template.coachId,
        options.template.clientId
      ))
    ) {
      continue
    }

    let insertSupabase = supabase
    let endsAt: string
    let sessionPackId = options.template.sessionPackId

    if (options.coachSeriesContext) {
      const coachValidation = validateCoachBookableInstant({
        startsAt: startsAtIso,
        settings: options.coachSeriesContext.settings,
        appointments: cachedAppointments ?? [],
        durationMinutes: options.coachSeriesContext.durationMinutes,
      })

      if (!coachValidation.ok) {
        if (options.abortOnFailure) {
          const label = options.weekLabelPrefix ?? 'Week'
          return {
            success: false,
            error:
              options.weekIndexes.length > 1
                ? `${label} ${weekIndex + 1}: ${coachValidation.error}`
                : coachValidation.error,
          }
        }
        continue
      }

      endsAt = coachValidation.endsAt
    } else {
      const validation = await validateBookableSlot({
        coachId: options.template.coachId,
        clientId: options.template.clientId,
        startsAt: startsAtIso,
        sessionPackId: options.template.sessionPackId,
        ignoreMinNotice: true,
        coachBooking: true,
        clientTimeZone: options.template.clientTimeZone,
      })

      if (!validation.ok) {
        if (options.abortOnFailure) {
          const label = options.weekLabelPrefix ?? 'Week'
          return {
            success: false,
            error:
              options.weekIndexes.length > 1
                ? `${label} ${weekIndex + 1}: ${validation.error}`
                : validation.error,
          }
        }
        continue
      }

      insertSupabase = validation.supabase
      endsAt = validation.endsAt
      sessionPackId = validation.sessionPackId
    }

    const { data: inserted, error } = await insertCoachingAppointment(
      insertSupabase,
      {
        coachId: options.template.coachId,
        clientId: options.template.clientId,
        startsAt: startsAtIso,
        endsAt,
        location: options.template.location,
        preSessionNotes: options.template.preSessionNotes,
        coachingType: options.template.coachingType,
        sessionType: options.template.sessionType,
        sessionPackId,
        bookedBy: 'coach',
        seriesId: options.template.seriesId,
      }
    )

    if (error) {
      if (isDuplicateSeriesOccurrenceError(error)) {
        continue
      }

      if (options.abortOnFailure) {
        const label = options.weekLabelPrefix ?? 'Week'
        return {
          success: false,
          error:
            options.weekIndexes.length > 1
              ? `${label} ${weekIndex + 1}: ${error.message}`
              : error.message,
        }
      }
      continue
    }

    if (inserted?.id) {
      queueCoachingAppointmentGoogleSync(inserted.id)
      bookedCount += 1
    }
  }

  return { success: true, bookedCount }
}

async function createCoachingAppointmentSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: {
    coachId: string
    clientId: string
    anchorStartsAt: string
    durationMinutes: number
    location: string | null
    preSessionNotes: string | null
    coachingType: import('@/lib/validations/session-booking').BookAppointmentValues['coachingType']
    sessionType: import('@/lib/validations/session-booking').BookAppointmentValues['sessionType']
    sessionPackId: string | null
    maxWeekIndex?: number | null
  }
) {
  const row = {
    coach_id: values.coachId,
    client_id: values.clientId,
    anchor_starts_at: values.anchorStartsAt,
    duration_minutes: values.durationMinutes,
    location: values.location,
    pre_session_notes: values.preSessionNotes,
    coaching_type: values.coachingType ?? null,
    session_type: values.sessionType ?? defaultCoachingSessionType,
    session_pack_id: values.sessionPackId,
    max_week_index: values.maxWeekIndex ?? null,
    status: 'active' as const,
  }

  const result = await supabase
    .from('coaching_appointment_series')
    .insert(row)
    .select('id')
    .single()

  if (result.error?.message.includes('max_week_index')) {
    const { max_week_index: _maxWeekIndex, ...legacyRow } = row
    return supabase
      .from('coaching_appointment_series')
      .insert(legacyRow)
      .select('id')
      .single()
  }

  return result
}

type CoachingAppointmentSeriesScope = {
  id: string
  anchor_starts_at: string
  coach_id: string
  client_id: string
  max_week_index: number | null
}

async function fetchCoachingAppointmentSeriesScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seriesId: string,
  coachId: string
): Promise<CoachingAppointmentSeriesScope | null> {
  const { data: series } = await supabase
    .from('coaching_appointment_series')
    .select('id, anchor_starts_at, coach_id, client_id, max_week_index')
    .eq('id', seriesId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (!series) {
    return null
  }

  return {
    id: series.id,
    anchor_starts_at: series.anchor_starts_at,
    coach_id: series.coach_id,
    client_id: series.client_id,
    max_week_index:
      typeof series.max_week_index === 'number' ? series.max_week_index : null,
  }
}

async function listScheduledSeriesOccurrencesFromWeek(
  supabase: Awaited<ReturnType<typeof createClient>>,
  series: CoachingAppointmentSeriesScope,
  fromStartsAtIso: string,
  schedule?: SeriesScheduleContext
) {
  const fromWeekIndex = Math.max(
    0,
    getWeekIndexFromAnchor(series.anchor_starts_at, fromStartsAtIso, schedule)
  )
  const fromSlotStartsAt = offsetStartsAtByWeeks(
    series.anchor_starts_at,
    fromWeekIndex
  )

  const { data: withSeriesId } = await supabase
    .from('coaching_appointments')
    .select('id, starts_at, google_calendar_event_id, series_id')
    .eq('series_id', series.id)
    .eq('status', 'scheduled')

  const { data: orphans } = await supabase
    .from('coaching_appointments')
    .select('id, starts_at, google_calendar_event_id, series_id')
    .eq('coach_id', series.coach_id)
    .eq('client_id', series.client_id)
    .eq('status', 'scheduled')
    .is('series_id', null)
    .gte('starts_at', fromSlotStartsAt)

  const seen = new Set<string>()
  const matches: Array<{
    id: string
    starts_at: string
    google_calendar_event_id: string | null
  }> = []

  for (const appointment of [...(withSeriesId ?? []), ...(orphans ?? [])]) {
    if (seen.has(appointment.id)) continue

    const include =
      appointment.series_id === series.id
        ? isSeriesOccurrenceAtOrAfterWeek(
            series.anchor_starts_at,
            appointment.starts_at,
            fromWeekIndex,
            series.max_week_index,
            schedule
          )
        : isOrphanSeriesOccurrenceAtOrAfterWeek(
            series.anchor_starts_at,
            appointment.starts_at,
            fromWeekIndex,
            series.max_week_index,
            schedule
          )

    if (!include) continue

    seen.add(appointment.id)
    matches.push(appointment)
  }

  return matches
}

async function extendCoachAppointmentSeriesHorizon(coachId: string) {
  const supabase = await createClient()
  const coachPreferences = await getCoachPreferencesForUser(coachId)
  await extendCoachRecurringSeriesHorizon(supabase, coachId, {
    timezone: coachPreferences.timezone,
  })
}

export async function ensureCoachAppointmentSeriesHorizon(coachId: string) {
  try {
    await extendCoachAppointmentSeriesHorizon(coachId)
  } catch (error) {
    console.error('[scheduling] ensureCoachAppointmentSeriesHorizon failed', error)
  }
}

async function deleteScheduledSeriesAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  series: CoachingAppointmentSeriesScope,
  fromStartsAtIso: string
) {
  const coachPreferences = await getCoachPreferencesForUser(coachId)
  const schedule: SeriesScheduleContext = {
    timezone: coachPreferences.timezone,
  }
  const toDelete = await listScheduledSeriesOccurrencesFromWeek(
    supabase,
    series,
    fromStartsAtIso,
    schedule
  )

  for (const scheduledAppointment of toDelete) {
    queueCoachingAppointmentGoogleRemoval({
      coachId,
      googleCalendarEventId: scheduledAppointment.google_calendar_event_id,
    })
  }

  if (toDelete.length === 0) {
    return { error: null }
  }

  return supabase
    .from('coaching_appointments')
    .delete()
    .in(
      'id',
      toDelete.map((appointment) => appointment.id)
    )
}

async function cancelScheduledSeriesAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  series: CoachingAppointmentSeriesScope,
  fromStartsAtIso: string,
  cancellationReason: string
) {
  const coachPreferences = await getCoachPreferencesForUser(coachId)
  const schedule: SeriesScheduleContext = {
    timezone: coachPreferences.timezone,
  }
  const toCancel = await listScheduledSeriesOccurrencesFromWeek(
    supabase,
    series,
    fromStartsAtIso,
    schedule
  )

  for (const scheduledAppointment of toCancel) {
    queueCoachingAppointmentGoogleRemoval({
      coachId,
      googleCalendarEventId: scheduledAppointment.google_calendar_event_id,
    })
  }

  if (toCancel.length === 0) {
    return { error: null }
  }

  const nowIso = new Date().toISOString()
  return supabase
    .from('coaching_appointments')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancellation_reason: cancellationReason,
    })
    .in(
      'id',
      toCancel.map((appointment) => appointment.id)
    )
}

type UpdateSeriesAppointmentTemplate = {
  clientId: string
  startsAt: string
  location: string | null
  sessionType: import('@/lib/validations/session-booking').BookAppointmentValues['sessionType']
  sessionPackId: string | null
  clientTimeZone?: string | null
  notifyClient?: boolean
}

async function updateScheduledSeriesAppointmentsFromWeek(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  seriesScope: CoachingAppointmentSeriesScope,
  fromStartsAtIso: string,
  template: UpdateSeriesAppointmentTemplate
): Promise<ActionResult> {
  const coachPreferences = await getCoachPreferencesForUser(coachId)
  const schedule: SeriesScheduleContext = {
    timezone: coachPreferences.timezone,
  }
  const oldAnchor = seriesScope.anchor_starts_at
  const fromWeekIndex = Math.max(
    0,
    getWeekIndexFromAnchor(oldAnchor, fromStartsAtIso, schedule)
  )

  const occurrences = await listScheduledSeriesOccurrencesFromWeek(
    supabase,
    seriesScope,
    fromStartsAtIso,
    schedule
  )

  if (occurrences.length === 0) {
    return { success: false, error: 'No scheduled sessions found to update.' }
  }

  const excludeAppointmentIds = occurrences.map((occurrence) => occurrence.id)
  const firstValidation = await validateBookableSlot({
    coachId,
    clientId: template.clientId,
    startsAt: template.startsAt,
    sessionPackId: template.sessionPackId,
    ignoreMinNotice: true,
    coachBooking: true,
    clientTimeZone: template.clientTimeZone,
    excludeAppointmentIds,
  })

  if (!firstValidation.ok) {
    return { success: false, error: firstValidation.error }
  }

  const durationMinutes = Math.round(
    (new Date(firstValidation.endsAt).getTime() -
      new Date(template.startsAt).getTime()) /
      60_000
  )

  const sortedOccurrences = [...occurrences].sort((left, right) =>
    left.starts_at.localeCompare(right.starts_at)
  )

  let targetSeriesId = seriesScope.id
  let newAnchor = subtractStartsAtByWeeks(template.startsAt, fromWeekIndex)

  if (fromWeekIndex > 0) {
    const { error: capSeriesError } = await supabase
      .from('coaching_appointment_series')
      .update({ max_week_index: fromWeekIndex - 1 })
      .eq('id', seriesScope.id)
      .eq('coach_id', coachId)

    if (capSeriesError) {
      return { success: false, error: capSeriesError.message }
    }

    const { data: fullSeries } = await supabase
      .from('coaching_appointment_series')
      .select(
        'pre_session_notes, coaching_type, session_type, session_pack_id, location'
      )
      .eq('id', seriesScope.id)
      .maybeSingle()

    const createdSeries = await createCoachingAppointmentSeries(supabase, {
      coachId,
      clientId: template.clientId,
      anchorStartsAt: template.startsAt,
      durationMinutes,
      location: template.location,
      preSessionNotes: fullSeries?.pre_session_notes ?? null,
      coachingType: fullSeries?.coaching_type ?? null,
      sessionType: template.sessionType,
      sessionPackId: template.sessionPackId,
      maxWeekIndex: null,
    })

    if (createdSeries.error || !createdSeries.data) {
      return {
        success: false,
        error: createdSeries.error?.message ?? 'Could not update recurring series.',
      }
    }

    targetSeriesId = createdSeries.data.id
    newAnchor = template.startsAt
  } else {
    const { error: seriesError } = await supabase
      .from('coaching_appointment_series')
      .update({
        anchor_starts_at: newAnchor,
        duration_minutes: durationMinutes,
        client_id: template.clientId,
        location: template.location,
        session_type: template.sessionType,
        session_pack_id: template.sessionPackId,
      })
      .eq('id', seriesScope.id)
      .eq('coach_id', coachId)

    if (seriesError) {
      return { success: false, error: seriesError.message }
    }
  }

  for (let index = 0; index < sortedOccurrences.length; index += 1) {
    const occurrence = sortedOccurrences[index]!
    const newStartsAt =
      fromWeekIndex > 0
        ? offsetStartsAtByWeeks(template.startsAt, index)
        : offsetStartsAtByWeeks(
            newAnchor,
            getWeekIndexFromAnchor(oldAnchor, occurrence.starts_at, schedule)
          )

    const validation = await validateBookableSlot({
      coachId,
      clientId: template.clientId,
      startsAt: newStartsAt,
      sessionPackId: template.sessionPackId,
      ignoreMinNotice: true,
      coachBooking: true,
      clientTimeZone: template.clientTimeZone,
      excludeAppointmentIds,
    })

    if (!validation.ok) {
      return {
        success: false,
        error: `Could not update all sessions: ${validation.error}`,
      }
    }

    const { error: updateError } = await supabase
      .from('coaching_appointments')
      .update({
        client_id: template.clientId,
        starts_at: newStartsAt,
        ends_at: validation.endsAt,
        location: template.location,
        session_type: template.sessionType,
        session_pack_id: template.sessionPackId,
        series_id: targetSeriesId,
      })
      .eq('id', occurrence.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    queueCoachingAppointmentGoogleSync(occurrence.id)
  }

  if (template.notifyClient !== false) {
    const when = formatAppointmentRange(
      template.startsAt,
      firstValidation.endsAt,
      coachPreferences.timezone
    )
    void notifyClientOfCoachMessage({
      clientId: template.clientId,
      coachId,
      messageBody: `Your recurring coaching sessions from ${when} onward have been updated.`,
    })
  }

  return { success: true }
}

function shouldDetachSingleOccurrenceFromSeries(options: {
  series: CoachingAppointmentSeriesScope
  appointmentStartsAt: string
  newStartsAt: string
  newClientId: string
  schedule: SeriesScheduleContext
}) {
  if (options.newClientId !== options.series.client_id) {
    return true
  }

  const weekIndex = getWeekIndexFromAnchor(
    options.series.anchor_starts_at,
    options.appointmentStartsAt,
    options.schedule
  )
  const canonicalStartsAt = offsetStartsAtByWeeks(
    options.series.anchor_starts_at,
    weekIndex
  )

  return options.newStartsAt !== canonicalStartsAt
}

export async function endCoachingAppointmentSeries(
  seriesId: string
): Promise<ActionResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: series } = await ctx.supabase
    .from('coaching_appointment_series')
    .select('id, coach_id, status')
    .eq('id', seriesId)
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (!series) {
    return { success: false, error: 'Recurring series not found.' }
  }

  if (series.status !== 'active') {
    return { success: false, error: 'This recurring series has already ended.' }
  }

  const seriesScope = await fetchCoachingAppointmentSeriesScope(
    ctx.supabase,
    seriesId,
    ctx.user.id
  )
  if (!seriesScope) {
    return { success: false, error: 'Recurring series not found.' }
  }

  const nowIso = new Date().toISOString()
  const { error: cancelError } = await cancelScheduledSeriesAppointments(
    ctx.supabase,
    ctx.user.id,
    seriesScope,
    nowIso,
    'Recurring series ended by coach'
  )

  if (cancelError) {
    return { success: false, error: cancelError.message }
  }

  const { error: seriesError } = await ctx.supabase
    .from('coaching_appointment_series')
    .update({ status: 'cancelled' })
    .eq('id', seriesId)

  if (seriesError) {
    return { success: false, error: seriesError.message }
  }

  revalidateScheduling()
  return { success: true }
}

export async function bookCoachingAppointmentAsCoach(
  values: import('@/lib/validations/session-booking').BookAppointmentValues
): Promise<ActionResult> {
  const parsed = bookAppointmentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid appointment data.' }
  }

  const access = await requireClientAccess(parsed.data.clientId)
  if (!access) {
    return { success: false, error: 'Client not found.' }
  }

  const coachPreferences = await getCoachPreferencesForUser(access.user.id)
  const repeatIndefinitely = Boolean(
    parsed.data.repeatWeekly && parsed.data.repeatIndefinitely
  )
  const repeatCount =
    parsed.data.repeatWeekly && !repeatIndefinitely && parsed.data.repeatWeeks
      ? parsed.data.repeatWeeks
      : repeatIndefinitely
        ? null
        : 1

  if (!parsed.data.repeatWeekly) {
    const result = await bookCoachAppointmentOccurrences({
      coachId: access.user.id,
      parsed: parsed.data,
      anchorStartsAt: parsed.data.startsAt,
      repeatIndefinitely: false,
      repeatCount: 1,
    })

    if (result.success) {
      revalidateScheduling()
    }

    return result
  }

  const repeatDays = resolveRepeatDaysOfWeek(
    parsed.data.startsAt,
    parsed.data.repeatDaysOfWeek,
    coachPreferences.timezone,
    parsed.data.clientTimeZone
  )

  for (const dayOfWeek of repeatDays) {
    const anchorStartsAt = computeWeeklyAnchorStartsAtForDay(
      parsed.data.startsAt,
      dayOfWeek,
      coachPreferences.timezone,
      parsed.data.clientTimeZone
    )

    const result = await bookCoachAppointmentOccurrences({
      coachId: access.user.id,
      parsed: parsed.data,
      anchorStartsAt,
      repeatIndefinitely,
      repeatCount,
    })

    if (!result.success) {
      return result
    }
  }

  revalidateScheduling()
  return { success: true }
}

async function bookCoachAppointmentOccurrences(options: {
  coachId: string
  parsed: import('@/lib/validations/session-booking').BookAppointmentValues
  anchorStartsAt: string
  repeatIndefinitely: boolean
  repeatCount: number | null
}): Promise<ActionResult> {
  const { parsed, anchorStartsAt, repeatIndefinitely, repeatCount } = options

  if (repeatIndefinitely) {
    const firstValidation = await validateBookableSlot({
      coachId: options.coachId,
      clientId: parsed.clientId,
      startsAt: anchorStartsAt,
      sessionPackId: parsed.sessionPackId,
      ignoreMinNotice: true,
      coachBooking: true,
      clientTimeZone: parsed.clientTimeZone,
    })

    if (!firstValidation.ok) {
      return { success: false, error: firstValidation.error }
    }

    const durationMinutes = Math.round(
      (new Date(firstValidation.endsAt).getTime() -
        new Date(anchorStartsAt).getTime()) /
        60_000
    )
    const location =
      parsed.location?.trim() ||
      firstValidation.settings.default_session_location

    const { data: series, error: seriesError } =
      await createCoachingAppointmentSeries(firstValidation.supabase, {
        coachId: options.coachId,
        clientId: parsed.clientId,
        anchorStartsAt,
        durationMinutes,
        location,
        preSessionNotes: parsed.notes ?? null,
        coachingType: parsed.coachingType ?? null,
        sessionType: parsed.sessionType,
        sessionPackId: firstValidation.sessionPackId,
      })

    if (seriesError || !series) {
      return {
        success: false,
        error: seriesError?.message ?? 'Could not create recurring series.',
      }
    }

    const weekZeroResult = await bookWeeklyAppointmentOccurrences({
      anchorStartsAtIso: anchorStartsAt,
      weekIndexes: [0],
      template: {
        coachId: options.coachId,
        clientId: parsed.clientId,
        location,
        preSessionNotes: parsed.notes ?? null,
        coachingType: parsed.coachingType ?? null,
        sessionType: parsed.sessionType,
        sessionPackId: firstValidation.sessionPackId,
        clientTimeZone: parsed.clientTimeZone,
        seriesId: series.id,
      },
      abortOnFailure: true,
    })

    if (!weekZeroResult.success) {
      await firstValidation.supabase
        .from('coaching_appointments')
        .delete()
        .eq('series_id', series.id)
      await firstValidation.supabase
        .from('coaching_appointment_series')
        .delete()
        .eq('id', series.id)
      return weekZeroResult
    }

    const horizonDays = computeSeriesHorizonDays(
      firstValidation.settings.booking_max_days_ahead
    )
    const horizonEnd = getSeriesHorizonEnd(new Date(), horizonDays)
    const remainingWeekIndexes = countWeekIndexesThroughHorizon(
      anchorStartsAt,
      horizonEnd
    ).filter((weekIndex) => weekIndex > 0)

    if (remainingWeekIndexes.length > 0) {
      await bookWeeklyAppointmentOccurrences({
        anchorStartsAtIso: anchorStartsAt,
        weekIndexes: remainingWeekIndexes,
        template: {
          coachId: options.coachId,
          clientId: parsed.clientId,
          location,
          preSessionNotes: parsed.notes ?? null,
          coachingType: parsed.coachingType ?? null,
          sessionType: parsed.sessionType,
          sessionPackId: firstValidation.sessionPackId,
          clientTimeZone: parsed.clientTimeZone,
          seriesId: series.id,
        },
        abortOnFailure: false,
        coachSeriesContext: {
          supabase: firstValidation.supabase,
          settings: firstValidation.settings,
          durationMinutes,
        },
      })
    }

    return { success: true }
  }

  const totalWeeks = repeatCount ?? 1

  if (totalWeeks > 1) {
    const firstValidation = await validateBookableSlot({
      coachId: options.coachId,
      clientId: parsed.clientId,
      startsAt: anchorStartsAt,
      sessionPackId: parsed.sessionPackId,
      ignoreMinNotice: true,
      coachBooking: true,
      clientTimeZone: parsed.clientTimeZone,
    })

    if (!firstValidation.ok) {
      return { success: false, error: firstValidation.error }
    }

    const durationMinutes = Math.round(
      (new Date(firstValidation.endsAt).getTime() -
        new Date(anchorStartsAt).getTime()) /
        60_000
    )
    const location =
      parsed.location?.trim() ||
      firstValidation.settings.default_session_location

    const { data: series, error: seriesError } =
      await createCoachingAppointmentSeries(firstValidation.supabase, {
        coachId: options.coachId,
        clientId: parsed.clientId,
        anchorStartsAt,
        durationMinutes,
        location,
        preSessionNotes: parsed.notes ?? null,
        coachingType: parsed.coachingType ?? null,
        sessionType: parsed.sessionType,
        sessionPackId: firstValidation.sessionPackId,
        maxWeekIndex: totalWeeks - 1,
      })

    if (seriesError || !series) {
      return {
        success: false,
        error: seriesError?.message ?? 'Could not create recurring series.',
      }
    }

    const weekIndexes = Array.from({ length: totalWeeks }, (_, weekIndex) => weekIndex)

    const weekZeroResult = await bookWeeklyAppointmentOccurrences({
      anchorStartsAtIso: anchorStartsAt,
      weekIndexes: [0],
      template: {
        coachId: options.coachId,
        clientId: parsed.clientId,
        location,
        preSessionNotes: parsed.notes ?? null,
        coachingType: parsed.coachingType ?? null,
        sessionType: parsed.sessionType,
        sessionPackId: firstValidation.sessionPackId,
        clientTimeZone: parsed.clientTimeZone,
        seriesId: series.id,
      },
      abortOnFailure: true,
    })

    if (!weekZeroResult.success) {
      await firstValidation.supabase
        .from('coaching_appointments')
        .delete()
        .eq('series_id', series.id)
      await firstValidation.supabase
        .from('coaching_appointment_series')
        .delete()
        .eq('id', series.id)
      return weekZeroResult
    }

    const remainingWeekIndexes = weekIndexes.filter((weekIndex) => weekIndex > 0)
    if (remainingWeekIndexes.length > 0) {
      await bookWeeklyAppointmentOccurrences({
        anchorStartsAtIso: anchorStartsAt,
        weekIndexes: remainingWeekIndexes,
        template: {
          coachId: options.coachId,
          clientId: parsed.clientId,
          location,
          preSessionNotes: parsed.notes ?? null,
          coachingType: parsed.coachingType ?? null,
          sessionType: parsed.sessionType,
          sessionPackId: firstValidation.sessionPackId,
          clientTimeZone: parsed.clientTimeZone,
          seriesId: series.id,
        },
        abortOnFailure: false,
        coachSeriesContext: {
          supabase: firstValidation.supabase,
          settings: firstValidation.settings,
          durationMinutes,
        },
      })
    }

    return { success: true }
  }

  let firstValidation:
    | Awaited<ReturnType<typeof validateBookableSlot>>
    | null = null

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
    const startsAtIso = offsetStartsAtByWeeks(anchorStartsAt, weekIndex)

    const validation = await validateBookableSlot({
      coachId: options.coachId,
      clientId: parsed.clientId,
      startsAt: startsAtIso,
      sessionPackId: parsed.sessionPackId,
      ignoreMinNotice: true,
      coachBooking: true,
      clientTimeZone: parsed.clientTimeZone,
    })

    if (!validation.ok) {
      return {
        success: false,
        error:
          (repeatCount ?? 1) > 1
            ? `Week ${weekIndex + 1}: ${validation.error}`
            : validation.error,
      }
    }

    if (weekIndex === 0) {
      firstValidation = validation
    }

    const { data: inserted, error } = await insertCoachingAppointment(validation.supabase, {
      coachId: options.coachId,
      clientId: parsed.clientId,
      startsAt: startsAtIso,
      endsAt: validation.endsAt,
      location:
        parsed.location?.trim() ||
        validation.settings.default_session_location,
      preSessionNotes: parsed.notes ?? null,
      coachingType: parsed.coachingType ?? null,
      sessionType: parsed.sessionType,
      sessionPackId: validation.sessionPackId,
      bookedBy: 'coach',
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (inserted?.id) {
      queueCoachingAppointmentGoogleSync(inserted.id)
    }
  }

  if (!firstValidation || !firstValidation.ok) {
    return { success: false, error: 'Unable to book session.' }
  }

  return { success: true }
}

export async function bookCoachingAppointmentAsClient(
  values: Omit<
    import('@/lib/validations/session-booking').BookAppointmentValues,
    'clientId'
  >
): Promise<ActionResult> {
  const portalCtx = await requirePortalClientContext()
  if ('error' in portalCtx) {
    return { success: false, error: portalCtx.error }
  }

  const parsed = bookAppointmentSchema.safeParse({
    ...values,
    clientId: portalCtx.client.id,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid appointment data.' }
  }

  const settings = await fetchPortalSessionBookingSettings(portalCtx.supabase)

  if (!settings.session_booking_enabled) {
    return { success: false, error: 'Session booking is not enabled by your coach.' }
  }

  const validation = await validateBookableSlot({
    coachId: portalCtx.client.coach_id,
    clientId: portalCtx.client.id,
    startsAt: parsed.data.startsAt,
    sessionPackId: parsed.data.sessionPackId,
    settings,
    clientTimeZone: parsed.data.clientTimeZone,
  })

  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  const { data: inserted, error } = await insertCoachingAppointment(
    portalCtx.supabase,
    {
      coachId: portalCtx.client.coach_id,
      clientId: portalCtx.client.id,
      startsAt: parsed.data.startsAt,
      endsAt: validation.endsAt,
      location:
        parsed.data.location?.trim() ||
        validation.settings.default_session_location,
      preSessionNotes: parsed.data.notes ?? null,
      coachingType: parsed.data.coachingType ?? null,
      sessionType: parsed.data.sessionType,
      sessionPackId: validation.sessionPackId,
      bookedBy: 'client',
    }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  if (inserted?.id) {
    queueCoachingAppointmentGoogleSync(inserted.id)
  }

  revalidateScheduling()
  return { success: true }
}

export async function cancelCoachingAppointment(
  values: import('@/lib/validations/session-booking').CancelAppointmentValues
): Promise<ActionResult> {
  const parsed = cancelAppointmentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid cancellation request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: appointment } = await supabase
    .from('coaching_appointments')
    .select(
      'id, status, session_pack_id, client_id, coach_id, starts_at, ends_at, google_calendar_event_id, series_id'
    )
    .eq('id', parsed.data.appointmentId)
    .maybeSingle()

  if (!appointment || appointment.status !== 'scheduled') {
    return { success: false, error: 'Appointment not found.' }
  }

  const cancelScope = parsed.data.cancelScope ?? 'single'
  const cancellationReason = parsed.data.cancellationReason ?? null

  if (
    cancelScope === 'this_and_future' &&
    appointment.series_id
  ) {
    const { data: series } = await supabase
      .from('coaching_appointment_series')
      .select('id, status')
      .eq('id', appointment.series_id)
      .eq('coach_id', appointment.coach_id)
      .maybeSingle()

    const seriesScope = await fetchCoachingAppointmentSeriesScope(
      supabase,
      appointment.series_id,
      appointment.coach_id
    )

    if (series?.status === 'active' && seriesScope) {
      const { error: cancelError } = await cancelScheduledSeriesAppointments(
        supabase,
        appointment.coach_id,
        seriesScope,
        appointment.starts_at,
        cancellationReason ?? 'Recurring series cancelled by coach'
      )

      if (cancelError) {
        return { success: false, error: cancelError.message }
      }

      const { error: seriesError } = await supabase
        .from('coaching_appointment_series')
        .update({ status: 'cancelled' })
        .eq('id', appointment.series_id)

      if (seriesError) {
        return { success: false, error: seriesError.message }
      }

      if (parsed.data.notifyClient !== false) {
        const coachPreferences = await getCoachPreferencesForUser(
          appointment.coach_id
        )
        const when = formatAppointmentRange(
          appointment.starts_at,
          appointment.ends_at,
          coachPreferences.timezone
        )
        void notifyClientOfCoachMessage({
          clientId: appointment.client_id,
          coachId: appointment.coach_id,
          messageBody: `Your recurring coaching sessions from ${when} onward have been cancelled.`,
        })
      }

      revalidateScheduling()
      return { success: true }
    }

    if (seriesScope) {
      const { error: cancelError } = await cancelScheduledSeriesAppointments(
        supabase,
        appointment.coach_id,
        seriesScope,
        appointment.starts_at,
        cancellationReason ?? 'Recurring series cancelled by coach'
      )

      if (cancelError) {
        return { success: false, error: cancelError.message }
      }

      revalidateScheduling()
      return { success: true }
    }
  }

  queueCoachingAppointmentGoogleRemoval({
    coachId: appointment.coach_id,
    googleCalendarEventId: appointment.google_calendar_event_id,
  })

  const { error } = await supabase
    .from('coaching_appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason,
    })
    .eq('id', parsed.data.appointmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (parsed.data.notifyClient !== false) {
    const coachPreferences = await getCoachPreferencesForUser(appointment.coach_id)
    const when = formatAppointmentRange(
      appointment.starts_at,
      appointment.ends_at,
      coachPreferences.timezone
    )
    void notifyClientOfCoachMessage({
      clientId: appointment.client_id,
      coachId: appointment.coach_id,
      messageBody: `Your coaching session on ${when} has been cancelled.`,
    })
  }

  revalidateScheduling()
  return { success: true }
}

export async function deleteCoachingAppointment(
  values: import('@/lib/validations/session-booking').DeleteAppointmentValues
): Promise<ActionResult> {
  const parsed = deleteAppointmentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid delete request.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: appointment } = await ctx.supabase
    .from('coaching_appointments')
    .select('id, coach_id, starts_at, google_calendar_event_id, series_id')
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (!appointment) {
    return { success: false, error: 'Appointment not found.' }
  }

  const deleteScope = parsed.data.deleteScope ?? 'single'

  if (deleteScope === 'this_and_future' && appointment.series_id) {
    const { data: series } = await ctx.supabase
      .from('coaching_appointment_series')
      .select('id, status')
      .eq('id', appointment.series_id)
      .eq('coach_id', ctx.user.id)
      .maybeSingle()

    const seriesScope = await fetchCoachingAppointmentSeriesScope(
      ctx.supabase,
      appointment.series_id,
      ctx.user.id
    )

    if (series?.status === 'active' && seriesScope) {
      const { error: deleteError } = await deleteScheduledSeriesAppointments(
        ctx.supabase,
        ctx.user.id,
        seriesScope,
        appointment.starts_at
      )

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      const { error: seriesError } = await ctx.supabase
        .from('coaching_appointment_series')
        .update({ status: 'cancelled' })
        .eq('id', appointment.series_id)

      if (seriesError) {
        return { success: false, error: seriesError.message }
      }

      revalidateScheduling()
      return { success: true }
    }

    if (seriesScope) {
      const { error: deleteError } = await deleteScheduledSeriesAppointments(
        ctx.supabase,
        ctx.user.id,
        seriesScope,
        appointment.starts_at
      )

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      revalidateScheduling()
      return { success: true }
    }
  }

  queueCoachingAppointmentGoogleRemoval({
    coachId: appointment.coach_id,
    googleCalendarEventId: appointment.google_calendar_event_id,
  })

  const { error } = await ctx.supabase
    .from('coaching_appointments')
    .delete()
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  return { success: true }
}

export async function updateCoachingAppointmentStatus(
  values: import('@/lib/validations/session-booking').UpdateAppointmentStatusValues
): Promise<ActionResult> {
  const parsed = updateAppointmentStatusSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid status update.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: appointment } = await ctx.supabase
    .from('coaching_appointments')
    .select(
      'id, coach_id, status, starts_at, client_id, session_pack_id, ends_at'
    )
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (!appointment) {
    return { success: false, error: 'Appointment not found.' }
  }

  const packId =
    parsed.data.sessionPackId ?? appointment.session_pack_id ?? null

  const { error } = await ctx.supabase
    .from('coaching_appointments')
    .update({
      status: parsed.data.status,
      session_pack_id: packId,
    })
    .eq('id', parsed.data.appointmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (
    (parsed.data.status === 'completed' || parsed.data.status === 'no_show') &&
    appointment.status === 'scheduled'
  ) {
    await chargeSessionPackForAppointment(ctx.supabase, packId)
  }

  if (parsed.data.status === 'completed') {
    const attendanceDate = appointment.starts_at.slice(0, 10)
    await ctx.supabase.from('client_daily_attendance').upsert(
      {
        client_id: appointment.client_id,
        coach_id: ctx.user.id,
        attendance_date: attendanceDate,
        status: 'present',
      },
      { onConflict: 'client_id,attendance_date' }
    )
    revalidatePath('/attendance')
  }

  revalidateScheduling()
  return { success: true }
}

export async function updateCoachingAppointmentNotes(
  values: import('@/lib/validations/session-booking').UpdateAppointmentNotesValues
): Promise<ActionResult> {
  const parsed = updateAppointmentNotesSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid notes.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase
    .from('coaching_appointments')
    .update({
      pre_session_notes: parsed.data.preSessionNotes ?? null,
      post_session_notes: parsed.data.postSessionNotes ?? null,
      notes: parsed.data.preSessionNotes ?? null,
    })
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  queueCoachingAppointmentGoogleSync(parsed.data.appointmentId)

  revalidateScheduling()
  return { success: true }
}

export async function rescheduleCoachingAppointment(
  values: import('@/lib/validations/session-booking').RescheduleAppointmentValues
): Promise<ActionResult> {
  const parsed = rescheduleAppointmentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid reschedule request.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: appointment } = await ctx.supabase
    .from('coaching_appointments')
    .select(
      'id, client_id, coach_id, status, location, pre_session_notes, notes, coaching_type, session_type, session_pack_id, starts_at, ends_at, google_calendar_event_id'
    )
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (!appointment || appointment.status !== 'scheduled') {
    return { success: false, error: 'Appointment not found.' }
  }

  const validation = await validateBookableSlot({
    coachId: ctx.user.id,
    clientId: appointment.client_id,
    startsAt: parsed.data.startsAt,
    sessionPackId: appointment.session_pack_id,
    ignoreMinNotice: true,
    coachBooking: true,
    clientTimeZone: parsed.data.clientTimeZone,
  })

  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  const { data: newAppointment, error: insertError } = await ctx.supabase
    .from('coaching_appointments')
    .insert({
      coach_id: ctx.user.id,
      client_id: appointment.client_id,
      starts_at: parsed.data.startsAt,
      ends_at: validation.endsAt,
      location: appointment.location,
      pre_session_notes: appointment.pre_session_notes ?? appointment.notes,
      notes: appointment.pre_session_notes ?? appointment.notes,
      coaching_type: appointment.coaching_type,
      session_type: appointment.session_type,
      session_pack_id: appointment.session_pack_id,
      booked_by: 'coach',
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (insertError || !newAppointment) {
    return { success: false, error: insertError?.message ?? 'Could not reschedule.' }
  }

  const { error: updateError } = await ctx.supabase
    .from('coaching_appointments')
    .update({
      status: 'rescheduled',
      rescheduled_to_id: newAppointment.id,
    })
    .eq('id', appointment.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  queueCoachingAppointmentGoogleRemoval({
    coachId: appointment.coach_id,
    googleCalendarEventId: appointment.google_calendar_event_id,
  })
  queueCoachingAppointmentGoogleSync(newAppointment.id)

  if (parsed.data.notifyClient !== false) {
    const coachPreferences = await getCoachPreferencesForUser(ctx.user.id)
    const previousWhen = formatAppointmentRange(
      appointment.starts_at,
      appointment.ends_at,
      coachPreferences.timezone
    )
    const newWhen = formatAppointmentRange(
      parsed.data.startsAt,
      validation.endsAt,
      coachPreferences.timezone
    )
    void notifyClientOfCoachMessage({
      clientId: appointment.client_id,
      coachId: ctx.user.id,
      messageBody: `Your session has been rescheduled from ${previousWhen} to ${newWhen}.`,
    })
  }

  revalidateScheduling()
  return { success: true }
}

export async function updateCoachingAppointment(
  values: import('@/lib/validations/session-booking').UpdateAppointmentValues
): Promise<ActionResult> {
  const parsed = updateAppointmentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid appointment data.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: appointment } = await ctx.supabase
    .from('coaching_appointments')
    .select(
      'id, client_id, coach_id, status, location, starts_at, ends_at, session_type, session_pack_id, series_id'
    )
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (!appointment || appointment.status !== 'scheduled') {
    return { success: false, error: 'Appointment not found.' }
  }

  if (parsed.data.clientId !== appointment.client_id) {
    const access = await requireClientAccess(parsed.data.clientId)
    if (!access) {
      return { success: false, error: 'Client not found.' }
    }
  }

  const clientChanged = parsed.data.clientId !== appointment.client_id
  const sessionPackId = clientChanged
    ? parsed.data.sessionPackId ?? null
    : parsed.data.sessionPackId !== undefined
      ? parsed.data.sessionPackId
      : appointment.session_pack_id

  const location = parsed.data.location?.trim() || null
  const sessionType = parsed.data.sessionType ?? appointment.session_type
  const editScope = parsed.data.editScope ?? 'single'

  if (editScope === 'this_and_future' && appointment.series_id) {
    const { data: series } = await ctx.supabase
      .from('coaching_appointment_series')
      .select('id, status')
      .eq('id', appointment.series_id)
      .eq('coach_id', ctx.user.id)
      .maybeSingle()

    const seriesScope = await fetchCoachingAppointmentSeriesScope(
      ctx.supabase,
      appointment.series_id,
      ctx.user.id
    )

    if (series?.status === 'active' && seriesScope) {
      const result = await updateScheduledSeriesAppointmentsFromWeek(
        ctx.supabase,
        ctx.user.id,
        seriesScope,
        appointment.starts_at,
        {
          clientId: parsed.data.clientId,
          startsAt: parsed.data.startsAt,
          location,
          sessionType,
          sessionPackId,
          clientTimeZone: parsed.data.clientTimeZone,
          notifyClient: parsed.data.notifyClient,
        }
      )

      if (result.success) {
        revalidateScheduling()
      }

      return result
    }
  }

  const validation = await validateBookableSlot({
    coachId: ctx.user.id,
    clientId: parsed.data.clientId,
    startsAt: parsed.data.startsAt,
    sessionPackId,
    ignoreMinNotice: true,
    coachBooking: true,
    clientTimeZone: parsed.data.clientTimeZone,
    excludeAppointmentId: appointment.id,
  })

  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  const coachPreferences = await getCoachPreferencesForUser(ctx.user.id)
  const schedule: SeriesScheduleContext = {
    timezone: coachPreferences.timezone,
  }

  let detachFromSeries = false
  if (appointment.series_id) {
    const seriesScope = await fetchCoachingAppointmentSeriesScope(
      ctx.supabase,
      appointment.series_id,
      ctx.user.id
    )

    if (seriesScope) {
      detachFromSeries = shouldDetachSingleOccurrenceFromSeries({
        series: seriesScope,
        appointmentStartsAt: appointment.starts_at,
        newStartsAt: parsed.data.startsAt,
        newClientId: parsed.data.clientId,
        schedule,
      })
    }
  }

  const { error } = await ctx.supabase
    .from('coaching_appointments')
    .update({
      client_id: parsed.data.clientId,
      starts_at: parsed.data.startsAt,
      ends_at: validation.endsAt,
      location,
      session_type: sessionType,
      session_pack_id: sessionPackId,
      ...(detachFromSeries ? { series_id: null } : {}),
    })
    .eq('id', appointment.id)

  if (error) {
    return { success: false, error: error.message }
  }

  queueCoachingAppointmentGoogleSync(appointment.id)

  const timeChanged = appointment.starts_at !== parsed.data.startsAt
  const locationChanged = (appointment.location ?? '') !== (location ?? '')

  if (
    parsed.data.notifyClient !== false &&
    (timeChanged || clientChanged || locationChanged)
  ) {
    const newWhen = formatAppointmentRange(
      parsed.data.startsAt,
      validation.endsAt,
      coachPreferences.timezone
    )
    const changes: string[] = []
    if (timeChanged) {
      const previousWhen = formatAppointmentRange(
        appointment.starts_at,
        appointment.ends_at,
        coachPreferences.timezone
      )
      changes.push(`time from ${previousWhen} to ${newWhen}`)
    }
    if (clientChanged) {
      changes.push('client assignment')
    }
    if (locationChanged) {
      changes.push(
        location
          ? `location to ${location}`
          : 'location (removed)'
      )
    }
    void notifyClientOfCoachMessage({
      clientId: parsed.data.clientId,
      coachId: ctx.user.id,
      messageBody: `Your session has been updated: ${changes.join(', ')}.`,
    })
  }

  revalidateScheduling()
  return { success: true }
}

export async function deleteSessionPack(packId: string): Promise<ActionResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase
    .from('client_session_packs')
    .delete()
    .eq('id', packId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  return { success: true }
}

export async function getSessionPackUsage(packId: string) {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false as const, error: 'You must be signed in.' }
  }

  const { fetchSessionPackUsage } = await import('@/lib/session-booking-queries')
  const usage = await fetchSessionPackUsage(ctx.supabase, packId, ctx.user.id)
  return { success: true as const, usage }
}

export async function getCoachAvailableSlots(
  dateKey: string,
  clientTimeZone?: string,
  excludeAppointmentId?: string
) {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false as const, error: 'You must be signed in.' }
  }

  const coachPreferences = await getCoachPreferencesForUser(ctx.user.id)
  const slots = await fetchCoachBookableSlotsForCoach(
    ctx.supabase,
    ctx.user.id,
    [dateKey],
    coachPreferences,
    {
      clientTimeZone,
      excludeAppointmentId,
    }
  )

  return { success: true as const, slots }
}

export async function getClientAvailableSlots(
  dateKey: string,
  clientTimeZone?: string
) {
  const portalCtx = await requirePortalClientContext()
  if ('error' in portalCtx) {
    return { success: false as const, error: portalCtx.error }
  }

  const settings = await fetchPortalSessionBookingSettings(portalCtx.supabase)

  if (!settings.session_booking_enabled) {
    return {
      success: false as const,
      error: 'Session booking is not enabled by your coach.',
    }
  }

  const coachPreferences = await getCoachPreferencesForUser(
    portalCtx.client.coach_id
  )
  const slots = await fetchAvailableSlotsForCoach(
    portalCtx.supabase,
    portalCtx.client.coach_id,
    [dateKey],
    coachPreferences,
    new Date(),
    { settings, clientTimeZone }
  )

  return { success: true as const, slots, settings }
}

export type SchedulingWeekDataResult =
  | {
      success: true
      appointments: CoachingAppointment[]
      weekKeys: string[]
      googleBlockedTimes: GoogleCalendarBlockedTime[]
      weeklyTargetsEnabled: boolean
      clientDefaults: Array<{
        id: string
        full_name: string | null
        weekly_session_target: number | null
      }>
      weekOverrides: Array<{ client_id: string; target_sessions: number }>
    }
  | { success: false; error: string }

export async function upsertClientWeeklySessionTarget(
  values: import('@/lib/validations/session-booking').ClientWeeklySessionTargetValues
): Promise<ActionResult> {
  const parsed = (
    await import('@/lib/validations/session-booking')
  ).clientWeeklySessionTargetSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid weekly session target.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const access = await requireClientAccess(parsed.data.clientId)
  if (!access) {
    return { success: false, error: 'Client not found.' }
  }

  const targetSessions = parsed.data.targetSessions
  if (targetSessions === null) {
    const { error } = await ctx.supabase
      .from('client_weekly_session_targets')
      .delete()
      .eq('coach_id', ctx.user.id)
      .eq('client_id', parsed.data.clientId)
      .eq('week_start_date', parsed.data.weekStartKey)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await ctx.supabase.from('client_weekly_session_targets').upsert(
      {
        coach_id: ctx.user.id,
        client_id: parsed.data.clientId,
        week_start_date: parsed.data.weekStartKey,
        target_sessions: targetSessions,
      },
      { onConflict: 'client_id,week_start_date' }
    )

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidateScheduling()
  return { success: true }
}

export async function updateClientWeeklySessionDefault(
  values: import('@/lib/validations/session-booking').ClientWeeklySessionDefaultValues
): Promise<ActionResult> {
  const parsed = (
    await import('@/lib/validations/session-booking')
  ).clientWeeklySessionDefaultSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid weekly session default.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const access = await requireClientAccess(parsed.data.clientId)
  if (!access) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await ctx.supabase
    .from('clients')
    .update({ weekly_session_target: parsed.data.weeklySessionTarget })
    .eq('id', parsed.data.clientId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateScheduling()
  revalidatePath('/clients')
  revalidatePath(`/clients/${parsed.data.clientId}`)
  return { success: true }
}

export async function upsertGoogleEventMarker(
  values: import('@/lib/validations/session-booking').UpsertGoogleEventMarkerValues
): Promise<ActionResult> {
  const parsed = upsertGoogleEventMarkerSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid Google event marker.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase.from('coach_google_event_markers').upsert(
    {
      coach_id: ctx.user.id,
      google_event_id: parsed.data.googleEventId,
      status: parsed.data.status,
    },
    { onConflict: 'coach_id,google_event_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/scheduling')
  return { success: true }
}

export async function clearGoogleEventMarker(
  values: import('@/lib/validations/session-booking').ClearGoogleEventMarkerValues
): Promise<ActionResult> {
  const parsed = clearGoogleEventMarkerSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid Google event marker.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase
    .from('coach_google_event_markers')
    .delete()
    .eq('coach_id', ctx.user.id)
    .eq('google_event_id', parsed.data.googleEventId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/scheduling')
  return { success: true }
}

export async function fetchSchedulingWeekData(
  weekStartKey: string
): Promise<SchedulingWeekDataResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartKey)) {
    return { success: false, error: 'Invalid week.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const coachPreferences = await getCoachPreferencesForUser(ctx.user.id)
  const weekReferenceDate = getSchedulingWeekReferenceDate(
    coachPreferences.timezone,
    weekStartKey
  )
  const { startIso, endIso, weekKeys } = getWeekAppointmentRange(
    coachPreferences.weekStartsOn,
    coachPreferences.timezone,
    weekReferenceDate
  )

  const connection = await fetchCoachGoogleCalendarConnection(
    ctx.supabase,
    ctx.user.id
  )

  const [appointments, rawGoogleBlockedTimes, settings, { data: clients }] =
    await Promise.all([
      fetchCoachingAppointments(ctx.supabase, ctx.user.id, startIso, endIso),
      connection
        ? fetchGoogleCalendarBlockedTimes(ctx.user.id, startIso, endIso)
        : Promise.resolve([] as GoogleCalendarBlockedTime[]),
      fetchCoachSessionBookingSettings(ctx.supabase, ctx.user.id),
      ctx.supabase
        .from('clients')
        .select('id, full_name, weekly_session_target')
        .eq('coach_id', ctx.user.id)
        .eq('status', 'active')
        .order('full_name'),
    ])

  const googleBlockedTimes = await attachGoogleEventMarkers(
    ctx.supabase,
    ctx.user.id,
    rawGoogleBlockedTimes
  )

  const resolvedWeekStartKey = weekKeys[0]!
  const weekOverrides = settings.weekly_session_targets_enabled
    ? await fetchClientWeeklySessionTargets(
        ctx.supabase,
        ctx.user.id,
        resolvedWeekStartKey
      )
    : []

  return {
    success: true,
    appointments,
    weekKeys,
    googleBlockedTimes,
    weeklyTargetsEnabled: settings.weekly_session_targets_enabled,
    clientDefaults: clients ?? [],
    weekOverrides,
  }
}
