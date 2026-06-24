import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { runOnboardingAutomationForUser } from '@/lib/client-onboarding-trigger'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
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

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
