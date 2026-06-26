'use server'

import { revalidatePath } from 'next/cache'

import type { ActionResult } from '@/app/(dashboard)/attendance/actions'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { requireClientAccess } from '@/lib/gym-access'
import { requirePortalClientContext } from '@/lib/portal-client'
import { fetchAvailableSlotsForCoach, fetchCoachSessionBookingSettings, fetchPortalSessionBookingSettings } from '@/lib/session-booking-queries'
import { getDateKeyFromInstant } from '@/lib/session-booking-slots'
import { sessionBookingSettingsToRow } from '@/lib/session-booking-types'
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
  updateAppointmentStatusSchema,
} from '@/lib/validations/session-booking'
import { notifyClientOfCoachMessage } from '@/lib/notifications/notify-client-coach-message'
import { formatAppointmentRange } from '@/lib/session-booking-slots'

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
  settings?: Awaited<ReturnType<typeof fetchCoachSessionBookingSettings>>
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
  const dateKey = getDateKeyFromInstant(options.startsAt, coachPreferences.timezone)

  const slots = await fetchAvailableSlotsForCoach(
    supabase,
    options.coachId,
    [dateKey],
    coachPreferences,
    new Date(),
    { ignoreMinNotice: options.ignoreMinNotice, settings }
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
    sessionPackId: string | null
    bookedBy: 'coach' | 'client'
  }
) {
  return supabase.from('coaching_appointments').insert({
    coach_id: values.coachId,
    client_id: values.clientId,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    location: values.location,
    pre_session_notes: values.preSessionNotes,
    notes: values.preSessionNotes,
    coaching_type: values.coachingType ?? null,
    session_pack_id: values.sessionPackId,
    booked_by: values.bookedBy,
    status: 'scheduled',
  })
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

  const repeatCount =
    parsed.data.repeatWeekly && parsed.data.repeatWeeks
      ? parsed.data.repeatWeeks
      : 1

  let firstValidation:
    | Awaited<ReturnType<typeof validateBookableSlot>>
    | null = null

  for (let weekIndex = 0; weekIndex < repeatCount; weekIndex++) {
    const startsAt = new Date(parsed.data.startsAt)
    startsAt.setDate(startsAt.getDate() + weekIndex * 7)
    const startsAtIso = startsAt.toISOString()

    const validation = await validateBookableSlot({
      coachId: access.user.id,
      clientId: parsed.data.clientId,
      startsAt: startsAtIso,
      sessionPackId: parsed.data.sessionPackId,
      ignoreMinNotice: true,
    })

    if (!validation.ok) {
      return {
        success: false,
        error:
          repeatCount > 1
            ? `Week ${weekIndex + 1}: ${validation.error}`
            : validation.error,
      }
    }

    if (weekIndex === 0) {
      firstValidation = validation
    }

    const { error } = await insertCoachingAppointment(validation.supabase, {
      coachId: access.user.id,
      clientId: parsed.data.clientId,
      startsAt: startsAtIso,
      endsAt: validation.endsAt,
      location:
        parsed.data.location?.trim() ||
        validation.settings.default_session_location,
      preSessionNotes: parsed.data.notes ?? null,
      coachingType: parsed.data.coachingType ?? null,
      sessionPackId: validation.sessionPackId,
      bookedBy: 'coach',
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  if (!firstValidation || !firstValidation.ok) {
    return { success: false, error: 'Unable to book session.' }
  }

  revalidateScheduling()
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
  })

  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  const { error } = await portalCtx.supabase.from('coaching_appointments').insert({
    coach_id: portalCtx.client.coach_id,
    client_id: portalCtx.client.id,
    starts_at: parsed.data.startsAt,
    ends_at: validation.endsAt,
    location:
      parsed.data.location?.trim() ||
      validation.settings.default_session_location,
    pre_session_notes: parsed.data.notes ?? null,
    notes: parsed.data.notes ?? null,
    coaching_type: parsed.data.coachingType ?? null,
    session_pack_id: validation.sessionPackId,
    booked_by: 'client',
    status: 'scheduled',
  })

  if (error) {
    return { success: false, error: error.message }
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
    .select('id, status, session_pack_id, client_id, coach_id, starts_at, ends_at')
    .eq('id', parsed.data.appointmentId)
    .maybeSingle()

  if (!appointment || appointment.status !== 'scheduled') {
    return { success: false, error: 'Appointment not found.' }
  }

  const { error } = await supabase
    .from('coaching_appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.cancellationReason ?? null,
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
    .select('id')
    .eq('id', parsed.data.appointmentId)
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (!appointment) {
    return { success: false, error: 'Appointment not found.' }
  }

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
      'id, client_id, coach_id, status, location, pre_session_notes, notes, coaching_type, session_pack_id, starts_at, ends_at'
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

export async function getCoachAvailableSlots(dateKey: string) {
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
    { ignoreMinNotice: true }
  )

  return { success: true as const, slots }
}

export async function getClientAvailableSlots(dateKey: string) {
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
    { settings }
  )

  return { success: true as const, slots, settings }
}
