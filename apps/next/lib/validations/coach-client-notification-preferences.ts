import { z } from 'zod'

export const coachClientNotificationPreferenceKeys = [
  'sendClientMessages',
  'sendClientCheckInReviews',
  'sendClientFormReviewReplies',
  'sendClientNutritionSetup',
  'sendClientTeamUpdates',
  'sendClientInvites',
  'sendClientWorkoutReminders',
  'sendClientCheckInReminders',
  'sendClientUnreadDigest',
  'sendClientAppointmentReminders',
] as const

export type CoachClientNotificationPreferenceKey =
  (typeof coachClientNotificationPreferenceKeys)[number]

export const coachClientNotificationPreferencesSchema = z.object({
  sendClientMessages: z.boolean(),
  sendClientCheckInReviews: z.boolean(),
  sendClientFormReviewReplies: z.boolean(),
  sendClientNutritionSetup: z.boolean(),
  sendClientTeamUpdates: z.boolean(),
  sendClientInvites: z.boolean(),
  sendClientWorkoutReminders: z.boolean(),
  sendClientCheckInReminders: z.boolean(),
  sendClientUnreadDigest: z.boolean(),
  sendClientAppointmentReminders: z.boolean(),
})

export type CoachClientNotificationPreferencesValues = z.infer<
  typeof coachClientNotificationPreferencesSchema
>
