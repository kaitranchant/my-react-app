import { z } from 'zod'

const nullableNumber = z.number().nullable()

export const inbodyOcrExtractionSchema = z.object({
  scanDate: z.string().nullable(),
  scanTime: z.string().nullable(),
  heightFeet: nullableNumber,
  heightInchesPart: nullableNumber,
  heightInches: nullableNumber,
  weightLbs: nullableNumber,
  skeletalMuscleMassLbs: nullableNumber,
  percentBodyFat: nullableNumber,
  totalBodyWaterLbs: nullableNumber,
  dryLeanMassLbs: nullableNumber,
  bodyFatMassLbs: nullableNumber,
  bmi: nullableNumber,
  leanBodyMassLbs: nullableNumber,
  basalMetabolicRateKcal: nullableNumber,
  skeletalMuscleIndex: nullableNumber,
})

export type InbodyOcrExtraction = z.infer<typeof inbodyOcrExtractionSchema>
