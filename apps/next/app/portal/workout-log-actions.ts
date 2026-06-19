'use server'

import { revalidatePath } from 'next/cache'

import { requirePortalClientContext, type PortalClientContext } from '@/lib/portal-client'
import {
  evaluateAndPersistWorkoutPrs,
  fetchPersonalBestsByExerciseIds,
  type CompleteWorkoutResult,
} from '@/lib/pr-records'
import {
  fetchLogSets,
  fetchPreviousSetsForExercises,
  fetchWorkoutWithExercises,
} from '@/lib/scheduled-workout-queries'
import {
  saveWorkoutLogSetsSchema,
  type WorkoutLogSetValues,
} from '@/lib/validations/workout-log'
import type { WorkoutLogData } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type WorkoutLogResult =
  | { success: true; data: WorkoutLogData }
  | { success: false; error: string }

function revalidatePortal() {
  revalidatePath('/portal', 'layout')
  revalidatePath('/portal/progress')
}

type PortalWorkoutContext = PortalClientContext & {
  workout: NonNullable<Awaited<ReturnType<typeof fetchWorkoutWithExercises>>>
}

type PortalWorkoutError = { error: string }

function isPortalWorkoutError(
  ctx: PortalWorkoutContext | PortalWorkoutError
): ctx is PortalWorkoutError {
  return 'error' in ctx
}

async function requirePortalWorkout(
  workoutId: string
): Promise<PortalWorkoutContext | PortalWorkoutError> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { error: ctx.error }
  }

  const workout = await fetchWorkoutWithExercises(ctx.supabase, workoutId)
  if (!workout || workout.client_id !== ctx.client.id) {
    return { error: 'Workout not found.' }
  }

  return { ...ctx, workout }
}

export async function getPortalWorkoutLogData(
  workoutId: string
): Promise<WorkoutLogResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client, workout } = ctx
  const { logSets, error: logSetsError } = await fetchLogSets(supabase, workout.id)
  if (logSetsError) {
    return { success: false, error: logSetsError }
  }

  const libraryExerciseIds = Array.from(
    new Set(workout.exercises.map((row) => row.exercise_id))
  )
  const { previousSetsByExerciseId, previousSessionDateByExerciseId } =
    await fetchPreviousSetsForExercises(
      supabase,
      client.id,
      workout.id,
      libraryExerciseIds
    )
  const personalBestsByExerciseId = await fetchPersonalBestsByExerciseIds(
    supabase,
    client.id,
    libraryExerciseIds
  )

  return {
    success: true,
    data: {
      ...workout,
      logSets,
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      personalBestsByExerciseId,
    },
  }
}

export async function startPortalWorkoutLog(
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, workout } = ctx

  if (workout.status === 'completed' || workout.status === 'skipped') {
    return { success: false, error: 'This workout is already finished.' }
  }

  if (workout.status === 'in_progress') {
    return { success: true }
  }

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'in_progress',
      started_at: workout.started_at ?? new Date().toISOString(),
    })
    .eq('id', workout.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortal()
  return { success: true }
}

export async function stopPortalWorkoutLog(
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, workout } = ctx

  if (workout.status !== 'in_progress') {
    return { success: false, error: 'This workout is not in progress.' }
  }

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({ status: 'scheduled' })
    .eq('id', workout.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortal()
  return { success: true }
}

export async function savePortalWorkoutLogSets(
  workoutId: string,
  sets: WorkoutLogSetValues[],
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const parsed = saveWorkoutLogSetsSchema.safeParse({ workoutId, sets })
  if (!parsed.success) {
    return { success: false, error: 'Invalid workout log data.' }
  }

  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, workout } = ctx
  const exerciseIds = new Set(workout.exercises.map((row) => row.id))

  for (const set of parsed.data.sets) {
    if (!exerciseIds.has(set.scheduledExerciseId)) {
      return { success: false, error: 'Exercise not found in this workout.' }
    }
  }

  for (const set of parsed.data.sets) {
    const row = {
      scheduled_workout_id: workout.id,
      scheduled_exercise_id: set.scheduledExerciseId,
      set_number: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      duration_seconds: set.durationSeconds,
      bar_speed: set.barSpeed,
      peak_power: set.peakPower,
      completed: set.completed,
      notes: set.notes,
    }

    const { error } = await supabase.from('workout_log_sets').upsert(row, {
      onConflict: 'scheduled_exercise_id,set_number',
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  const setsByExercise = new Map<string, number[]>()
  for (const set of parsed.data.sets) {
    const existing = setsByExercise.get(set.scheduledExerciseId) ?? []
    existing.push(set.setNumber)
    setsByExercise.set(set.scheduledExerciseId, existing)
  }

  for (const exercise of workout.exercises) {
    const keptSetNumbers = setsByExercise.get(exercise.id) ?? []

    if (keptSetNumbers.length === 0) {
      const { error } = await supabase
        .from('workout_log_sets')
        .delete()
        .eq('scheduled_exercise_id', exercise.id)

      if (error) {
        return { success: false, error: error.message }
      }
      continue
    }

    const maxSetNumber = Math.max(...keptSetNumbers)
    const { error } = await supabase
      .from('workout_log_sets')
      .delete()
      .eq('scheduled_exercise_id', exercise.id)
      .gt('set_number', maxSetNumber)

    if (error) {
      return { success: false, error: error.message }
    }
  }

  if (options?.revalidate !== false) {
    revalidatePortal()
  }
  return { success: true }
}

export async function completePortalWorkoutLog(
  workoutId: string
): Promise<CompleteWorkoutResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client, workout } = ctx
  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('coach_id')
    .eq('id', client.id)
    .maybeSingle()

  if (clientError || !clientRow?.coach_id) {
    return { success: false, error: 'Client coach not found.' }
  }

  const achievedAt = new Date().toISOString()
  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'completed',
      completed_at: achievedAt,
      started_at: workout.started_at ?? achievedAt,
    })
    .eq('id', workout.id)

  if (error) {
    return { success: false, error: error.message }
  }

  const { logSets } = await fetchLogSets(supabase, workout.id)
  const newPrs = await evaluateAndPersistWorkoutPrs(supabase, {
    clientId: client.id,
    coachId: clientRow.coach_id,
    workout,
    logSets,
    achievedAt,
  })

  revalidatePortal()
  return { success: true, newPrs }
}

export async function skipPortalWorkoutLog(
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, workout } = ctx

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
    })
    .eq('id', workout.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortal()
  return { success: true }
}

export async function reopenPortalWorkoutLog(
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, workout } = ctx

  if (workout.status !== 'completed' && workout.status !== 'skipped') {
    return { success: false, error: 'Only finished workouts can be reopened.' }
  }

  const hasLoggedSets = (await fetchLogSets(supabase, workout.id)).logSets.length > 0

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'scheduled',
      completed_at: null,
      ...(hasLoggedSets || workout.started_at ? {} : { started_at: null }),
    })
    .eq('id', workout.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortal()
  return { success: true }
}
