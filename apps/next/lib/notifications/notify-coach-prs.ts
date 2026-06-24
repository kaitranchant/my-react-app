import { sendPrNotificationEmail } from '@/lib/email/pr-notification'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendCoachWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import type { NewPrSummary } from '@/lib/pr-records'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WeightUnit } from 'app/types/database'

export async function notifyCoachOfClientPrs(params: {
  coachId: string
  clientId: string
  clientName: string
  workoutName: string
  newPrs: NewPrSummary[]
  weightUnit?: WeightUnit
}): Promise<void> {
  if (params.newPrs.length === 0) {
    return
  }

  const admin = createAdminClient()
  if (!admin) {
    return
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('notify_prs, full_name, weight_unit')
    .eq('id', params.coachId)
    .maybeSingle()

  if (!profile?.notify_prs) {
    return
  }

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(params.coachId)

  const coachEmail = authUser?.user?.email?.trim()

  if (coachEmail) {
    await sendPrNotificationEmail({
      coachName: profile.full_name?.trim() || 'Coach',
      coachEmail,
      clientName: params.clientName,
      clientId: params.clientId,
      workoutName: params.workoutName,
      newPrs: params.newPrs,
      weightUnit: params.weightUnit ?? profile.weight_unit ?? 'lbs',
    })
  }

  const prCount = params.newPrs.length
  await sendCoachWebPushNotification({
    coachId: params.coachId,
    preferenceKey: 'notifyPrs',
    payload: {
      title: `${params.clientName} hit ${prCount} new PR${prCount === 1 ? '' : 's'}`,
      body: `During ${params.workoutName}`,
      url: `${getAppBaseUrl()}/clients/${params.clientId}`,
      tag: `coach-pr-${params.clientId}`,
    },
  })
}
