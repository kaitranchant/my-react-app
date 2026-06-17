import { z } from 'zod'

export const workoutStatuses = ['draft', 'active', 'archived'] as const

export const workoutFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  status: z.enum(workoutStatuses),
})

export type WorkoutFormValues = z.infer<typeof workoutFormSchema>

export const workoutFormDefaults: WorkoutFormValues = {
  name: '',
  description: '',
  status: 'active',
}
