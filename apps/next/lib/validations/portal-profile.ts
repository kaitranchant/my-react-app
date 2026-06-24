import { z } from 'zod'

export const portalProfileFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
})

export type PortalProfileFormValues = z.infer<typeof portalProfileFormSchema>
