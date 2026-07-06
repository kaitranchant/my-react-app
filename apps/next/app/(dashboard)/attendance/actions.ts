'use server'

import { revalidatePath } from 'next/cache'

import { requireClientAccess } from '@/lib/gym-access'
import {
  fetchAttendanceDateData,
  type AttendanceDateData,
  type AttendanceScopeData,
} from '@/lib/attendance-page-data'
import { createClient } from '@/lib/supabase/server'
import {
  markAllClientsPresentSchema,
  updateClientDailyAttendanceSchema,
} from '@/lib/validations/attendance'
import type { AttendanceViewMode } from '@/lib/validations/attendance'
import type { WeekStartsOn } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidateAttendance() {
  revalidatePath('/attendance')
}

export async function loadAttendanceDateData(input: {
  date: string
  view: AttendanceViewMode
  weekStartsOn: WeekStartsOn
  scopeData: AttendanceScopeData
  userId: string
}): Promise<AttendanceDateData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== input.userId) {
    throw new Error('Unauthorized')
  }

  return fetchAttendanceDateData({
    supabase,
    userId: user.id,
    date: input.date,
    view: input.view,
    weekStartsOn: input.weekStartsOn,
    scopeData: input.scopeData,
  })
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

type AttendanceSnapshot = {
  clientId: string
  status: 'present' | 'late' | 'absent' | 'excused' | null
  notes?: string | null
  coachingType?: 'online' | 'in_person' | 'hybrid' | 'none' | null
}

export async function restoreClientDailyAttendanceBatch(
  date: string,
  snapshots: AttendanceSnapshot[]
): Promise<ActionResult> {
  for (const snapshot of snapshots) {
    const result = await updateClientDailyAttendance(
      snapshot.clientId,
      date,
      snapshot.status,
      {
        notes: snapshot.notes,
        coachingType: snapshot.coachingType,
      }
    )
    if (!result.success) {
      return result
    }
  }

  return { success: true }
}
