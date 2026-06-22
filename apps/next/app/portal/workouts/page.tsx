import { getPortalCalendarMonthData } from '@/app/portal/actions'
import { PortalCalendarPanel } from '@/components/portal/portal-calendar-panel'
import { Card, CardContent } from '@/components/ui/card'
import { coerceDateKey, parseDateKey, toDateKey } from '@/lib/calendar'
import { getPortalClientContext } from '@/lib/portal-client'
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
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  const selectedDate = coerceDateKey(params.date) ?? toDateKey(new Date())
  const selectedDateObj = parseDateKey(selectedDate)
  const initialYear = selectedDateObj.getFullYear()
  const initialMonth = selectedDateObj.getMonth()

  let calendarDays: CalendarDaySummary[] = []
  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null

  if (clientRecord?.id) {
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
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can see your schedule and log
            workouts.
          </CardContent>
        </Card>
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
        />
      )}
    </div>
  )
}
