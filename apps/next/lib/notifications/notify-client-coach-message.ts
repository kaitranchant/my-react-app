import { sendPortalCoachMessageEmail } from '@/lib/email/portal-coach-message-notification'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendPortalClientWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'

export async function notifyClientOfCoachMessage(params: {
  clientId: string
  coachId: string
  messageBody: string
}): Promise<void> {
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

  await sendPortalCoachMessageEmail({
    clientName: target.clientName,
    clientEmail: target.clientEmail,
    coachName,
    messagePreview: params.messageBody.trim(),
  })

  const preview = params.messageBody.trim() || 'New message from your coach'
  await sendPortalClientWebPushNotification({
    clientUserId: target.clientUserId,
    preferenceKey: 'notifyCoachMessages',
    payload: {
      title: `Message from ${coachName}`,
      body: preview,
      url: `${getAppBaseUrl()}/portal/messages`,
      tag: `client-message-${params.clientId}`,
    },
  })
}
