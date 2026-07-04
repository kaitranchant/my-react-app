'use server'

import { defaultCoachingSessionType } from '@/lib/coaching-session-types'

import { revalidatePath } from 'next/cache'

import type { ActionResult } from '@/app/(dashboard)/attendance/actions'
import {
  computeSeriesHorizonDays,
  countWeekIndexesThroughHorizon,
  getSeriesHorizonEnd,
  getWeekIndexFromAnchor,
  offsetStartsAtByWeeks,
} from '@/lib/appointment-series'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { requireClientAccess } from '@/lib/gym-access'
import { requirePortalClientContext } from '@/lib/portal-client'
import { fetchAvailableSlotsForCoach, fetchCoachSessionBookingSettings, fetchCoachingAppointments, fetchPortalSessionBookingSettings, getSchedulingWeekReferenceDate, getWeekAppointmentRange } from '@/lib/session-booking-queries'
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
  deleteAppointmentSchema,
  rescheduleAppointmentSchema,
  sessionBookingSettingsSchema,
  sessionPackSchema,
  updateAppointmentNotesSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
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
    if (options.coachBooking) {
      const timeMin = new Date(
        new Date(options.startsAt).getTime() - 24 * 60 * 60 * 1000
      ).toISOString()
      const timeMax = new Date(
        new Date(options.startsAt).getTime() + 24 * 60 * 60 * 1000
      ).toISOString()
      const appointments = await fetchCoachingAppointments(
        supabase,
        options.coachId,
        timeMin,
        timeMax
      )
      const filteredAppointments = options.excludeAppointmentId
        ? appointments.filter(
            (appointment) => appointment.id !== options.excludeAppointmentId
          )
        : appointments
      const coachValidation = validateCoachBookableInstant({
        startsAt: options.startsAt,
        settings,
        appointments: filteredAppointments,
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

async function seriesOccurrenceExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seriesId: string,
  startsAtIso: string
) {
  const { data } = await supabase
    .from('coaching_appointments')
    .select('id')
    .eq('series_id', seriesId)
    .eq('starts_at', startsAtIso)
    .maybeSingle()

  return Boolean(data)
}

async function bookWeeklyAppointmentOccurrences(options: {
  anchorStartsAtIso: string
  weekIndexes: number[]
  template: WeeklyBookingTemplate
  abortOnFailure: boolean
  weekLabelPrefix?: string
}): Promise<ActionResult & { bookedCount?: number }> {
  const supabase = await createClient()
  let bookedCount = 0

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
        startsAtIso
      ))
    ) {
      continue
    }

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

    const { data: inserted, error } = await insertCoachingAppointment(
      validation.supabase,
      {
        coachId: options.template.coachId,
        clientId: options.template.clientId,
        startsAt: startsAtIso,
        endsAt: validation.endsAt,
        location: options.template.location,
        preSessionNotes: options.template.preSessionNotes,
        coachingType: options.template.coachingType,
        sessionType: options.template.sessionType,
        sessionPackId: validation.sessionPackId,
        bookedBy: 'coach',
        seriesId: options.template.seriesId,
      }
    )

    if (error) {
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
    status: 'active' as const,
  }

  return supabase
    .from('coaching_appointment_series')
    .insert(row)
    .select('id')
    .single()
}

