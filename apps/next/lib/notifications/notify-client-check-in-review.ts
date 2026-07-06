import { sendPortalCheckInReviewEmail } from '@/lib/email/portal-check-in-review-notification'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendPortalClientWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'
import { isCoachClientNotificationEnabled } from '@/lib/coach-client-notification-preferences'

export async function notifyClientOfCheckInReview(params: {
  clientId: string
  coachId: string
  checkInDate: string
  coachNotes?: string | null
}): Promise<void> {
  const coachEnabled = await isCoachClientNotificationEnabled(
    params.coachId,
    'sendClientCheckInReviews'
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
    'notifyCheckInReviews'
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

  await sendPortalCheckInReviewEmail({
    clientName: target.clientName,
    clientEmail: target.clientEmail,
    coachName,
    checkInDate: params.checkInDate,
    coachNotes: params.coachNotes,
  })

  await sendPortalClientWebPushNotification({
    clientUserId: target.clientUserId,
    preferenceKey: 'notifyCheckInReviews',
    payload: {
      title: 'Check-in feedback',
      body: `${coachName} reviewed your check-in.`,
      url: `${getAppBaseUrl()}/portal/progress`,
      tag: `client-check-in-review-${params.clientId}`,
    },
  })
}
