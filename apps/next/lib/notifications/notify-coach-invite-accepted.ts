import { sendInviteAcceptedNotificationEmail } from '@/lib/email/invite-accepted-notification'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendCoachWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import { createAdminClient } from '@/lib/supabase/admin'

export async function notifyCoachOfInviteAccepted(params: {
  coachId: string
  clientId: string
  clientName: string
  programAssigned?: boolean
}): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) {
    return false
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('notify_invite_accepted, full_name')
    .eq('id', params.coachId)
    .maybeSingle()

  if (!profile?.notify_invite_accepted) {
    return false
  }

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(params.coachId)

  const coachEmail = authUser?.user?.email?.trim()

  let emailSent = false
  if (coachEmail) {
    const result = await sendInviteAcceptedNotificationEmail({
      coachName: profile.full_name?.trim() || 'Coach',
      coachEmail,
      clientName: params.clientName,
      clientId: params.clientId,
      programAssigned: params.programAssigned,
    })
    emailSent = result.ok
  }

  await sendCoachWebPushNotification({
    coachId: params.coachId,
    preferenceKey: 'notifyInviteAccepted',
    payload: {
      title: `${params.clientName} joined your roster`,
      body: params.programAssigned
        ? 'Their invite was accepted and a program was assigned.'
        : 'Their portal invite was accepted.',
      url: `${getAppBaseUrl()}/clients/${params.clientId}`,
      tag: `coach-invite-${params.clientId}`,
    },
  })

  return emailSent
}
