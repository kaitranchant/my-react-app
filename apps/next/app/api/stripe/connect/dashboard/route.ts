import { NextResponse } from 'next/server'

import { createConnectDashboardLink } from '@/lib/stripe/connect'
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
    .select('role, stripe_connect_account_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') {
    return NextResponse.json(
      { error: 'Only coach accounts can open the Stripe dashboard.' },
      { status: 403 }
    )
  }

  if (!profile.stripe_connect_account_id) {
    return NextResponse.json(
      { error: 'Connect your Stripe account first.' },
      { status: 400 }
    )
  }

  try {
    const url = await createConnectDashboardLink(user.id)
    return NextResponse.json({ url })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not open dashboard.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
