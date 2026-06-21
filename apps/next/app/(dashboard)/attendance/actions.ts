'use server'

import { revalidatePath } from 'next/cache'

import { requireClientAccess } from '@/lib/gym-access'
import {
  markAllClientsPresentSchema,
  updateClientDailyAttendanceSchema,
} from '@/lib/validations/attendance'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidateAttendance() {
  revalidatePath('/attendance')
}

export async function updateClientDailyAttendance(
  clientId: string,
  date: string,
  status: 'present' | 'late' | 'absent' | 'excused' | null,
  options?: {
    notes?: string | null
    coachingType?: 'online' | 'in_person' | 'hybrid' | 'none' | null
  }
): Promise<ActionResult> {
  const parsed = updateClientDailyAttendanceSchema.safeParse({
    clientId,
    date,
    status,
    notes: options?.notes,
    coachingType: options?.coachingType,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid attendance data.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  if (parsed.data.status === null) {
    const { error } = await ctx.supabase
      .from('client_daily_attendance')
      .delete()
      .eq('client_id', clientId)
      .eq('attendance_date', date)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateAttendance()
    return { success: true }
  }

  const coachingType =
    parsed.data.coachingType === 'none' || parsed.data.coachingType === undefined
      ? null
      : parsed.data.coachingType

  const { error } = await ctx.supabase.from('client_daily_attendance').upsert(
    {
      client_id: clientId,
      coach_id: ctx.user.id,
      attendance_date: date,
      status: parsed.data.status,
      notes: parsed.data.notes ?? undefined,
      coaching_type: coachingType,
    },
    { onConflict: 'client_id,attendance_date' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateAttendance()
  return { success: true }
}

export async function markAllClientsPresent(
  date: string,
  clientIds: string[]
): Promise<ActionResult> {
  const parsed = markAllClientsPresentSchema.safeParse({ date, clientIds })
  if (!parsed.success) {
    return { success: false, error: 'Invalid request.' }
  }

  for (const clientId of parsed.data.clientIds) {
    const ctx = await requireClientAccess(clientId)
    if (!ctx) {
      return { success: false, error: 'Client not found.' }
    }

    const { error } = await ctx.supabase.from('client_daily_attendance').upsert(
      {
        client_id: clientId,
        coach_id: ctx.user.id,
        attendance_date: date,
        status: 'present' as const,
      },
      { onConflict: 'client_id,attendance_date' }
    )

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidateAttendance()
  return { success: true }
}
