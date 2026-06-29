import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createStripePortalSession } from '@/lib/stripe/checkout'
import { isStripeConfigured } from '@/lib/stripe/config'

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe billing is not configured.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await createStripePortalSession()
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ url: result.url })
}
