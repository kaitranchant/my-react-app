import { z } from 'zod'

export const exerciseStatuses = ['active', 'archived'] as const

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
