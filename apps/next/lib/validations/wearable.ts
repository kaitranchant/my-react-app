import { z } from 'zod'

export const wearableProviderSchema = z.enum([
  'whoop',
  'garmin',
  'oura',
  'apple_health',
  'fitbit',
])

export type WearableProviderValue = z.infer<typeof wearableProviderSchema>

export const wearableConnectionFilterSchema = z.enum([
  'all',
  'connected',
  'not_connected',
])

export type WearableConnectionFilter = z.infer<
  typeof wearableConnectionFilterSchema
>

export function parseWearableProvider(
  value: string | null | undefined
): WearableProviderValue | null {
  const parsed = wearableProviderSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function parseWearableConnectionFilter(
  value: string | null | undefined
): WearableConnectionFilter {
  const parsed = wearableConnectionFilterSchema.safeParse(value)
  return parsed.success ? parsed.data : 'all'
}

export type WearableRosterSortKey =
  | 'name'
  | 'provider'
  | 'last_synced_at'
  | 'sleep_hours'
  | 'hrv_ms'
  | 'recovery_score'
  | 'steps'

export const wearableRosterSortKeySchema = z.enum([
  'name',
  'provider',
  'last_synced_at',
  'sleep_hours',
  'hrv_ms',
  'recovery_score',
  'steps',
])

export type WearableRosterSortDirection = 'asc' | 'desc'

export function parseWearableRosterSortKey(
  value: string | null | undefined
): WearableRosterSortKey {
  const parsed = wearableRosterSortKeySchema.safeParse(value)
  return parsed.success ? parsed.data : 'name'
}

export function parseWearableRosterSortDirection(
  value: string | null | undefined
): WearableRosterSortDirection {
  return value === 'desc' ? 'desc' : 'asc'
}
