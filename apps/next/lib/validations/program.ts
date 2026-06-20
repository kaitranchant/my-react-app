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

export const assignProgramToClientFormSchema = z.object({
  clientId: z.string().uuid('Select a client'),
  startDate: z.string().optional(),
})

export type AssignProgramToClientFormValues = z.infer<
  typeof assignProgramToClientFormSchema
>

export const assignProgramToTeamFormSchema = z.object({
  teamId: z.string().uuid('Select a team'),
  startDate: z.string().optional(),
})

export type AssignProgramToTeamFormValues = z.infer<
  typeof assignProgramToTeamFormSchema
>

export const programDayOffsetSchema = z
  .number()
  .int()
  .min(0, 'Day must be at least 1.')
  .max(364, 'Day cannot exceed 365.')

export const copyProgramWorkoutRangeSchema = z
  .object({
    startDayOffset: programDayOffsetSchema,
    endDayOffset: programDayOffsetSchema,
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Select at least one day of the week.'),
  })
  .refine((value) => value.startDayOffset <= value.endDayOffset, {
    message: 'Start day must be on or before end day.',
    path: ['endDayOffset'],
  })

export const programPhaseDaySchema = z
  .number()
  .int()
  .min(1, 'Day must be at least 1.')
  .max(365, 'Day cannot exceed 365.')

export const programPhaseFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name is too long'),
    description: z.string().trim().max(2000, 'Description is too long').optional(),
    startDay: programPhaseDaySchema,
    endDay: programPhaseDaySchema,
  })
  .refine((value) => value.startDay <= value.endDay, {
    message: 'Start day must be on or before end day.',
    path: ['endDay'],
  })

export type ProgramPhaseFormValues = z.infer<typeof programPhaseFormSchema>
