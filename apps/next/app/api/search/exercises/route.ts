import { NextResponse } from 'next/server'

import { searchCoachExercises } from '@/lib/global-search.server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'You must be signed in.' },
      { status: 401 }
    )
  }

  const query = new URL(request.url).searchParams.get('q') ?? ''
  const results = await searchCoachExercises(supabase, user.id, query)
  return NextResponse.json({ ok: true, results })
}
