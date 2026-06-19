import type { createClient } from '@/lib/supabase/server'
import {
  buildHistoricalBestFromRecords,
  calcSessionVolumeForExercise,
  detectSessionPrs,
  type HistoricalExerciseBest,
} from '@/lib/load-analytics'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type {
  ClientScheduledWorkoutWithExercises,
  ExercisePersonalBest,
  ExercisePrRecord,
  WorkoutLogSet,
} from 'app/types/database'

export type NewPrSummary = {
  exerciseId: string
  exerciseName: string
  recordType: 'e1rm' | 'top_set'
  e1rm: number | null
  weight: number | null
  reps: number | null
  forced: boolean
}

export type CompleteWorkoutResult =
  | { success: true; newPrs: NewPrSummary[] }
  | { success: false; error: string }

export async function fetchPersonalBestsByExerciseIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  exerciseIds: string[]
): Promise<Record<string, ExercisePersonalBest>> {
  const result: Record<string, ExercisePersonalBest> = {}

  if (exerciseIds.length === 0) {
    return result
  }

  const { data, error } = await supabase
    .from('exercise_pr_records')
    .select('exercise_id, record_type, e1rm, weight, reps')
    .eq('client_id', clientId)
    .in('exercise_id', exerciseIds)
    .order('achieved_at', { ascending: false })

  if (error || !data) {
    return result
  }

  const byExercise = new Map<string, Pick<ExercisePrRecord, 'record_type' | 'e1rm' | 'weight' | 'reps'>[]>()
  for (const row of data as Pick<
    ExercisePrRecord,
    'exercise_id' | 'record_type' | 'e1rm' | 'weight' | 'reps'
  >[]) {
    const existing = byExercise.get(row.exercise_id) ?? []
    existing.push({
      record_type: row.record_type,
      e1rm: row.e1rm,
      weight: row.weight,
      reps: row.reps,
    })
    byExercise.set(row.exercise_id, existing)
  }

  for (const exerciseId of exerciseIds) {
    const records = byExercise.get(exerciseId) ?? []
    result[exerciseId] = buildHistoricalBestFromRecords(records)
  }

  return result
}

export async function evaluateAndPersistWorkoutPrs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    clientId: string
    coachId: string
    workout: ClientScheduledWorkoutWithExercises
    logSets: WorkoutLogSet[]
    achievedAt: string
  }
): Promise<NewPrSummary[]> {
  const { clientId, coachId, workout, logSets, achievedAt } = params
  const libraryExerciseIds = Array.from(
    new Set(workout.exercises.map((row) => row.exercise_id))
  )

  const personalBests = await fetchPersonalBestsByExerciseIds(
    supabase,
    clientId,
    libraryExerciseIds
  )

  const newPrs: NewPrSummary[] = []

  for (const exercise of workout.exercises) {
    const options = parseTrackingOptions(exercise.tracking_options)
    const exerciseSets = logSets
      .filter((set) => set.scheduled_exercise_id === exercise.id)
      .map((set) => ({
        weight: set.weight,
        reps: set.reps,
        completed: set.completed,
      }))

    const historicalBest = personalBests[exercise.exercise_id] ?? null
    const candidates = detectSessionPrs(exerciseSets, historicalBest, options)

    for (const candidate of candidates) {
      const { error } = await supabase.from('exercise_pr_records').insert({
        client_id: clientId,
        coach_id: coachId,
        exercise_id: exercise.exercise_id,
        record_type: candidate.recordType,
        e1rm: candidate.e1rm,
        weight: candidate.weight,
        reps: candidate.reps,
        session_volume: candidate.sessionVolume,
        scheduled_workout_id: workout.id,
        scheduled_exercise_id: exercise.id,
        forced: candidate.forced,
        achieved_at: achievedAt,
      })

      if (error) {
        continue
      }

      newPrs.push({
        exerciseId: exercise.exercise_id,
        exerciseName: exercise.exercise.name,
        recordType: candidate.recordType,
        e1rm: candidate.e1rm,
        weight: candidate.weight,
        reps: candidate.reps,
        forced: candidate.forced,
      })
    }
  }

  return newPrs
}

export type RecentPrHighlight = {
  id: string
  exerciseName: string
  label: string
  date: string
  achievedAt: string
}

export async function fetchRecentPrHighlights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  limit = 5
): Promise<RecentPrHighlight[]> {
  const { data, error } = await supabase
    .from('exercise_pr_records')
    .select(
      `
      id,
      record_type,
      e1rm,
      weight,
      reps,
      achieved_at,
      exercise:exercises(name)
    `
    )
    .eq('client_id', clientId)
    .order('achieved_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const exercise = row.exercise as { name: string } | null
    const achievedAt = row.achieved_at as string
    const recordType = row.record_type as 'e1rm' | 'top_set'
    const e1rm = row.e1rm as number | null
    const weight = row.weight as number | null
    const reps = row.reps as number | null

    let label = 'PR'
    if (recordType === 'e1rm' && e1rm != null) {
      label = `${e1rm} lb e1RM`
    } else if (weight != null && reps != null) {
      label = `${weight} × ${reps}`
    }

    return {
      id: row.id as string,
      exerciseName: exercise?.name ?? 'Exercise',
      label,
      date: new Date(achievedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      achievedAt,
    }
  })
}

export function calcWorkoutVolumeFromLogData(
  workout: ClientScheduledWorkoutWithExercises,
  logSets: WorkoutLogSet[]
): number {
  let total = 0

  for (const exercise of workout.exercises) {
    const options = parseTrackingOptions(exercise.tracking_options)
    const exerciseSets = logSets
      .filter((set) => set.scheduled_exercise_id === exercise.id)
      .map((set) => ({
        weight: set.weight,
        reps: set.reps,
        completed: set.completed,
      }))

    total += calcSessionVolumeForExercise(exerciseSets, options)
  }

  return total
}
