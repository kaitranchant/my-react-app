'use server'

import { revalidatePath } from 'next/cache'

import { linkClientInviteAsAdmin } from '@/lib/auth/client-invite-signup'
import { setActiveSurfaceCookie } from '@/lib/app-surface-server'
import { getLinkedClientForUser } from '@/lib/portal-client'
import { requireUser } from '@/lib/gym-access'

export async function acceptClientInvite(
  token: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await requireUser()

  const existing = await getLinkedClientForUser(supabase, user.id)
  if (existing) {
    if (existing.is_coach_self) {
      return {
        success: false,
        error:
          'Your account is already linked for personal training in the client portal. Disconnect personal training before accepting a coach invite.',
      }
    }

    return {
      success: false,
      error: 'Your account is already linked to a client profile.',
    }
  }

  const linked = await linkClientInviteAsAdmin({
    inviteToken: token,
    userId: user.id,
    email: user.email ?? '',
  })

  if (!linked.ok) {
    return { success: false, error: linked.error }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'coach') {
    await setActiveSurfaceCookie('client')
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
