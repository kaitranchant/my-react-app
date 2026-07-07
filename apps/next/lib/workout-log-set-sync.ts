import type { SupabaseClient } from '@supabase/supabase-js'

type WorkoutLogSetRef = {
  scheduledExerciseId: string
  setNumber: number
}

export async function syncWorkoutLogSetsForExercises(
  supabase: SupabaseClient,
  sets: WorkoutLogSetRef[],
  validExerciseIds: ReadonlySet<string>
): Promise<{ success: true } | { success: false; error: string }> {
  const setsByExercise = new Map<string, number[]>()

  for (const set of sets) {
    if (!validExerciseIds.has(set.scheduledExerciseId)) continue
    const existing = setsByExercise.get(set.scheduledExerciseId) ?? []
    existing.push(set.setNumber)
    setsByExercise.set(set.scheduledExerciseId, existing)
  }

  if (setsByExercise.size === 0) {
    return { success: true }
  }

  for (const [exerciseId, keptSetNumbers] of Array.from(setsByExercise.entries())) {
    const maxSetNumber = Math.max(...keptSetNumbers)

    const { error: trailingDeleteError } = await supabase
      .from('workout_log_sets')
      .delete()
      .eq('scheduled_exercise_id', exerciseId)
      .gt('set_number', maxSetNumber)

    if (trailingDeleteError) {
      return { success: false, error: trailingDeleteError.message }
    }

    const { error } = await supabase
      .from('workout_log_sets')
      .delete()
      .eq('scheduled_exercise_id', exerciseId)
      .not('set_number', 'in', `(${keptSetNumbers.join(',')})`)

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}
