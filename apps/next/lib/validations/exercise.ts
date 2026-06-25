import { z } from 'zod'

export const exerciseStatuses = ['active', 'archived'] as const

export const exerciseLibrarySortKeys = ['name'] as const
export type ExerciseLibrarySort = (typeof exerciseLibrarySortKeys)[number]

export const exerciseLibrarySortDirections = ['asc', 'desc'] as const
export type ExerciseLibrarySortDirection =
  (typeof exerciseLibrarySortDirections)[number]

export function parseExerciseLibrarySort(
  _value: string | undefined
): ExerciseLibrarySort {
  return 'name'
}

export function parseExerciseLibrarySortDirection(
  value: string | undefined
): ExerciseLibrarySortDirection {
  if (value === 'desc') return 'desc'
  return 'asc'
}

export function parseExerciseLibraryMuscleFilter(
  value: string | undefined,
  allowed: readonly string[]
): string | undefined {
  if (!value?.trim()) return undefined
  return allowed.find(
    (option) => option.toLowerCase() === value.trim().toLowerCase()
  )
}

export const exerciseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  instructions: z.string().trim().max(2000, 'Instructions are too long').optional(),
  muscleGroup: z.string().trim().max(80, 'Muscle group is too long').optional(),
  equipment: z.string().trim().max(80, 'Equipment is too long').optional(),
  status: z.enum(exerciseStatuses),
})

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>

export const exerciseFormDefaults: ExerciseFormValues = {
  name: '',
  instructions: '',
  muscleGroup: '',
  equipment: '',
  status: 'active',
}
