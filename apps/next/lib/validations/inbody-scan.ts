import { z } from 'zod'

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time')

const requiredNumber = (min: number, max: number) =>
  z
    .union([z.number().min(min).max(max), z.literal(''), z.null()])
    .transform((value) => (value === '' || value === null ? null : value))

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.number().min(min).max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value))

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null ? null : value
    )

export const inbodyScanFormSchema = z
  .object({
    scanDate: dateKeySchema,
    scanTime: timeSchema,
    weightLbs: requiredNumber(0, 999),
    skeletalMuscleMassLbs: requiredNumber(0, 999),
    percentBodyFat: requiredNumber(0, 100),
    totalBodyWaterLbs: optionalNumber(0, 999),
    dryLeanMassLbs: optionalNumber(0, 999),
    bodyFatMassLbs: optionalNumber(0, 999),
    bmi: optionalNumber(0, 100),
    leanBodyMassLbs: optionalNumber(0, 999),
    basalMetabolicRateKcal: optionalNumber(0, 9999),
    skeletalMuscleIndex: optionalNumber(0, 100),
    notes: optionalText(2000),
  })
  .superRefine((values, ctx) => {
    if (values.weightLbs == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Weight is required.',
        path: ['weightLbs'],
      })
    }
    if (values.skeletalMuscleMassLbs == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Skeletal muscle mass is required.',
        path: ['skeletalMuscleMassLbs'],
      })
    }
    if (values.percentBodyFat == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percent body fat is required.',
        path: ['percentBodyFat'],
      })
    }
  })

export type InbodyScanFormValues = z.infer<typeof inbodyScanFormSchema>
