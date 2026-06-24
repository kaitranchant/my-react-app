import { NextResponse } from 'next/server'

import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { processPendingClientOnboarding } from '@/lib/client-onboarding-automation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured.' },
      { status: 500 }
    )
  }

  try {
    const results = await processPendingClientOnboarding(admin, { limit: 50 })
    const completed = results.filter((result) => result.status === 'completed').length
    const failed = results.filter((result) => result.status === 'failed').length
    const skipped = results.filter((result) => result.status === 'skipped').length

    return NextResponse.json({
      ok: failed === 0,
      completed,
      failed,
      skipped,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
