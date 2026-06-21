import { z } from 'zod'

import { clientCoachingTypes } from '@/lib/validations/client'
import { teamEventAttendanceStatuses } from '@/lib/validations/team'

export const updateClientDailyAttendanceSchema = z.object({
  clientId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(teamEventAttendanceStatuses).nullable(),
  notes: z.string().trim().max(500).nullable().optional(),
  coachingType: z
    .union([z.enum(clientCoachingTypes), z.literal('none')])
    .nullable()
    .optional(),
})

export type UpdateClientDailyAttendanceValues = z.infer<
  typeof updateClientDailyAttendanceSchema
>

export const markAllClientsPresentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientIds: z.array(z.string().uuid()).min(1),
})

export type MarkAllClientsPresentValues = z.infer<
  typeof markAllClientsPresentSchema
>

export type AttendanceViewMode = 'daily' | 'weekly'

export function parseAttendanceViewMode(
  value: string | undefined
): AttendanceViewMode {
  return value === 'weekly' ? 'weekly' : 'daily'
}
