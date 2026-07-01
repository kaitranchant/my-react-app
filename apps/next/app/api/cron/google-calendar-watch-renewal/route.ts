import { NextResponse } from 'next/server'

import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { renewExpiringGoogleCalendarWatches } from '@/lib/google-calendar/watch'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await renewExpiringGoogleCalendarWatches()

  return NextResponse.json({
    ok: true,
    renewed: result.renewed,
    failed: result.failed,
  })
}
