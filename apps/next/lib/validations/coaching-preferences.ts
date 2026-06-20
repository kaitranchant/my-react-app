import { z } from 'zod'

export const weightUnits = ['lbs', 'kg'] as const
export const weekStartsOnOptions = ['sunday', 'monday'] as const
export const coachTimezoneOptions = [
  'auto',
  'america_new_york',
  'america_chicago',
  'america_denver',
  'america_los_angeles',
  'europe_london',
] as const
export const checkInFrequencies = ['daily', 'weekly', 'biweekly'] as const

export const coachingPreferencesSchema = z.object({
  weightUnit: z.enum(weightUnits),
  weekStartsOn: z.enum(weekStartsOnOptions),
  timezone: z.enum(coachTimezoneOptions),
  defaultCheckInFrequency: z.enum(checkInFrequencies),
})

export type CoachingPreferencesValues = z.infer<typeof coachingPreferencesSchema>
