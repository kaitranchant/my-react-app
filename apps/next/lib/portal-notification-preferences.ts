import type { PortalNotificationPreferencesValues } from '@/lib/validations/portal-notification-preferences'
import type { Profile } from 'app/types/database'

export type PortalNotificationPreferences = PortalNotificationPreferencesValues

export const defaultPortalNotificationPreferences: PortalNotificationPreferences =
  {
    notifyCoachMessages: true,
    notifyCheckInReviews: true,
    notifyFormReviewReplies: true,
    notifyTeamUpdates: false,
    notifyWorkoutReminders: true,
    notifyCheckInReminders: true,
    notifyUnreadDigest: true,
    notifyAppointmentReminders: true,
  }

type ProfilePortalNotificationRow = Pick<
  Profile,
  | 'portal_notify_messages'
  | 'portal_notify_check_in_reviews'
  | 'portal_notify_form_review_replies'
  | 'portal_notify_team_updates'
  | 'portal_notify_workout_reminders'
  | 'portal_notify_check_in_reminders'
  | 'portal_notify_unread_digest'
  | 'portal_notify_appointment_reminders'
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
    notifyWorkoutReminders:
      row?.portal_notify_workout_reminders ??
      defaultPortalNotificationPreferences.notifyWorkoutReminders,
    notifyCheckInReminders:
      row?.portal_notify_check_in_reminders ??
      defaultPortalNotificationPreferences.notifyCheckInReminders,
    notifyUnreadDigest:
      row?.portal_notify_unread_digest ??
      defaultPortalNotificationPreferences.notifyUnreadDigest,
    notifyAppointmentReminders:
      row?.portal_notify_appointment_reminders ??
      defaultPortalNotificationPreferences.notifyAppointmentReminders,
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
    portal_notify_workout_reminders: values.notifyWorkoutReminders,
    portal_notify_check_in_reminders: values.notifyCheckInReminders,
    portal_notify_unread_digest: values.notifyUnreadDigest,
    portal_notify_appointment_reminders: values.notifyAppointmentReminders,
  }
}
