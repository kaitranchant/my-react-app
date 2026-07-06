import { sendPortalNutritionSetupRequestEmail } from '@/lib/email/portal-nutrition-setup-request'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendPortalClientWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'
import { isCoachClientNotificationEnabled } from '@/lib/coach-client-notification-preferences'

export async function notifyClientOfNutritionSetupRequest(params: {
  clientId: string
  coachId: string
}): Promise<void> {
  const coachEnabled = await isCoachClientNotificationEnabled(
    params.coachId,
    'sendClientNutritionSetup'
  )
  if (!coachEnabled) {
    return
  }

  const target = await getPortalClientNotificationTarget(params.clientId)
  if (!target) {
    return
  }

  const enabled = await isPortalClientNotificationEnabled(
    target.clientUserId,
    'notifyCoachMessages'
  )
  if (!enabled) {
    return
  }

  const admin = createAdminClient()
  if (!admin) {
    return
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', params.coachId)
    .maybeSingle()

  const coachName =
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    'Your coach'

  await sendPortalNutritionSetupRequestEmail({
    clientName: target.clientName,
    clientEmail: target.clientEmail,
    coachName,
  })

  await sendPortalClientWebPushNotification({
    clientUserId: target.clientUserId,
    preferenceKey: 'notifyCoachMessages',
    payload: {
      title: 'Nutrition setup form',
      body: `${coachName} sent you a nutrition setup form to complete.`,
      url: `${getAppBaseUrl()}/portal/nutrition?section=plan`,
      tag: `nutrition-setup-${params.clientId}`,
    },
  })
}
