import { NextResponse } from 'next/server'

import {
  completePendingClientInvite,
  readPendingInviteToken,
  repairClientInviteLinkForUser,
} from '@/lib/auth/client-invite-signup'
import { createClient } from '@/lib/supabase/server'
import { runOnboardingAutomationForUser } from '@/lib/client-onboarding-trigger'
import { getAppBaseUrl } from '@/lib/email/config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let destination = next
      if (user) {
        const pendingInviteToken = readPendingInviteToken(user.user_metadata)
        if (pendingInviteToken && user.email) {
          const linked = await completePendingClientInvite(supabase, {
            inviteToken: pendingInviteToken,
            userId: user.id,
            email: user.email,
          })

          if (!linked.ok) {
            const url = new URL('/signup', getAppBaseUrl())
            url.searchParams.set('invite', pendingInviteToken)
            url.searchParams.set('error', linked.error)
            return NextResponse.redirect(url.toString())
          }
        } else {
          await repairClientInviteLinkForUser(user)
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        destination = profile?.role === 'client' ? '/portal' : next
        if (profile?.role === 'client') {
          void runOnboardingAutomationForUser(user.id)
        }
      }

      return NextResponse.redirect(`${getAppBaseUrl()}${destination}`)
    }
  }

  return NextResponse.redirect(`${getAppBaseUrl()}/login?error=auth_callback_failed`)
}
