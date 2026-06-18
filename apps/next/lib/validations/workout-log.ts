import { z } from 'zod'

export const workoutLogSetSchema = z.object({
  scheduledExerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1).max(20),
  weight: z.number().min(0).max(9999).nullable(),
  reps: z.number().int().min(0).max(999).nullable(),
  durationSeconds: z.number().int().min(0).max(86400).nullable(),
  barSpeed: z.number().min(0).max(99).nullable(),
  peakPower: z.number().min(0).max(99999).nullable(),
  completed: z.boolean(),
  notes: z.string().trim().max(500).nullable(),
})

export type WorkoutLogSetValues = z.infer<typeof workoutLogSetSchema>

export const saveWorkoutLogSetsSchema = z.object({
  workoutId: z.string().uuid(),
  sets: z.array(workoutLogSetSchema).min(1),
})

export type SaveWorkoutLogSetsValues = z.infer<typeof saveWorkoutLogSetsSchema>
