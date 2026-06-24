import type { PortalNotificationPreferencesValues } from '@/lib/validations/portal-notification-preferences'
import type { Profile } from 'app/types/database'

export type PortalNotificationPreferences = PortalNotificationPreferencesValues

export const defaultPortalNotificationPreferences: PortalNotificationPreferences =
  {
    notifyCoachMessages: true,
    notifyCheckInReviews: true,
    notifyFormReviewReplies: true,
    notifyTeamUpdates: false,
  }

type ProfilePortalNotificationRow = Pick<
  Profile,
  | 'portal_notify_messages'
  | 'portal_notify_check_in_reviews'
  | 'portal_notify_form_review_replies'
  | 'portal_notify_team_updates'
>

export function parsePortalNotificationPreferences(
  row?: ProfilePortalNotificationRow | null
): PortalNotificationPreferences {
  return {
    notifyCoachMessages:
      row?.portal_notify_messages ??
      defaultPortalNotificationPreferences.notifyCoachMessages,
    notifyCheckInReviews:
      row?.portal_notify_check_in_reviews ??
      defaultPortalNotificationPreferences.notifyCheckInReviews,
    notifyFormReviewReplies:
      row?.portal_notify_form_review_replies ??
      defaultPortalNotificationPreferences.notifyFormReviewReplies,
    notifyTeamUpdates:
      row?.portal_notify_team_updates ??
      defaultPortalNotificationPreferences.notifyTeamUpdates,
  }
}

export function portalNotificationPreferencesToRow(
  values: PortalNotificationPreferences
) {
  return {
    portal_notify_messages: values.notifyCoachMessages,
    portal_notify_check_in_reviews: values.notifyCheckInReviews,
    portal_notify_form_review_replies: values.notifyFormReviewReplies,
    portal_notify_team_updates: values.notifyTeamUpdates,
  }
}
