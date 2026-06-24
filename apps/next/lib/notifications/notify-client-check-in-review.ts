import { sendPortalCheckInReviewEmail } from '@/lib/email/portal-check-in-review-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'

export async function notifyClientOfCheckInReview(params: {
  clientId: string
  coachId: string
  checkInDate: string
  coachNotes?: string | null
}): Promise<void> {
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
}
