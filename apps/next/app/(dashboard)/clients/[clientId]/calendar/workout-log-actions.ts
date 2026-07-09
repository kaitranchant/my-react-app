'use server'

import { revalidatePath } from 'next/cache'

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
  type WorkoutLogExerciseMetaValues,
  type WorkoutLogSetValues,
} from '@/lib/validations/workout-log'
import { syncWorkoutLogSetsForExercises } from '@/lib/workout-log-set-sync'
import { createClient } from '@/lib/supabase/server'
import { requireClientAccess } from '@/lib/gym-access'
import type {
  WorkoutLogData,
  WorkoutLogSet,
} from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type WorkoutLogResult =
  | { success: true; data: WorkoutLogData }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

async function requireClient(clientId: string) {
  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return null
  }

  return {
    supabase: ctx.supabase,
    user: ctx.user,
    client: {
      id: ctx.client.id,
      progressive_overload_enabled: ctx.client.progressive_overload_enabled,
    },
  }
}

function revalidateClientCalendar(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
}

export async function getWorkoutLogData(
  clientId: string,
  workoutId: string
): Promise<WorkoutLogResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  const { logSets, error: logSetsError } = await fetchLogSets(supabase, workoutId)
  if (logSetsError) {
    return { success: false, error: logSetsError }
  }

  const libraryExerciseIds = Array.from(
    new Set(workout.exercises.map((row) => row.exercise_id))
  )
  const [
    { previousSetsByExerciseId, previousSessionDateByExerciseId },
    personalBestsByExerciseId,
  ] = await Promise.all([
    fetchPreviousSetsForExercises(
      supabase,
      clientId,
      workoutId,
      libraryExerciseIds
    ),
    fetchPersonalBestsByExerciseIds(supabase, clientId, libraryExerciseIds),
  ])

  return {
    success: true,
    data: {
      ...workout,
      logSets,
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      personalBestsByExerciseId,
      progressiveOverloadEnabled: ctx.client.progressive_overload_enabled ?? false,
    },
  }
}

export async function startWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

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
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function stopWorkoutLog(
  clientId: string,
  workoutId: string,
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { data: workout, error: workoutError } = await supabase
    .from('client_scheduled_workouts')
    .select('id, status, completed_at')
    .eq('id', workoutId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (workoutError || !workout) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status !== 'in_progress' || workout.completed_at) {
    return { success: true }
  }

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({ status: 'scheduled' })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (options?.revalidate !== false) {
    revalidateClientCalendar(clientId)
  }
  return { success: true }
}

export async function saveWorkoutLogSets(
  clientId: string,
  workoutId: string,
  sets: WorkoutLogSetValues[],
  options?: {
    revalidate?: boolean
    exerciseMeta?: WorkoutLogExerciseMetaValues[]
    syncSetDeletions?: boolean
  }
): Promise<ActionResult> {
  const parsed = saveWorkoutLogSetsSchema.safeParse({
    workoutId,
    sets,
    exerciseMeta: options?.exerciseMeta,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid workout log data.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status === 'completed' || workout.status === 'skipped') {
    return { success: true }
  }

  const exerciseIds = new Set(workout.exercises.map((row) => row.id))
  for (const set of parsed.data.sets) {
    if (!exerciseIds.has(set.scheduledExerciseId)) {
      return { success: false, error: 'Exercise not found in this workout.' }
    }
  }

  const rows = parsed.data.sets.map((set) => ({
    scheduled_workout_id: workoutId,
    scheduled_exercise_id: set.scheduledExerciseId,
    set_number: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    duration_seconds: set.durationSeconds,
    distance_meters: set.distanceMeters,
    bar_speed: set.barSpeed,
    peak_power: set.peakPower,
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

  if (parsed.data.exerciseMeta?.length) {
    for (const entry of parsed.data.exerciseMeta) {
      if (!exerciseIds.has(entry.scheduledExerciseId)) {
        return { success: false, error: 'Exercise not found in this workout.' }
      }

      const { error } = await supabase
        .from('scheduled_workout_exercises')
        .update({ perceived_rpe: entry.perceivedRpe })
        .eq('id', entry.scheduledExerciseId)

      if (error) {
        return { success: false, error: error.message }
      }
    }
  }

  if (options?.syncSetDeletions) {
    const syncResult = await syncWorkoutLogSetsForExercises(
      supabase,
      workoutId,
      parsed.data.sets,
      exerciseIds
    )
    if (!syncResult.success) {
      return syncResult
    }
  }

  if (options?.revalidate !== false) {
    revalidateClientCalendar(clientId)
  }
  return { success: true }
}

export async function completeWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<CompleteWorkoutResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

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
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true, newPrs: [] }
}

export async function persistWorkoutLogPrs(
  clientId: string,
  workoutId: string
): Promise<CompleteWorkoutResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status !== 'completed') {
    return { success: false, error: 'Workout is not completed.' }
  }

  const achievedAt = workout.completed_at ?? new Date().toISOString()
  const { logSets } = await fetchLogSets(supabase, workoutId)
  const newPrs = await evaluateAndPersistWorkoutPrs(supabase, {
    clientId,
    coachId: user.id,
    workout,
    logSets,
    achievedAt,
  })

  revalidatePath(`/clients/${clientId}`)
  return { success: true, newPrs }
}

export async function skipWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
    })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function updateScheduledExerciseCoachNotes(
  clientId: string,
  exerciseRowId: string,
  notes: string,
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const parsed = exerciseLogNotesSchema.safeParse({ notes })
  if (!parsed.success) {
    return { success: false, error: 'Notes must be 500 characters or fewer.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx

  const { data: row, error: rowError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout:client_scheduled_workouts!inner(client_id)')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise not found.' }
  }

  const workout = row.scheduled_workout as { client_id: string }
  if (workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  const trimmed = parsed.data.notes
  const { error } = await supabase
    .from('scheduled_workout_exercises')
    .update({ workout_notes: trimmed ? trimmed : null })
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (options?.revalidate !== false) {
    revalidateClientCalendar(clientId)
  }
  return { success: true }
}

export async function reopenWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status !== 'completed' && workout.status !== 'skipped') {
    return { success: false, error: 'Only finished workouts can be reopened.' }
  }

  const hasLoggedSets = (await fetchLogSets(supabase, workoutId)).logSets.length > 0
  const nextStatus = 'scheduled'

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: nextStatus,
      completed_at: null,
      ...(hasLoggedSets || workout.started_at
        ? {}
        : { started_at: null }),
    })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export type ExerciseHistoryResult =
  | { success: true; sessions: import('app/types/database').ExerciseHistorySession[] }
  | { success: false; error: string }

export async function getExerciseHistory(
  clientId: string,
  exerciseId: string,
  options?: { excludeWorkoutId?: string; limit?: number }
): Promise<ExerciseHistoryResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const sessions = await fetchExerciseHistory(
    ctx.supabase,
    clientId,
    exerciseId,
    options
  )

  return { success: true, sessions }
}
