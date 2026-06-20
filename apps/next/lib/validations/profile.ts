import { z } from 'zod'

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  businessName: z.string().trim().max(120).optional().or(z.literal('')),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>

export const profileFormDefaults: ProfileFormValues = {
  fullName: '',
  businessName: '',
}
