import { notFound } from 'next/navigation'

import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { WorkoutLogPage } from '@/components/calendar/workout-log-page'
import { coerceDateKey } from '@/lib/calendar'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getPortalWeightUnit } from '@/lib/coach-preferences-server'
import { getPortalClientContext } from '@/lib/portal-client'
import { getWorkoutLogReturnHref } from '@/lib/workout-log-routes'
import { createClient } from '@/lib/supabase/server'
import type { ScheduledWorkoutStatus } from 'app/types/database'

export const metadata = {
  title: 'Log Workout — Coaching App',
}

export default async function PortalWorkoutLogRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workoutId: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { workoutId } = await params
  const { date } = await searchParams
  const portalCtx = await getPortalClientContext()

  if (!portalCtx?.client?.id) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="page-title">Log workout</h1>
        </section>
        <PortalUnlinkedState feature="log workouts" />
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: workout } = await supabase
    .from('client_scheduled_workouts')
    .select('id, status, scheduled_date')
    .eq('id', workoutId)
    .eq('client_id', portalCtx.client.id)
    .maybeSingle()

  if (!workout) {
    notFound()
  }

  const selectedDate = coerceDateKey(date) ?? workout.scheduled_date
  const weightUnit = user
    ? await getPortalWeightUnit(user.id)
    : defaultCoachPreferences.weightUnit

  return (
    <WorkoutLogPage
      clientId={portalCtx.client.id}
      workoutId={workout.id}
      selectedDate={selectedDate}
      initialStatus={workout.status as ScheduledWorkoutStatus}
      exercises={[]}
      variant="client"
      athleteName={portalCtx.client.full_name}
      weightUnit={weightUnit}
      returnHref={getWorkoutLogReturnHref(selectedDate, { variant: 'client' })}
    />
  )
}
