import { z } from 'zod'

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')

const optionalMetric = {
  weight: z
    .union([z.number().min(0).max(999), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  sleepHours: z
    .union([z.number().min(0).max(24), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
}

const levelSchema = z
  .union([z.number().int().min(1).max(5), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value))

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null ? null : value
    )

const checkInFormFields = z.object({
  checkInDate: dateKeySchema,
  weight: optionalMetric.weight,
  sleepHours: optionalMetric.sleepHours,
  calmLevel: levelSchema,
  sleepQuality: levelSchema,
  energyLevel: levelSchema,
  motivationLevel: levelSchema,
  nutritionAdherence: levelSchema,
  sorenessLevel: levelSchema,
  sorenessNotes: optionalText(500),
  hasPain: z.boolean(),
  painNotes: optionalText(500),
  clientNotes: optionalText(2000),
  coachNotes: optionalText(2000),
})

function requirePainNotesWhenHasPain(
  values: { hasPain: boolean; painNotes: string | null | undefined },
  ctx: z.RefinementCtx
) {
  if (values.hasPain && !values.painNotes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please describe the pain or injury.',
      path: ['painNotes'],
    })
  }
}

export const checkInFormSchema =
  checkInFormFields.superRefine(requirePainNotesWhenHasPain)

export type CheckInFormValues = z.infer<typeof checkInFormSchema>

export const clientCheckInFormSchema = checkInFormFields
  .omit({ coachNotes: true })
  .superRefine(requirePainNotesWhenHasPain)

export type ClientCheckInFormValues = z.infer<typeof clientCheckInFormSchema>

export const coachNotesSchema = z.object({
  coachNotes: optionalText(2000),
})

export type CoachNotesValues = z.infer<typeof coachNotesSchema>

export function toClientCheckInValues(
  values: CheckInFormValues
): ClientCheckInFormValues {
  const { coachNotes: _coachNotes, ...clientValues } = values
  return clientValues
}
