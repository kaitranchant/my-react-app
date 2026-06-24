import { sendPortalFormReviewReplyEmail } from '@/lib/email/portal-form-review-reply-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'

export async function notifyClientOfFormReviewReply(params: {
  clientId: string
  coachId: string
  reviewTitle: string
  coachFeedback?: string | null
}): Promise<void> {
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
}
