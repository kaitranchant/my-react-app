import { sendPortalTeamUpdateEmail } from '@/lib/email/portal-team-update-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getPortalClientNotificationTarget,
  isPortalClientNotificationEnabled,
} from '@/lib/notifications/portal-client-notification-target'

export async function notifyTeamClientsOfAnnouncement(params: {
  teamId: string
  teamName: string
  coachId: string
  content: string
}): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    return
  }

  const { data: memberships, error: membershipsError } = await admin
    .from('team_members')
    .select('client_id')
    .eq('team_id', params.teamId)

  if (membershipsError || !memberships?.length) {
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

  const preview = params.content.trim()
  if (!preview) {
    return
  }

  await Promise.all(
    memberships.map(async (membership) => {
      const target = await getPortalClientNotificationTarget(membership.client_id)
      if (!target) {
        return
      }

      const enabled = await isPortalClientNotificationEnabled(
        target.clientUserId,
        'notifyTeamUpdates'
      )
      if (!enabled) {
        return
      }

      await sendPortalTeamUpdateEmail({
        clientName: target.clientName,
        clientEmail: target.clientEmail,
        teamName: params.teamName,
        coachName,
        headline: 'New announcement',
        preview,
      })
    })
  )
}
