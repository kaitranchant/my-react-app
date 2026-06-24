import { getAppBaseUrl } from '@/lib/email/config'
import { sendCoachWebPushNotification } from '@/lib/notifications/send-web-push-notification'

export async function notifyCoachOfClientCheckIn(params: {
  coachId: string
  clientId: string
  clientName: string
}): Promise<void> {
  await sendCoachWebPushNotification({
    coachId: params.coachId,
    preferenceKey: 'notifyCheckIns',
    payload: {
      title: 'New client check-in',
      body: `${params.clientName} submitted a wellness check-in.`,
      url: `${getAppBaseUrl()}/check-ins`,
      tag: `coach-check-in-${params.clientId}`,
    },
  })
}
