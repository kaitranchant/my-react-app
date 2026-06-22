import { z } from 'zod'

const metricDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'metricDate must be YYYY-MM-DD')

export const appleHealthDailyMetricSchema = z.object({
  metricDate: metricDateSchema,
  steps: z.number().int().min(0).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  restingHrBpm: z.number().int().min(20).max(250).nullable().optional(),
  hrvMs: z.number().min(0).max(500).nullable().optional(),
})

export type AppleHealthDailyMetricInput = z.infer<
  typeof appleHealthDailyMetricSchema
>

export const appleHealthSyncPayloadSchema = z.object({
  metrics: z.array(appleHealthDailyMetricSchema).min(1).max(90),
})

export type AppleHealthSyncPayload = z.infer<typeof appleHealthSyncPayloadSchema>
