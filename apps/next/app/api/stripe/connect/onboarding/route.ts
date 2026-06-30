import { NextResponse } from 'next/server'

import { createConnectOnboardingUrl } from '@/lib/stripe/connect'
import { isStripeConfigured } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can connect Stripe.' },
      { status: 403 }
    )
  }

  try {
    const url = await createConnectOnboardingUrl(user.id)
    return NextResponse.json({ url })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not start onboarding.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
