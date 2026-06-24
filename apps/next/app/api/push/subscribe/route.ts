import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getVapidPublicKey } from '@/lib/web-push/config'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

export async function POST(request: Request) {
  if (!getVapidPublicKey()) {
    return NextResponse.json(
      { error: 'Web push is not configured.' },
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

  const body = await request.json().catch(() => null)
  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent')

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: userAgent,
    },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('push_subscriptions')) {
      return NextResponse.json(
        {
          error:
            'Database schema is out of date. Run supabase db push (hosted) or supabase db reset (local).',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
