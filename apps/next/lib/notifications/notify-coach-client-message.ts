import { getAppBaseUrl } from '@/lib/email/config'
import { sendCoachWebPushNotification } from '@/lib/notifications/send-web-push-notification'

export async function notifyCoachOfClientMessage(params: {
  coachId: string
  clientId: string
  clientName: string
  messagePreview: string
}): Promise<void> {
  const preview = params.messagePreview.trim() || 'New message'

  await sendCoachWebPushNotification({
    coachId: params.coachId,
    payload: {
      title: `Message from ${params.clientName}`,
      body: preview,
      url: `${getAppBaseUrl()}/clients/${params.clientId}/messages`,
      tag: `coach-message-${params.clientId}`,
    },
  })
}
