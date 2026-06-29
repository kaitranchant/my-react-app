import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createStripeCheckoutSession } from '@/lib/stripe/checkout'
import { isStripeConfigured } from '@/lib/stripe/config'

export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const result = await createStripeCheckoutSession(
    body as Parameters<typeof createStripeCheckoutSession>[0]
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ url: result.url })
}
