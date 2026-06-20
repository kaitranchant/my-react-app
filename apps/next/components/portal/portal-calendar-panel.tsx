'use client'

import * as React from 'react'
import { ClipboardList, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { getPortalCalendarMonthData } from '@/app/portal/actions'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
import { PrintWorkoutButton } from '@/components/calendar/print-workout-button'
import { WorkoutLogModal } from '@/components/calendar/workout-log-modal'
import { Button } from '@/components/ui/button'
import { coerceDateKey, formatDayHeader, toDateKey } from '@/lib/calendar'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
} from 'app/types/database'

type PortalCalendarPanelProps = {
  clientId: string
  initialYear: number
  initialMonth: number
  initialSelectedDate: string
  initialDays: CalendarDaySummary[]
  initialWorkout: ClientScheduledWorkoutWithExercises | null
  initialAction?: 'log' | null
  initialActionDate?: string | null
  onActionConsumed?: () => void
}

export function PortalCalendarPanel({
  clientId,
  initialYear,
  initialMonth,
  initialSelectedDate,
  initialDays,
  initialWorkout,
  initialAction = null,
  initialActionDate = null,
  onActionConsumed,
}: PortalCalendarPanelProps) {
  const [year, setYear] = React.useState(initialYear)
  const [month, setMonth] = React.useState(initialMonth)
  const [selectedDate, setSelectedDate] = React.useState(initialSelectedDate)
  const [scheduledDays, setScheduledDays] = React.useState(initialDays)
  const [workout, setWorkout] =
    React.useState<ClientScheduledWorkoutWithExercises | null>(initialWorkout)
  const [loading, setLoading] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)
  const handledActionRef = React.useRef<string | null>(null)

  async function refreshCalendar(
    nextYear = year,
    nextMonth = month,
    nextSelectedDate = selectedDate
  ) {
    setLoading(true)
    const result = await getPortalCalendarMonthData(
      nextYear,
      nextMonth,
      nextSelectedDate
    )
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return null
    }

    setScheduledDays(result.data.days)
    setWorkout(result.data.selectedWorkout)
    return result.data.selectedWorkout
  }

  async function handleMonthChange(nextYear: number, nextMonth: number) {
    setYear(nextYear)
    setMonth(nextMonth)
    await refreshCalendar(nextYear, nextMonth, selectedDate)
  }

  async function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey)
    await refreshCalendar(year, month, dateKey)
  }

  React.useEffect(() => {
    if (!initialAction) {
      handledActionRef.current = null
      return
    }

    const actionKey = `${initialAction}:${initialActionDate ?? ''}`
    if (handledActionRef.current === actionKey) return
    handledActionRef.current = actionKey

    let cancelled = false

    async function runQuickAction() {
      const dateKey =
        coerceDateKey(initialActionDate) ?? toDateKey(new Date())

      setSelectedDate(dateKey)
      const loadedWorkout = await refreshCalendar(year, month, dateKey)

      if (cancelled) return

      if (initialAction === 'log') {
        if (loadedWorkout) {
          setLogOpen(true)
        } else {
          toast.error(`No workout scheduled for ${formatDayHeader(dateKey)}.`)
        }
      }

      onActionConsumed?.()
    }

    void runQuickAction()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per URL action
  }, [initialAction, initialActionDate])

  function getLogButtonLabel() {
    if (!workout) return 'Log workout'
    if (workout.status === 'completed') return 'View log'
    if (workout.status === 'skipped') return 'Undo skip'
    if (workout.status === 'in_progress') return 'Continue log'
    if (workout.started_at) return 'Resume workout'
    return 'Log workout'
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">
            Selected day
          </p>
          <p className="font-semibold">{formatDayHeader(selectedDate)}</p>
          {workout ? (
            <p className="text-muted-foreground truncate text-sm">
              {workout.name}
              {workout.exercises.length > 0 &&
                ` · ${workout.exercises.length} exercise${
                  workout.exercises.length === 1 ? '' : 's'
                }`}
              {' · '}
              {getWorkoutDisplayStatus(
                workout.status,
                workoutHasProgress(workout, [])
              ).label}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Rest day — no session scheduled</p>
          )}
        </div>

        {workout && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => setLogOpen(true)}>
              <ClipboardList className="size-4" />
              {getLogButtonLabel()}
            </Button>
            <PrintWorkoutButton workout={workout} selectedDate={selectedDate} />
          </div>
        )}
      </div>

      <CalendarMonthGrid
        variant="full"
        year={year}
        month={month}
        selectedDate={selectedDate}
        scheduledDays={scheduledDays}
        loading={loading}
        onMonthChange={handleMonthChange}
        onSelectDate={handleSelectDate}
      />

      {loading && scheduledDays.length === 0 && (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading calendar…
        </div>
      )}

      {!loading && scheduledDays.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No sessions scheduled this month. Your coach will add workouts to your
          calendar.
        </p>
      )}

      {workout && (
        <WorkoutLogModal
          open={logOpen}
          onOpenChange={setLogOpen}
          clientId={clientId}
          selectedDate={selectedDate}
          workoutId={workout.id}
          initialStatus={workout.status}
          exercises={[]}
          variant="client"
          onChanged={() => refreshCalendar()}
        />
      )}
    </div>
  )
}
