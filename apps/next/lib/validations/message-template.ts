import { z } from 'zod'

import { messageBodySchema } from '@/lib/validations/message'

export const messageTemplateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
  body: messageBodySchema,
})

export type MessageTemplateFormValues = z.infer<typeof messageTemplateFormSchema>

export const messageTemplateFormDefaults: MessageTemplateFormValues = {
  name: '',
  body: '',
}
