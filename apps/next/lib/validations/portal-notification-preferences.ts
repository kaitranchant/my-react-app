import { z } from 'zod'

export const portalNotificationPreferenceKeys = [
  'notifyCoachMessages',
  'notifyCheckInReviews',
  'notifyFormReviewReplies',
  'notifyTeamUpdates',
] as const

export type PortalNotificationPreferenceKey =
  (typeof portalNotificationPreferenceKeys)[number]

export const portalNotificationPreferencesSchema = z.object({
  notifyCoachMessages: z.boolean(),
  notifyCheckInReviews: z.boolean(),
  notifyFormReviewReplies: z.boolean(),
  notifyTeamUpdates: z.boolean(),
})

export type PortalNotificationPreferencesValues = z.infer<
  typeof portalNotificationPreferencesSchema
>
