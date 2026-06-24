import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const unsubscribeSchema = z.object({
  endpoint: z.string().url().optional(),
})

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = unsubscribeSchema.safeParse(body)

  let query = supabase.from('push_subscriptions').delete().eq('user_id', user.id)

  if (parsed.success && parsed.data.endpoint) {
    query = query.eq('endpoint', parsed.data.endpoint)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
