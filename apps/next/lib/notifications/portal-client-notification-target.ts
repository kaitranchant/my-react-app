import { createAdminClient } from '@/lib/supabase/admin'
import type { PortalNotificationPreferenceKey } from '@/lib/validations/portal-notification-preferences'

const preferenceColumnByKey = {
  notifyCoachMessages: 'portal_notify_messages',
  notifyCheckInReviews: 'portal_notify_check_in_reviews',
  notifyFormReviewReplies: 'portal_notify_form_review_replies',
  notifyTeamUpdates: 'portal_notify_team_updates',
  notifyWorkoutReminders: 'portal_notify_workout_reminders',
  notifyCheckInReminders: 'portal_notify_check_in_reminders',
  notifyUnreadDigest: 'portal_notify_unread_digest',
  notifyAppointmentReminders: 'portal_notify_appointment_reminders',
} as const satisfies Record<
  PortalNotificationPreferenceKey,
  | 'portal_notify_messages'
  | 'portal_notify_check_in_reviews'
  | 'portal_notify_form_review_replies'
  | 'portal_notify_team_updates'
  | 'portal_notify_workout_reminders'
  | 'portal_notify_check_in_reminders'
  | 'portal_notify_unread_digest'
  | 'portal_notify_appointment_reminders'
>

export type PortalClientNotificationTarget = {
  clientId: string
  clientUserId: string
  clientName: string
  clientEmail: string
}

export async function getPortalClientNotificationTarget(
  clientId: string
): Promise<PortalClientNotificationTarget | null> {
  const admin = createAdminClient()
  if (!admin) {
    return null
  }

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, user_id, full_name, email')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client?.user_id) {
    return null
  }

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(client.user_id)

  const clientEmail =
    authUser?.user?.email?.trim() || client.email?.trim() || null

  if (authError || !clientEmail) {
    return null
  }

  return {
    clientId: client.id,
    clientUserId: client.user_id,
    clientName: client.full_name?.trim() || 'Client',
    clientEmail,
  }
}

export async function isPortalClientNotificationEnabled(
  clientUserId: string,
  key: PortalNotificationPreferenceKey
): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) {
    return false
  }

  const column = preferenceColumnByKey[key]
  const { data: profile, error } = await admin
    .from('profiles')
    .select(
      'portal_notify_messages, portal_notify_check_in_reviews, portal_notify_form_review_replies, portal_notify_team_updates, portal_notify_workout_reminders, portal_notify_check_in_reminders, portal_notify_unread_digest, portal_notify_appointment_reminders'
    )
    .eq('id', clientUserId)
    .maybeSingle()

  if (error || !profile) {
    return false
  }

  return profile[column] === true
}
