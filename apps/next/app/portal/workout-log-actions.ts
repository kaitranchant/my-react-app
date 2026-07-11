'use server'

import { revalidatePath } from 'next/cache'

import { notifyCoachOfClientPrs } from '@/lib/notifications/notify-coach-prs'
import { requirePortalClientContext, type PortalClientContext } from '@/lib/portal-client'
import {
  evaluateAndPersistWorkoutPrs,
  fetchPersonalBestsByExerciseIds,
  type CompleteWorkoutResult,
} from '@/lib/pr-records'
import {
  fetchExerciseHistory,
  fetchLogSets,
  fetchPreviousSetsForExercises,
  fetchWorkoutWithExercises,
} from '@/lib/scheduled-workout-queries'
import {
  exerciseLogNotesSchema,
  saveWorkoutLogSetsSchema,
  type WorkoutLogSetValues,
} from '@/lib/validations/workout-log'
import { syncWorkoutLogSetsForExercises } from '@/lib/workout-log-set-sync'
import type { WorkoutLogData } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type WorkoutLogResult =
  | { success: true; data: WorkoutLogData }
  | { success: false; error: string }

function revalidatePortal() {
  revalidatePath('/portal/workouts')
  revalidatePath('/portal/progress')
  revalidatePath('/portal')
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
  const [
    {
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      previousSessionCoachNotesByExerciseId,
    },
    personalBestsByExerciseId,
  ] = await Promise.all([
    fetchPreviousSetsForExercises(
      supabase,
      client.id,
      workout.id,
      libraryExerciseIds
    ),
    fetchPersonalBestsByExerciseIds(supabase, client.id, libraryExerciseIds),
  ])

  return {
    success: true,
    data: {
      ...workout,
      logSets,
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      previousSessionCoachNotesByExerciseId,
      personalBestsByExerciseId,
      progressiveOverloadEnabled: client.progressive_overload_enabled ?? false,
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
    const { error } = await supabase
      .from('client_scheduled_workouts')
      .update({ status: 'scheduled' })
      .eq('id', workout.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePortal()
  }

  return { success: true }
}

export async function stopPortalWorkoutLog(
  workoutId: string,
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client } = ctx

  const { data: workout, error: workoutError } = await supabase
    .from('client_scheduled_workouts')
    .select('id, status, completed_at')
    .eq('id', workoutId)
    .eq('client_id', client.id)
    .maybeSingle()

  if (workoutError || !workout) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status === 'in_progress' && !workout.completed_at) {
    const { error } = await supabase
      .from('client_scheduled_workouts')
      .update({ status: 'scheduled' })
      .eq('id', workout.id)

    if (error) {
      return { success: false, error: error.message }
    }

    if (options?.revalidate !== false) {
      revalidatePortal()
    }
  }

  return { success: true }
}

export async function savePortalWorkoutLogSets(
  workoutId: string,
  sets: WorkoutLogSetValues[],
  options?: {
    revalidate?: boolean
    syncSetDeletions?: boolean
  }
): Promise<ActionResult> {
  const parsed = saveWorkoutLogSetsSchema.safeParse({
    workoutId,
    sets,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid workout log data.' }
  }

  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, workout } = ctx
  const exerciseIds = new Set(workout.exercises.map((row) => row.id))

  if (workout.status === 'completed' || workout.status === 'skipped') {
    return { success: true }
  }

  for (const set of parsed.data.sets) {
    if (!exerciseIds.has(set.scheduledExerciseId)) {
      return { success: false, error: 'Exercise not found in this workout.' }
    }
  }

  const rows = parsed.data.sets.map((set) => ({
    scheduled_workout_id: workout.id,
    scheduled_exercise_id: set.scheduledExerciseId,
    set_number: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    duration_seconds: set.durationSeconds,
    distance_meters: set.distanceMeters,
    bar_speed: set.barSpeed,
    peak_power: set.peakPower,
    rpe: set.rpe,
    completed: set.completed,
    notes: set.notes,
  }))

  if (rows.length > 0) {
    const { error } = await supabase.from('workout_log_sets').upsert(rows, {
      onConflict: 'scheduled_exercise_id,set_number',
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  if (options?.syncSetDeletions) {
    const syncResult = await syncWorkoutLogSetsForExercises(
      supabase,
      workout.id,
      parsed.data.sets,
      exerciseIds
    )
    if (!syncResult.success) {
      return syncResult
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

  const { supabase, workout } = ctx

  if (workout.status === 'completed') {
    return { success: true, newPrs: [] }
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

  revalidatePortal()
  return { success: true, newPrs: [] }
}

export async function persistPortalWorkoutPrs(
  workoutId: string
): Promise<CompleteWorkoutResult> {
  const ctx = await requirePortalWorkout(workoutId)
  if (isPortalWorkoutError(ctx)) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client, workout } = ctx

  if (workout.status !== 'completed') {
    return { success: false, error: 'Workout is not completed.' }
  }

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('coach_id')
    .eq('id', client.id)
    .maybeSingle()

  if (clientError || !clientRow?.coach_id) {
    return { success: false, error: 'Client coach not found.' }
  }

  const achievedAt = workout.completed_at ?? new Date().toISOString()
  const { logSets } = await fetchLogSets(supabase, workout.id)
  const newPrs = await evaluateAndPersistWorkoutPrs(supabase, {
    clientId: client.id,
    coachId: clientRow.coach_id,
    workout,
    logSets,
    achievedAt,
  })

  void notifyCoachOfClientPrs({
    coachId: clientRow.coach_id,
    clientId: client.id,
    clientName: client.full_name,
    workoutName: workout.name,
    newPrs,
  }).catch(() => undefined)

  revalidatePath('/portal/progress')
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

export async function updatePortalExerciseClientNotes(
  workoutId: string,
  exerciseRowId: string,
  notes: string,
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const parsed = exerciseLogNotesSchema.safeParse({ notes })
  if (!parsed.success) {
    return { success: false, error: 'Notes must be 500 characters or fewer.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { supabase, client } = ctx

  const { data: row, error: rowError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout:client_scheduled_workouts!inner(id, client_id)')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise not found.' }
  }

  const workout = row.scheduled_workout as { id: string; client_id: string }
  if (workout.id !== workoutId || workout.client_id !== client.id) {
    return { success: false, error: 'Workout not found.' }
  }

  const trimmed = parsed.data.notes
  const { error } = await supabase
    .from('scheduled_workout_exercises')
    .update({ client_notes: trimmed ? trimmed : null })
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (options?.revalidate !== false) {
    revalidatePortal()
  }
  return { success: true }
}

export type ExerciseHistoryResult =
  | { success: true; sessions: import('app/types/database').ExerciseHistorySession[] }
  | { success: false; error: string }

export async function getPortalExerciseHistory(
  exerciseId: string,
  options?: { excludeWorkoutId?: string; limit?: number }
): Promise<ExerciseHistoryResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const sessions = await fetchExerciseHistory(
    ctx.supabase,
    ctx.client.id,
    exerciseId,
    options
  )

  return { success: true, sessions }
}
