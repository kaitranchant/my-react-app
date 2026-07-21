import { z } from 'zod'

export const assessmentTemplateFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => value || null),
  assessmentItemIds: z
    .array(z.string().uuid())
    .min(1, 'Select at least one test.')
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'A test can only appear once in a template.',
    }),
})

export type AssessmentTemplateFormValues = z.infer<
  typeof assessmentTemplateFormSchema
>
