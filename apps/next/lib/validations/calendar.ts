import { z } from 'zod'

import { isScheduledExerciseBlock } from '@/lib/exercise-groups'
import { DEFAULT_TRACKING_OPTIONS, parseTrackingOptions } from '@/lib/scheduled-exercise'
import type { ScheduledExerciseBlock } from 'app/types/database'

export const scheduledWorkoutFormSchema = z.object({
  name: z.string().trim().min(1, 'Workout name is required.').max(120),
  notes: z.string().trim().max(2000).optional(),
})

export type ScheduledWorkoutFormValues = z.infer<typeof scheduledWorkoutFormSchema>

export const trackingOptionsSchema = z.object({
  completionLift: z.boolean(),
  bodyweight: z.boolean(),
  coachCompletes: z.boolean(),
  disablePrTracking: z.boolean(),
  forcePrUpdate: z.boolean(),
  trackBarSpeed: z.boolean(),
  trackPeakPower: z.boolean(),
  trackReps: z.boolean(),
  trackVolume: z.boolean(),
})

const exerciseBlockSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || isScheduledExerciseBlock(value),
    'Select a valid workout section.'
  )

export const scheduledExercisePrescriptionSchema = z.object({
  sets: z.string().trim().max(20).optional(),
  reps: z.string().trim().max(40).optional(),
  prescription: z.string().trim().max(120).optional(),
  workoutNotes: z.string().trim().max(255).optional(),
  repMode: z.enum(['reps', 'time']),
  eachSide: z.boolean(),
  tempo: z.string().trim().max(40).optional(),
  restSeconds: z.string().trim().max(20).optional(),
  exerciseBlock: exerciseBlockSchema,
  supersetGroup: z
    .string()
    .trim()
    .max(1)
    .regex(/^[A-Z]?$/, 'Use a single letter A–Z.')
    .optional(),
  trackingOptions: trackingOptionsSchema,
})

export type ScheduledExercisePrescriptionValues = z.infer<
  typeof scheduledExercisePrescriptionSchema
>

export const scheduledExerciseFormSchema = scheduledExercisePrescriptionSchema.extend({
  exerciseId: z.string().uuid('Select an exercise.'),
})

export type ScheduledExerciseFormValues = z.infer<typeof scheduledExerciseFormSchema>

export const scheduledExerciseUpdateSchema = scheduledExercisePrescriptionSchema

export type ScheduledExerciseUpdateValues = z.infer<
  typeof scheduledExerciseUpdateSchema
>

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.')

export const copyWorkoutRangeSchema = z
  .object({
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Select at least one day of the week.'),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'Start date must be on or before end date.',
    path: ['endDate'],
  })

export const defaultPrescriptionValues: ScheduledExercisePrescriptionValues = {
  sets: '3',
  reps: '',
  prescription: '',
  workoutNotes: '',
  repMode: 'reps',
  eachSide: false,
  tempo: '',
  restSeconds: '',
  exerciseBlock: '',
  supersetGroup: '',
  trackingOptions: { ...DEFAULT_TRACKING_OPTIONS },
}

export function normalizeRepsInput(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  if (/^f$/i.test(trimmed)) return 'to failure'
  return trimmed
}

export function prescriptionValuesToDbRow(
  values: ScheduledExercisePrescriptionValues
) {
  const supersetGroup = values.supersetGroup?.trim().toUpperCase()
  const exerciseBlock = values.exerciseBlock?.trim()
  const reps =
    values.repMode === 'reps'
      ? normalizeRepsInput(values.reps)
      : values.reps?.trim() ?? ''

  return {
    sets: values.sets?.trim() ? values.sets.trim() : null,
    reps: reps ? reps : null,
    prescription: values.prescription?.trim() ? values.prescription.trim() : null,
    workout_notes: values.workoutNotes?.trim()
      ? values.workoutNotes.trim()
      : null,
    rep_mode: values.repMode,
    each_side: values.eachSide,
    tempo: values.tempo?.trim() ? values.tempo.trim() : null,
    rest_seconds: values.restSeconds?.trim() ? values.restSeconds.trim() : null,
    exercise_block:
      exerciseBlock && isScheduledExerciseBlock(exerciseBlock)
        ? (exerciseBlock as ScheduledExerciseBlock)
        : null,
    superset_group: supersetGroup ? supersetGroup : null,
    tracking_options: values.trackingOptions,
  }
}

export function rowToPrescriptionValues(row: {
  sets: string | null
  reps: string | null
  prescription: string | null
  workout_notes?: string | null
  rep_mode?: string | null
  each_side?: boolean | null
  tempo?: string | null
  rest_seconds?: string | null
  exercise_block?: string | null
  superset_group: string | null
  tracking_options?: unknown
}): ScheduledExercisePrescriptionValues {
  return {
    sets: row.sets ?? '',
    reps: row.reps ?? '',
    prescription: row.prescription ?? '',
    workoutNotes: row.workout_notes ?? '',
    repMode: row.rep_mode === 'time' ? 'time' : 'reps',
    eachSide: Boolean(row.each_side),
    tempo: row.tempo ?? '',
    restSeconds: row.rest_seconds ?? '',
    exerciseBlock: row.exercise_block ?? '',
    supersetGroup: row.superset_group ?? '',
    trackingOptions: parseTrackingOptions(row.tracking_options),
  }
}
