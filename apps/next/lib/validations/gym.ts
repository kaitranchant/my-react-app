import { z } from 'zod'

export const gymFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
})

export type GymFormValues = z.infer<typeof gymFormSchema>

export const gymFormDefaults: GymFormValues = {
  name: '',
}

export const inviteCoachSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export type InviteCoachValues = z.infer<typeof inviteCoachSchema>
