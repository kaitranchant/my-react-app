import { sendPortalFormReviewReplyEmail } from '@/lib/email/portal-form-review-reply-notification'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendPortalClientWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'
import { isCoachClientNotificationEnabled } from '@/lib/coach-client-notification-preferences'

export async function notifyClientOfFormReviewReply(params: {
  clientId: string
  coachId: string
  reviewTitle: string
  coachFeedback?: string | null
}): Promise<void> {
  const coachEnabled = await isCoachClientNotificationEnabled(
    params.coachId,
    'sendClientFormReviewReplies'
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
    'notifyFormReviewReplies'
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

  await sendPortalFormReviewReplyEmail({
    clientName: target.clientName,
    clientEmail: target.clientEmail,
    coachName,
    reviewTitle: params.reviewTitle,
    coachFeedback: params.coachFeedback,
  })

  await sendPortalClientWebPushNotification({
    clientUserId: target.clientUserId,
    preferenceKey: 'notifyFormReviewReplies',
    payload: {
      title: 'Form review feedback',
      body: `${coachName} replied to your form review.`,
      url: `${getAppBaseUrl()}/portal/form-review`,
      tag: `client-form-review-${params.clientId}`,
    },
  })
}
