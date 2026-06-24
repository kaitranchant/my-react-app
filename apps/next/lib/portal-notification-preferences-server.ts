import { parsePortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import { createClient } from '@/lib/supabase/server'

const portalNotificationSelect =
  'portal_notify_messages, portal_notify_check_in_reviews, portal_notify_form_review_replies, portal_notify_team_updates, portal_notify_workout_reminders, portal_notify_check_in_reminders, portal_notify_unread_digest, portal_notify_appointment_reminders'

export async function getPortalNotificationPreferencesForUser(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(portalNotificationSelect)
    .eq('id', userId)
    .maybeSingle()

  return parsePortalNotificationPreferences(data)
}
