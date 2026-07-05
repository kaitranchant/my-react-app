import { NextResponse } from 'next/server'

import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { finalizeCoachRecurringSeriesGoogleSync } from '@/lib/google-calendar/repair-series-sync'
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
      { error: 'Admin client unavailable.' },
      { status: 500 }
    )
  }

  const { data: seriesRows, error } = await admin
    .from('coaching_appointment_series')
    .select('coach_id')
    .eq('status', 'active')
    .is('max_week_index', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const coachIds = Array.from(
    new Set((seriesRows ?? []).map((row) => row.coach_id))
  )

  let coachesProcessed = 0
  let appointmentsBooked = 0
  let appointmentsSynced = 0

  for (const coachId of coachIds) {
    const result = await finalizeCoachRecurringSeriesGoogleSync(coachId)

    coachesProcessed += 1
    appointmentsBooked += result.horizonBooked
    appointmentsSynced += result.resyncedAppointments
  }

  return NextResponse.json({
    ok: true,
    coachesProcessed,
    appointmentsBooked,
    appointmentsSynced,
  })
}
