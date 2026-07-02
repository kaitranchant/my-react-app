import { detectSessionPrs, type LogSetLike } from '@/lib/load-analytics'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type {
  ExercisePersonalBest,
  ScheduledWorkoutExerciseWithDetails,
} from 'app/types/database'

export type WorkoutPrSummary = {
  exerciseId: string
  exerciseName: string
  recordType: 'e1rm' | 'top_set'
  e1rm: number | null
  weight: number | null
  reps: number | null
  forced: boolean
}

export function detectNewPrsForWorkout(
  exercises: ScheduledWorkoutExerciseWithDetails[],
  setsByScheduledExerciseId: Record<string, LogSetLike[]>,
  personalBestsByExerciseId: Record<string, ExercisePersonalBest>
): WorkoutPrSummary[] {
  const newPrs: WorkoutPrSummary[] = []

  for (const exercise of exercises) {
    const options = parseTrackingOptions(exercise.tracking_options)
    const exerciseSets = setsByScheduledExerciseId[exercise.id] ?? []
    const historicalBest = personalBestsByExerciseId[exercise.exercise_id] ?? null
    const candidates = detectSessionPrs(exerciseSets, historicalBest, options)

    for (const candidate of candidates) {
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
