import { NextResponse } from 'next/server'

import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { isEmailDeliveryConfigured } from '@/lib/email/config'
import { sendClientEmailNudges } from '@/lib/notifications/client-nudges-data'
import { sendAppointmentReminders } from '@/lib/notifications/appointment-reminders-data'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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

  try {
    const [nudgeResults, appointmentResults] = await Promise.all([
      sendClientEmailNudges(admin),
      sendAppointmentReminders(admin),
    ])
    const results = [...nudgeResults, ...appointmentResults]
    const sent = results.filter((result) => result.status === 'sent').length
    const failed = results.filter((result) => result.status === 'failed').length
    const skipped = results.filter((result) => result.status === 'skipped').length

    return NextResponse.json({
      ok: failed === 0,
      sent,
      failed,
      skipped,
      nudges: nudgeResults,
      appointmentReminders: appointmentResults,
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
