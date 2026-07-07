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

export async function getPortalCalendarMonthSummaries(
  year: number,
  month: number
): Promise<
  | { success: true; days: CalendarDaySummary[] }
  | { success: false; error: string }
> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client } = ctx
  const { start, end } = getMonthDateRange(year, month)
  const { data: days, error: daysError } = await supabase
    .from('client_scheduled_workouts')
    .select('id, scheduled_date, name, status, started_at')
    .eq('client_id', client.id)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date', { ascending: true })

  if (daysError) {
    return { success: false, error: daysError.message }
  }

  return { success: true, days: (days ?? []) as CalendarDaySummary[] }
}

export async function getPortalWorkoutWithExercises(workoutId: string): Promise<
  | { success: true; workout: ClientScheduledWorkoutWithExercises }
  | { success: false; error: string }
> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client } = ctx
  const { data: ownedWorkout, error: workoutError } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('client_id', client.id)
    .maybeSingle()

  if (workoutError || !ownedWorkout) {
    return { success: false, error: 'Workout not found.' }
  }

  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== client.id) {
    return { success: false, error: 'Workout not found.' }
  }

  return { success: true, workout }
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

  const summariesResult = await getPortalCalendarMonthSummaries(year, month)
  if (!summariesResult.success) {
    return summariesResult
  }

  const selectedSummary = summariesResult.days.find(
    (day) => day.scheduled_date === parsedDate.data
  )

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selectedSummary) {
    const workoutResult = await getPortalWorkoutWithExercises(selectedSummary.id)
    if (workoutResult.success) {
      selectedWorkout = workoutResult.workout
    }
  }

  return {
    success: true,
    data: {
      days: summariesResult.days,
      selectedWorkout,
    },
  }
}
