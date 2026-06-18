'use server'

import { getMonthDateRange } from '@/lib/calendar'
import { requirePortalClientContext } from '@/lib/portal-client'
import { fetchWorkoutWithExercises } from '@/lib/scheduled-workout-queries'
import { dateKeySchema } from '@/lib/validations/calendar'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
} from 'app/types/database'

export type PortalCalendarMonthData = {
  days: CalendarDaySummary[]
  selectedWorkout: ClientScheduledWorkoutWithExercises | null
}

export async function getPortalCalendarMonthData(
  year: number,
  month: number,
  selectedDate: string
): Promise<
  | { success: true; data: PortalCalendarMonthData }
  | { success: false; error: string }
> {
  const parsedDate = dateKeySchema.safeParse(selectedDate)
  if (!parsedDate.success) {
    return { success: false, error: 'Invalid date.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client } = ctx
  const { start, end } = getMonthDateRange(year, month)

  const [{ data: days, error: daysError }, { data: selected, error: selectedError }] =
    await Promise.all([
      supabase
        .from('client_scheduled_workouts')
        .select('id, scheduled_date, name, status, started_at')
        .eq('client_id', client.id)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date', { ascending: true }),
      supabase
        .from('client_scheduled_workouts')
        .select('id')
        .eq('client_id', client.id)
        .eq('scheduled_date', parsedDate.data)
        .maybeSingle(),
    ])

  if (daysError) {
    return { success: false, error: daysError.message }
  }
  if (selectedError) {
    return { success: false, error: selectedError.message }
  }

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selected) {
    selectedWorkout = await fetchWorkoutWithExercises(supabase, selected.id)
    if (selectedWorkout && selectedWorkout.client_id !== client.id) {
      selectedWorkout = null
    }
  }

  return {
    success: true,
    data: {
      days: (days ?? []) as CalendarDaySummary[],
      selectedWorkout,
    },
  }
}
