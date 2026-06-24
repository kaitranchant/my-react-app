import { parseNotificationPreferences } from '@/lib/notification-preferences'
import { parsePortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationPreferenceKey } from '@/lib/validations/notification-preferences'
import type { PortalNotificationPreferenceKey } from '@/lib/validations/portal-notification-preferences'
import { sendWebPushToUser } from '@/lib/web-push/send'
import type { WebPushPayload } from '@/lib/web-push/payload'

const coachNotificationSelect =
  'notify_check_ins, notify_form_reviews, notify_workout_completions, notify_missed_sessions, notify_invite_accepted, notify_prs, notify_weekly_summary, notify_appointment_reminders'

const portalNotificationSelect =
  'portal_notify_messages, portal_notify_check_in_reviews, portal_notify_form_review_replies, portal_notify_team_updates, portal_notify_workout_reminders, portal_notify_check_in_reminders, portal_notify_unread_digest, portal_notify_appointment_reminders'

export async function sendCoachWebPushNotification(params: {
  coachId: string
  preferenceKey?: NotificationPreferenceKey
  payload: WebPushPayload
}): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    return
  }

  if (params.preferenceKey) {
    const { data: profile } = await admin
      .from('profiles')
      .select(coachNotificationSelect)
      .eq('id', params.coachId)
      .maybeSingle()

    const preferences = parseNotificationPreferences(profile)
    if (!preferences[params.preferenceKey]) {
      return
    }
  }

  await sendWebPushToUser(params.coachId, params.payload)
}

export async function sendPortalClientWebPushNotification(params: {
  clientUserId: string
  preferenceKey: PortalNotificationPreferenceKey
  payload: WebPushPayload
}): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    return
  }

  const { data: profile } = await admin
    .from('profiles')
    .select(portalNotificationSelect)
    .eq('id', params.clientUserId)
    .maybeSingle()

  const preferences = parsePortalNotificationPreferences(profile)
  if (!preferences[params.preferenceKey]) {
    return
  }

  await sendWebPushToUser(params.clientUserId, params.payload)
}
