import { z } from 'zod'

import { ALL_WEEKDAY_VALUES } from '@/lib/calendar'

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format')

import { coachingSessionTypes } from '@/lib/coaching-session-types'

export const sessionBookingSettingsSchema = z.object({
  sessionBookingEnabled: z.boolean(),
  defaultSessionDurationMinutes: z.number().int().min(15).max(240),
  bookingBufferMinutes: z.number().int().min(0).max(120),
  bookingMinNoticeHours: z.number().int().min(0).max(168),
  bookingMaxDaysAhead: z.number().int().min(1).max(365),
  defaultSessionLocation: z.string().max(500).optional(),
  bookingRequiresSessionPack: z.boolean(),
  appointmentReminderHours: z.number().int().min(1).max(168),
})

export type SessionBookingSettingsValues = z.infer<
  typeof sessionBookingSettingsSchema
>

export const availabilityRuleSchema = z
  .object({
    dayOfWeek: z.coerce
      .number()
      .int()
      .refine((value) => ALL_WEEKDAY_VALUES.includes(value as 0 | 1 | 2 | 3 | 4 | 5 | 6)),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })

export type AvailabilityRuleValues = z.infer<typeof availabilityRuleSchema>

export const availabilityExceptionSchema = z
  .object({
    exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    exceptionType: z.enum(['blocked', 'extra_hours']),
    startTime: timeString.optional().nullable(),
    endTime: timeString.optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (value) => {
      const hasStart = Boolean(value.startTime)
      const hasEnd = Boolean(value.endTime)
      if (hasStart !== hasEnd) return false
      if (hasStart && value.startTime! >= value.endTime!) return false
      return true
    },
    { message: 'Provide both start and end times, or leave both empty for all day' }
  )

export type AvailabilityExceptionValues = z.infer<
  typeof availabilityExceptionSchema
>

export const sessionPackSchema = z.object({
  clientId: z.string().uuid(),
  label: z.string().min(1).max(120),
  totalSessions: z.coerce.number().int().min(1).max(999),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  priceCents: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type SessionPackValues = z.infer<typeof sessionPackSchema>

export const bookAppointmentSchema = z
  .object({
    clientId: z.string().uuid(),
    startsAt: z.string().datetime({ offset: true }),
    sessionPackId: z.string().uuid().optional().nullable(),
    location: z.string().max(500).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    coachingType: z.enum(['online', 'in_person', 'hybrid']).optional().nullable(),
    sessionType: z.enum(coachingSessionTypes).optional(),
    repeatWeekly: z.boolean().optional(),
    repeatWeeks: z.coerce.number().int().min(2).max(52).optional(),
    repeatIndefinitely: z.boolean().optional(),
    clientTimeZone: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.repeatWeekly || data.repeatIndefinitely) return
    if (!data.repeatWeeks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter how many weeks to repeat, or choose ongoing repeat.',
        path: ['repeatWeeks'],
      })
    }
  })

export type BookAppointmentValues = z.infer<typeof bookAppointmentSchema>

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  cancellationReason: z.string().max(500).optional().nullable(),
  notifyClient: z.boolean().optional(),
  cancelScope: z.enum(['single', 'this_and_future']).optional(),
})

export type CancelAppointmentValues = z.infer<typeof cancelAppointmentSchema>

export const deleteAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
})

export type DeleteAppointmentValues = z.infer<typeof deleteAppointmentSchema>

export const updateAppointmentStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum([
    'scheduled',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled',
  ]),
  sessionPackId: z.string().uuid().optional().nullable(),
})

export const updateAppointmentNotesSchema = z.object({
  appointmentId: z.string().uuid(),
  preSessionNotes: z.string().max(2000).optional().nullable(),
  postSessionNotes: z.string().max(2000).optional().nullable(),
})

export type UpdateAppointmentNotesValues = z.infer<
  typeof updateAppointmentNotesSchema
>

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  notifyClient: z.boolean().optional(),
  clientTimeZone: z.string().min(1).optional(),
})

export type RescheduleAppointmentValues = z.infer<
  typeof rescheduleAppointmentSchema
>

export type UpdateAppointmentStatusValues = z.infer<
  typeof updateAppointmentStatusSchema
>

export const schedulingViewModes = ['week', 'availability', 'packs'] as const
export type SchedulingViewMode = (typeof schedulingViewModes)[number]

export function parseSchedulingViewMode(
  value: string | undefined
): SchedulingViewMode {
  if (value && schedulingViewModes.includes(value as SchedulingViewMode)) {
    return value as SchedulingViewMode
  }
  return 'week'
}
