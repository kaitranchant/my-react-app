import { getPortalCalendarMonthData } from '@/app/portal/actions'
import { PortalCalendarPanel } from '@/components/portal/portal-calendar-panel'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { coerceDateKey, parseDateKey, toDateKey } from '@/lib/calendar'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getPortalWeightUnit } from '@/lib/coach-preferences-server'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type { CalendarDaySummary, ClientScheduledWorkoutWithExercises } from 'app/types/database'

export const metadata = {
  title: 'Workouts — Coaching App',
}

export default async function PortalWorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; action?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  const selectedDate = coerceDateKey(params.date) ?? toDateKey(new Date())
  const selectedDateObj = parseDateKey(selectedDate)
  const initialYear = selectedDateObj.getFullYear()
  const initialMonth = selectedDateObj.getMonth()

  let calendarDays: CalendarDaySummary[] = []
  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  let weightUnit = defaultCoachPreferences.weightUnit

  if (clientRecord?.id) {
    if (user) {
      weightUnit = await getPortalWeightUnit(user.id)
    }

    const calendarResult = await getPortalCalendarMonthData(
      initialYear,
      initialMonth,
      selectedDate
    )

    if (calendarResult.success) {
      calendarDays = calendarResult.data.days
      selectedWorkout = calendarResult.data.selectedWorkout
    }
  }

  const initialAction = params.action === 'log' ? ('log' as const) : null

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Workouts</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Tap a day to view your session, then log sets when you are ready.
        </p>
      </section>

      {!clientRecord ? (
        <PortalUnlinkedState feature="see your schedule and log workouts" />
      ) : (
        <PortalCalendarPanel
          clientId={clientRecord.id}
          initialYear={initialYear}
          initialMonth={initialMonth}
          initialSelectedDate={selectedDate}
          initialDays={calendarDays}
          initialWorkout={selectedWorkout}
          initialAction={initialAction}
          initialActionDate={selectedDate}
          weightUnit={weightUnit}
        />
      )}
    </div>
  )
}
