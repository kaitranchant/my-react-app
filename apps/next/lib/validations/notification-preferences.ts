import { z } from 'zod'

export const notificationPreferenceKeys = [
  'notifyCheckIns',
  'notifyFormReviews',
  'notifyWorkoutCompletions',
  'notifyMissedSessions',
  'notifyInviteAccepted',
  'notifyWeeklySummary',
] as const

export type NotificationPreferenceKey =
  (typeof notificationPreferenceKeys)[number]

export const notificationPreferencesSchema = z.object({
  notifyCheckIns: z.boolean(),
  notifyFormReviews: z.boolean(),
  notifyWorkoutCompletions: z.boolean(),
  notifyMissedSessions: z.boolean(),
  notifyInviteAccepted: z.boolean(),
  notifyWeeklySummary: z.boolean(),
})

export type NotificationPreferencesValues = z.infer<
  typeof notificationPreferencesSchema
>