async function extendCoachAppointmentSeriesHorizon(coachId: string) {
  const supabase = await createClient()
  const settings = await fetchCoachSessionBookingSettings(supabase, coachId)
  const horizonDays = computeSeriesHorizonDays(settings.booking_max_days_ahead)
  const horizonEnd = getSeriesHorizonEnd(new Date(), horizonDays)

  const { data: seriesRows } = await supabase
    .from('coaching_appointment_series')
    .select(
      'id, client_id, anchor_starts_at, location, pre_session_notes, coaching_type, session_type, session_pack_id'
    )
    .eq('coach_id', coachId)
    .eq('status', 'active')

  for (const series of seriesRows ?? []) {
    const { data: latestAppointment } = await supabase
      .from('coaching_appointments')
      .select('starts_at')
      .eq('series_id', series.id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastWeekIndex = latestAppointment
      ? getWeekIndexFromAnchor(series.anchor_starts_at, latestAppointment.starts_at)
      : -1

    const weekIndexes = countWeekIndexesThroughHorizon(
      series.anchor_starts_at,
      horizonEnd
    ).filter((weekIndex) => weekIndex > lastWeekIndex)

    if (weekIndexes.length === 0) continue

    await bookWeeklyAppointmentOccurrences({
      anchorStartsAtIso: series.anchor_starts_at,
      weekIndexes,
      template: {
        coachId,
        clientId: series.client_id,
        location: series.location,
        preSessionNotes: series.pre_session_notes,
        coachingType: series.coaching_type,
        sessionType: series.session_type,
        sessionPackId: series.session_pack_id,
        seriesId: series.id,
      },
      abortOnFailure: false,
    })
  }
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
  seriesId: string,
  fromStartsAtIso: string
) {
  const { data: toDelete } = await supabase
    .from('coaching_appointments')
    .select('id, google_calendar_event_id')
    .eq('series_id', seriesId)
    .eq('status', 'scheduled')
    .gte('starts_at', fromStartsAtIso)

  for (const scheduledAppointment of toDelete ?? []) {
    queueCoachingAppointmentGoogleRemoval({
      coachId,
      googleCalendarEventId: scheduledAppointment.google_calendar_event_id,
    })
  }

  return supabase
    .from('coaching_appointments')
    .delete()
    .eq('series_id', seriesId)
    .eq('status', 'scheduled')
    .gte('starts_at', fromStartsAtIso)
}

async function cancelScheduledSeriesAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  seriesId: string,
  fromStartsAtIso: string,
  cancellationReason: string
) {
  const { data: toCancel } = await supabase
    .from('coaching_appointments')
    .select('id, google_calendar_event_id')
    .eq('series_id', seriesId)
    .eq('status', 'scheduled')
    .gte('starts_at', fromStartsAtIso)

  for (const scheduledAppointment of toCancel ?? []) {
    queueCoachingAppointmentGoogleRemoval({
      coachId,
      googleCalendarEventId: scheduledAppointment.google_calendar_event_id,
    })
  }

  const nowIso = new Date().toISOString()
  return supabase
    .from('coaching_appointments')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancellation_reason: cancellationReason,
    })
    .eq('series_id', seriesId)
    .eq('status', 'scheduled')
    .gte('starts_at', fromStartsAtIso)
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

  const nowIso = new Date().toISOString()
  const { error: cancelError } = await cancelScheduledSeriesAppointments(
    ctx.supabase,
    ctx.user.id,
    seriesId,
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

    const horizonDays = computeSeriesHorizonDays(
      firstValidation.settings.booking_max_days_ahead
    )
    const weekIndexes = countWeekIndexesThroughHorizon(
      anchorStartsAt,
      getSeriesHorizonEnd(new Date(), horizonDays)
    )

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
      })
    }

    return { success: true }
  }

  let firstValidation:
    | Awaited<ReturnType<typeof validateBookableSlot>>
    | null = null

  for (let weekIndex = 0; weekIndex < (repeatCount ?? 1); weekIndex++) {
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

    if (series?.status === 'active') {
      const { error: cancelError } = await cancelScheduledSeriesAppointments(
        supabase,
        appointment.coach_id,
        appointment.series_id,
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

    if (series?.status === 'active') {
      const { error: deleteError } = await deleteScheduledSeriesAppointments(
        ctx.supabase,
        ctx.user.id,
        appointment.series_id,
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

    const { error: deleteError } = await deleteScheduledSeriesAppointments(
      ctx.supabase,
      ctx.user.id,
      appointment.series_id,
      appointment.starts_at
    )

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    revalidateScheduling()
    return { success: true }
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
      'id, client_id, coach_id, status, location, starts_at, ends_at, session_type, session_pack_id'
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

  const validation = await validateBookableSlot({
    coachId: ctx.user.id,
    clientId: parsed.data.clientId,
    startsAt: parsed.data.startsAt,
    sessionPackId,
    ignoreMinNotice: true,
    clientTimeZone: parsed.data.clientTimeZone,
    excludeAppointmentId: appointment.id,
  })

  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  const location = parsed.data.location?.trim() || null
  const sessionType = parsed.data.sessionType ?? appointment.session_type

  const { error } = await ctx.supabase
    .from('coaching_appointments')
    .update({
      client_id: parsed.data.clientId,
      starts_at: parsed.data.startsAt,
      ends_at: validation.endsAt,
      location,
      session_type: sessionType,
      session_pack_id: sessionPackId,
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
    const coachPreferences = await getCoachPreferencesForUser(ctx.user.id)
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
  const slots = await fetchAvailableSlotsForCoach(
    ctx.supabase,
    ctx.user.id,
    [dateKey],
    coachPreferences,
    new Date(),
    {
      ignoreMinNotice: true,
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
  | { success: true; appointments: CoachingAppointment[]; weekKeys: string[] }
  | { success: false; error: string }

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

  await extendCoachAppointmentSeriesHorizon(ctx.user.id)

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
  const appointments = await fetchCoachingAppointments(
    ctx.supabase,
    ctx.user.id,
    startIso,
    endIso
  )

  return { success: true, appointments, weekKeys }
}
