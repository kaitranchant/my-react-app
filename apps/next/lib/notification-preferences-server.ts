import { parseNotificationPreferences } from '@/lib/notification-preferences'
import { createClient } from '@/lib/supabase/server'

export async function getNotificationPreferencesForUser(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'notify_check_ins, notify_form_reviews, notify_workout_completions, notify_missed_sessions, notify_invite_accepted, notify_prs, notify_weekly_summary, notify_appointment_reminders'
    )
    .eq('id', userId)
    .maybeSingle()

  return parseNotificationPreferences(data)
}
