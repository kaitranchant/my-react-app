import { getAppBaseUrl } from '@/lib/email/config'
import { sendCoachWebPushNotification } from '@/lib/notifications/send-web-push-notification'

export async function notifyCoachOfNutritionSetupSubmission(params: {
  coachId: string
  clientId: string
  clientName: string
}): Promise<void> {
  await sendCoachWebPushNotification({
    coachId: params.coachId,
    preferenceKey: 'notifyCheckIns',
    payload: {
      title: 'Nutrition setup form submitted',
      body: `${params.clientName} completed their nutrition setup form.`,
      url: `${getAppBaseUrl()}/clients/${params.clientId}?tab=nutrition&section=setup`,
      tag: `nutrition-setup-${params.clientId}`,
    },
  })
}
