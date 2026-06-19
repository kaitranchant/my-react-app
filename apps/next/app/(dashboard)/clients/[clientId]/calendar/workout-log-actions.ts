'use server'

import { revalidatePath } from 'next/cache'

import {
  evaluateAndPersistWorkoutPrs,
  fetchPersonalBestsByExerciseIds,
  type CompleteWorkoutResult,
} from '@/lib/pr-records'
import {
  saveWorkoutLogSetsSchema,
  type WorkoutLogSetValues,
} from '@/lib/validations/workout-log'
import { createClient } from '@/lib/supabase/server'
import type {
  ClientScheduledWorkoutWithExercises,
  ExercisePreviousSets,
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
  const { supabase, user } = await requireUser()
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  return { supabase, user, client }
}

function revalidateClientCalendar(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal', 'layout')
}

async function fetchWorkoutWithExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<ClientScheduledWorkoutWithExercises | null> {
  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select(
      `
      *,
      exercises:scheduled_workout_exercises(
        *,
        exercise:exercises(id, name, muscle_group, equipment, external_id, image_url, instructions)
      )
    `
    )
    .eq('id', workoutId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const exercises = (data.exercises ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    ...data,
    exercises,
  } as ClientScheduledWorkoutWithExercises
}

async function fetchLogSets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<{ logSets: WorkoutLogSet[]; error: string | null }> {
  const { data, error } = await supabase
    .from('workout_log_sets')
    .select('*')
    .eq('scheduled_workout_id', workoutId)
    .order('set_number', { ascending: true })

  if (error) {
    return { logSets: [], error: error.message }
  }

  return { logSets: (data ?? []) as WorkoutLogSet[], error: null }
}

type HistoricalLogRow = {
  set_number: number
  weight: number | null
  reps: number | null
  scheduled_workout_exercises: { exercise_id: string }
  client_scheduled_workouts: { scheduled_date: string }
}

async function fetchPreviousSetsForExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  workoutId: string,
  libraryExerciseIds: string[]
): Promise<{
  previousSetsByExerciseId: Record<string, ExercisePreviousSets>
  previousSessionDateByExerciseId: Record<string, string | null>
}> {
  const previousSetsByExerciseId: Record<string, ExercisePreviousSets> = {}
  const previousSessionDateByExerciseId: Record<string, string | null> = {}

  if (libraryExerciseIds.length === 0) {
    return { previousSetsByExerciseId, previousSessionDateByExerciseId }
  }

  const { data, error } = await supabase
    .from('workout_log_sets')
    .select(
      `
      set_number,
      weight,
      reps,
      scheduled_workout_exercises!inner (exercise_id),
      client_scheduled_workouts!inner (client_id, scheduled_date)
    `
    )
    .eq('client_scheduled_workouts.client_id', clientId)
    .neq('scheduled_workout_id', workoutId)
    .in('scheduled_workout_exercises.exercise_id', libraryExerciseIds)
    .not('weight', 'is', null)
    .not('reps', 'is', null)

  if (error || !data) {
    return { previousSetsByExerciseId, previousSessionDateByExerciseId }
  }

  const rows = data as HistoricalLogRow[]
  const latestDateByExercise = new Map<string, string>()

  for (const row of rows) {
    const exerciseId = row.scheduled_workout_exercises.exercise_id
    const sessionDate = String(
      row.client_scheduled_workouts.scheduled_date ?? ''
    ).slice(0, 10)
    if (!sessionDate) continue

    const currentLatest = latestDateByExercise.get(exerciseId)

    if (!currentLatest || sessionDate > currentLatest) {
      latestDateByExercise.set(exerciseId, sessionDate)
    }
  }

  for (const row of rows) {
    const exerciseId = row.scheduled_workout_exercises.exercise_id
    const sessionDate = String(
      row.client_scheduled_workouts.scheduled_date ?? ''
    ).slice(0, 10)
    if (!sessionDate) continue

    const latestDate = latestDateByExercise.get(exerciseId)

    if (!latestDate || sessionDate !== latestDate) {
      continue
    }

    if (row.weight == null || row.reps == null) {
      continue
    }

    if (!previousSetsByExerciseId[exerciseId]) {
      previousSetsByExerciseId[exerciseId] = {}
      previousSessionDateByExerciseId[exerciseId] = sessionDate
    }

    previousSetsByExerciseId[exerciseId][row.set_number] = {
      weight: row.weight,
      reps: row.reps,
    }
  }

  return { previousSetsByExerciseId, previousSessionDateByExerciseId }
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
  const { previousSetsByExerciseId, previousSessionDateByExerciseId } =
    await fetchPreviousSetsForExercises(
      supabase,
      clientId,
      workoutId,
      libraryExerciseIds
    )
  const personalBestsByExerciseId = await fetchPersonalBestsByExerciseIds(
    supabase,
    clientId,
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

  if (workout.status !== 'in_progress') {
    return { success: false, error: 'This workout is not in progress.' }
  }

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({ status: 'scheduled' })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function saveWorkoutLogSets(
  clientId: string,
  workoutId: string,
  sets: WorkoutLogSetValues[],
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const parsed = saveWorkoutLogSetsSchema.safeParse({ workoutId, sets })
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

  const exerciseIds = new Set(workout.exercises.map((row) => row.id))
  for (const set of parsed.data.sets) {
    if (!exerciseIds.has(set.scheduledExerciseId)) {
      return { success: false, error: 'Exercise not found in this workout.' }
    }
  }

  for (const set of parsed.data.sets) {
    const row = {
      scheduled_workout_id: workoutId,
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

  const { supabase, user } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
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

  const { logSets } = await fetchLogSets(supabase, workoutId)
  const newPrs = await evaluateAndPersistWorkoutPrs(supabase, {
    clientId,
    coachId: user.id,
    workout,
    logSets,
    achievedAt,
  })

  revalidateClientCalendar(clientId)
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
