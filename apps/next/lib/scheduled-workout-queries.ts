import type { createClient } from '@/lib/supabase/server'
import type {
  ClientScheduledWorkoutWithExercises,
  ExercisePreviousSets,
  WorkoutLogSet,
} from 'app/types/database'

export async function fetchWorkoutWithExercises(
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

export async function fetchLogSets(
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

export async function fetchPreviousSetsForExercises(
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
