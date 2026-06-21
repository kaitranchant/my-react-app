import type { ActionItem, ActivityItem } from '@/lib/dashboard'
import type { NotificationPreferencesValues } from '@/lib/validations/notification-preferences'
import type { Profile } from 'app/types/database'

export type NotificationPreferences = NotificationPreferencesValues

export const defaultNotificationPreferences: NotificationPreferences = {
  notifyCheckIns: true,
  notifyFormReviews: true,
  notifyWorkoutCompletions: true,
  notifyMissedSessions: false,
  notifyInviteAccepted: true,
  notifyWeeklySummary: false,
}

type ProfileNotificationRow = Pick<
  Profile,
  | 'notify_check_ins'
  | 'notify_form_reviews'
  | 'notify_workout_completions'
  | 'notify_missed_sessions'
  | 'notify_invite_accepted'
  | 'notify_weekly_summary'
>

export function parseNotificationPreferences(
  row?: ProfileNotificationRow | null
): NotificationPreferences {
  return {
    notifyCheckIns:
      row?.notify_check_ins ?? defaultNotificationPreferences.notifyCheckIns,
    notifyFormReviews:
      row?.notify_form_reviews ?? defaultNotificationPreferences.notifyFormReviews,
    notifyWorkoutCompletions:
      row?.notify_workout_completions ??
      defaultNotificationPreferences.notifyWorkoutCompletions,
    notifyMissedSessions:
      row?.notify_missed_sessions ??
      defaultNotificationPreferences.notifyMissedSessions,
    notifyInviteAccepted:
      row?.notify_invite_accepted ??
      defaultNotificationPreferences.notifyInviteAccepted,
    notifyWeeklySummary:
      row?.notify_weekly_summary ??
      defaultNotificationPreferences.notifyWeeklySummary,
  }
}

export function notificationPreferencesToRow(values: NotificationPreferences) {
  return {
    notify_check_ins: values.notifyCheckIns,
    notify_form_reviews: values.notifyFormReviews,
    notify_workout_completions: values.notifyWorkoutCompletions,
    notify_missed_sessions: values.notifyMissedSessions,
    notify_invite_accepted: values.notifyInviteAccepted,
    notify_weekly_summary: values.notifyWeeklySummary,
  }
}

export function filterActionItemsForNotifications(
  items: ActionItem[],
  preferences: NotificationPreferences
): ActionItem[] {
  return items.filter((item) => {
    switch (item.id) {
      case 'pending-check-ins':
      case 'no-check-in':
        return preferences.notifyCheckIns
      case 'pending-form-reviews':
        return preferences.notifyFormReviews
      case 'no-workout':
      case 'skipped':
        return preferences.notifyMissedSessions
      case 'invites':
        return preferences.notifyInviteAccepted
      default:
        return true
    }
  })
}

export function filterActivityFeedForNotifications(
  items: ActivityItem[],
  preferences: NotificationPreferences
): ActivityItem[] {
  return items.filter((item) => {
    if (item.kind === 'check_in') {
      return preferences.notifyCheckIns
    }

    if (item.kind === 'form_review') {
      return preferences.notifyFormReviews
    }

    if (item.kind === 'workout' && item.status === 'completed') {
      return preferences.notifyWorkoutCompletions
    }

    return true
  })
}
