import { NextResponse } from 'next/server'

import { isEmailDeliveryConfigured } from '@/lib/email/config'
import { sendWeeklySummaryEmail } from '@/lib/email/weekly-summary'
import {
  buildWeeklySummaryForCoach,
  listWeeklySummaryCoachIds,
} from '@/lib/notifications/weekly-summary-data'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { isAuthorizedCronRequest } from '@/lib/cron/auth'
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isEmailDeliveryConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Email delivery is not configured.',
    })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured.' },
      { status: 500 }
    )
  }

  const coachIds = await listWeeklySummaryCoachIds(admin)
  const results: {
    coachId: string
    status: 'sent' | 'skipped' | 'failed'
    error?: string
  }[] = []

  for (const coachId of coachIds) {
    const { data: authUser, error: authError } =
      await admin.auth.admin.getUserById(coachId)

    const coachEmail = authUser?.user?.email?.trim()
    if (authError || !coachEmail) {
      results.push({
        coachId,
        status: 'skipped',
        error: authError?.message ?? 'Coach email not found.',
      })
      continue
    }

    try {
      const summary = await buildWeeklySummaryForCoach(
        admin,
        coachId,
        coachEmail
      )

      if (!summary) {
        results.push({ coachId, status: 'skipped' })
        continue
      }

      const sendResult = await sendWeeklySummaryEmail(summary)
      if (!sendResult.ok) {
        results.push({
          coachId,
          status: sendResult.skipped ? 'skipped' : 'failed',
          error: sendResult.error,
        })
        continue
      }

      results.push({ coachId, status: 'sent' })
    } catch (error) {
      results.push({
        coachId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const sent = results.filter((result) => result.status === 'sent').length
  const failed = results.filter((result) => result.status === 'failed').length
  const skipped = results.filter((result) => result.status === 'skipped').length

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    skipped,
    results,
  })
}
