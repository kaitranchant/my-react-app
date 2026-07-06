import { createAdminClient } from '@/lib/supabase/admin'
import type { CoachClientNotificationPreferencesValues } from '@/lib/validations/coach-client-notification-preferences'
import type { CoachClientNotificationPreferenceKey } from '@/lib/validations/coach-client-notification-preferences'
import type { Profile } from 'app/types/database'

export type CoachClientNotificationPreferences =
  CoachClientNotificationPreferencesValues

export const defaultCoachClientNotificationPreferences: CoachClientNotificationPreferences =
  {
    sendClientMessages: true,
    sendClientCheckInReviews: true,
    sendClientFormReviewReplies: true,
    sendClientNutritionSetup: true,
    sendClientTeamUpdates: true,
    sendClientInvites: true,
    sendClientWorkoutReminders: true,
    sendClientCheckInReminders: true,
    sendClientUnreadDigest: true,
    sendClientAppointmentReminders: true,
  }

export const coachClientNotificationSelect =
  'coach_send_client_messages, coach_send_client_check_in_reviews, coach_send_client_form_review_replies, coach_send_client_nutrition_setup, coach_send_client_team_updates, coach_send_client_invites, coach_send_client_workout_reminders, coach_send_client_check_in_reminders, coach_send_client_unread_digest, coach_send_client_appointment_reminders'

type ProfileCoachClientNotificationRow = Pick<
  Profile,
  | 'coach_send_client_messages'
  | 'coach_send_client_check_in_reviews'
  | 'coach_send_client_form_review_replies'
  | 'coach_send_client_nutrition_setup'
  | 'coach_send_client_team_updates'
  | 'coach_send_client_invites'
  | 'coach_send_client_workout_reminders'
  | 'coach_send_client_check_in_reminders'
  | 'coach_send_client_unread_digest'
  | 'coach_send_client_appointment_reminders'
>

const preferenceColumnByKey = {
  sendClientMessages: 'coach_send_client_messages',
  sendClientCheckInReviews: 'coach_send_client_check_in_reviews',
  sendClientFormReviewReplies: 'coach_send_client_form_review_replies',
  sendClientNutritionSetup: 'coach_send_client_nutrition_setup',
  sendClientTeamUpdates: 'coach_send_client_team_updates',
  sendClientInvites: 'coach_send_client_invites',
  sendClientWorkoutReminders: 'coach_send_client_workout_reminders',
  sendClientCheckInReminders: 'coach_send_client_check_in_reminders',
  sendClientUnreadDigest: 'coach_send_client_unread_digest',
  sendClientAppointmentReminders: 'coach_send_client_appointment_reminders',
} as const satisfies Record<
  CoachClientNotificationPreferenceKey,
  keyof ProfileCoachClientNotificationRow
>

export function parseCoachClientNotificationPreferences(
  row?: ProfileCoachClientNotificationRow | null
): CoachClientNotificationPreferences {
  return {
    sendClientMessages:
      row?.coach_send_client_messages ??
      defaultCoachClientNotificationPreferences.sendClientMessages,
    sendClientCheckInReviews:
      row?.coach_send_client_check_in_reviews ??
      defaultCoachClientNotificationPreferences.sendClientCheckInReviews,
    sendClientFormReviewReplies:
      row?.coach_send_client_form_review_replies ??
      defaultCoachClientNotificationPreferences.sendClientFormReviewReplies,
    sendClientNutritionSetup:
      row?.coach_send_client_nutrition_setup ??
      defaultCoachClientNotificationPreferences.sendClientNutritionSetup,
    sendClientTeamUpdates:
      row?.coach_send_client_team_updates ??
      defaultCoachClientNotificationPreferences.sendClientTeamUpdates,
    sendClientInvites:
      row?.coach_send_client_invites ??
      defaultCoachClientNotificationPreferences.sendClientInvites,
    sendClientWorkoutReminders:
      row?.coach_send_client_workout_reminders ??
      defaultCoachClientNotificationPreferences.sendClientWorkoutReminders,
    sendClientCheckInReminders:
      row?.coach_send_client_check_in_reminders ??
      defaultCoachClientNotificationPreferences.sendClientCheckInReminders,
    sendClientUnreadDigest:
      row?.coach_send_client_unread_digest ??
      defaultCoachClientNotificationPreferences.sendClientUnreadDigest,
    sendClientAppointmentReminders:
      row?.coach_send_client_appointment_reminders ??
      defaultCoachClientNotificationPreferences.sendClientAppointmentReminders,
  }
}

export function coachClientNotificationPreferencesToRow(
  values: CoachClientNotificationPreferences
) {
  return {
    coach_send_client_messages: values.sendClientMessages,
    coach_send_client_check_in_reviews: values.sendClientCheckInReviews,
    coach_send_client_form_review_replies: values.sendClientFormReviewReplies,
    coach_send_client_nutrition_setup: values.sendClientNutritionSetup,
    coach_send_client_team_updates: values.sendClientTeamUpdates,
    coach_send_client_invites: values.sendClientInvites,
    coach_send_client_workout_reminders: values.sendClientWorkoutReminders,
    coach_send_client_check_in_reminders: values.sendClientCheckInReminders,
    coach_send_client_unread_digest: values.sendClientUnreadDigest,
    coach_send_client_appointment_reminders: values.sendClientAppointmentReminders,
  }
}

export function isCoachClientNotificationEnabledFromProfile(
  row: ProfileCoachClientNotificationRow | null | undefined,
  key: CoachClientNotificationPreferenceKey
): boolean {
  const prefs = parseCoachClientNotificationPreferences(row)
  return prefs[key]
}

export async function isCoachClientNotificationEnabled(
  coachId: string,
  key: CoachClientNotificationPreferenceKey
): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) {
    return true
  }

  const column = preferenceColumnByKey[key]
  const { data: profile, error } = await admin
    .from('profiles')
    .select(coachClientNotificationSelect)
    .eq('id', coachId)
    .maybeSingle()

  if (error || !profile) {
    return true
  }

  return profile[column] !== false
}
