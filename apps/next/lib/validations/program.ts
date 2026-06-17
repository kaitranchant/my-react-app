import { z } from 'zod'

export const programStatuses = ['draft', 'active', 'archived'] as const

export const programFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  status: z.enum(programStatuses),
})

export type ProgramFormValues = z.infer<typeof programFormSchema>

export const programFormDefaults: ProgramFormValues = {
  name: '',
  description: '',
  status: 'active',
}

export const assignProgramSchema = z.object({
  programId: z.string().uuid('Select a program'),
  startDate: z.string().optional(),
})

export type AssignProgramValues = z.infer<typeof assignProgramSchema>
