import { NextResponse } from 'next/server'

import { loadGlobalSearchIndex } from '@/lib/global-search.server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  const index = await loadGlobalSearchIndex(supabase, user.id)
  return NextResponse.json({ ok: true, index })
}
