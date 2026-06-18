import type {
  ScheduledExerciseFormValues,
  ScheduledExerciseUpdateValues,
} from '@/lib/validations/calendar'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

export type WorkoutBuilderActionResult =
  | { success: true }
  | { success: false; error: string }

export type WorkoutBuilderExerciseActions = {
  addExercise: (
    workoutId: string,
    values: ScheduledExerciseFormValues
  ) => Promise<WorkoutBuilderActionResult>
  updateExercise: (
    exerciseRowId: string,
    values: ScheduledExerciseUpdateValues
  ) => Promise<WorkoutBuilderActionResult>
  removeExercise: (exerciseRowId: string) => Promise<WorkoutBuilderActionResult>
  reorderExercises: (
    workoutId: string,
    orderedRowIds: string[]
  ) => Promise<WorkoutBuilderActionResult>
}

export type EditableWorkoutWithExercises = {
  id: string
  name: string
  notes: string | null
  exercises: ScheduledWorkoutExerciseWithDetails[]
}
