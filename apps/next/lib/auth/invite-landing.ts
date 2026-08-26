import { getLinkedClientForUser } from '@/lib/portal-client'
import { getGymsForCoach } from '@/lib/gym-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function destinationIfClientInviteAlreadyLinked(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient()
  if (admin) {
    const { data } = await admin
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (data) {
      return '/portal'
    }

    return null
  }

  const supabase = await createClient()
  const linked = await getLinkedClientForUser(supabase, userId)
  if (linked) {
    return '/portal'
  }

  return null
}

export async function destinationIfGymInviteAlreadyLinked(
  userId: string,
  inviteToken: string
): Promise<string | null> {
  const admin = createAdminClient()

  if (admin) {
    const { data: invite } = await admin
      .from('gym_invites')
      .select('gym_id')
      .eq('invite_token', inviteToken)
      .maybeSingle()

    if (!invite?.gym_id) {
      return null
    }

    const { data: member } = await admin
      .from('gym_members')
      .select('id')
      .eq('gym_id', invite.gym_id)
      .eq('coach_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    return member ? `/gym?gym=${invite.gym_id}` : null
  }

  const gyms = await getGymsForCoach(userId)
  const gym = gyms[0]
  return gym ? `/gym?gym=${gym.id}` : null
}
