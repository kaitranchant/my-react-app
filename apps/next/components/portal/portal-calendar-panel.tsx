'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  getPortalCalendarMonthSummaries,
  getPortalWorkoutWithExercises,
} from '@/app/portal/actions'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
import { PrintWorkoutButton } from '@/components/calendar/print-workout-button'
import { WorkoutLogModal } from '@/components/calendar/workout-log-modal'
import { Button } from '@/components/ui/button'
import { coerceDateKey, formatDayHeader, toDateKey } from '@/lib/calendar'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { openWorkoutLog } from '@/lib/open-workout-log'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
  WeightUnit,
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
  weightUnit?: WeightUnit
}

function getMonthCacheKey(targetYear: number, targetMonth: number) {
  return `${targetYear}-${targetMonth}`
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
  weightUnit = 'lbs',
}: PortalCalendarPanelProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [year, setYear] = React.useState(initialYear)
  const [month, setMonth] = React.useState(initialMonth)
  const [selectedDate, setSelectedDate] = React.useState(initialSelectedDate)
  const [scheduledDays, setScheduledDays] = React.useState(initialDays)
  const [workout, setWorkout] =
    React.useState<ClientScheduledWorkoutWithExercises | null>(initialWorkout)
  const [loading, setLoading] = React.useState(false)
  const [workoutLoading, setWorkoutLoading] = React.useState(false)
  const monthCacheRef = React.useRef(
    new Map<string, CalendarDaySummary[]>([
      [getMonthCacheKey(initialYear, initialMonth), initialDays],
    ])
  )
  const [logOpen, setLogOpen] = React.useState(false)
  const handledActionRef = React.useRef<string | null>(null)

  const selectedDaySummary = React.useMemo(
    () => scheduledDays.find((day) => day.scheduled_date === selectedDate),
    [scheduledDays, selectedDate]
  )

  const displayWorkout =
    workout?.scheduled_date === selectedDate ? workout : null

  function invalidateMonthCache(targetYear?: number, targetMonth?: number) {
    if (targetYear !== undefined && targetMonth !== undefined) {
      monthCacheRef.current.delete(getMonthCacheKey(targetYear, targetMonth))
      return
    }

    monthCacheRef.current.clear()
  }

  async function ensureMonthDays(
    targetYear: number,
    targetMonth: number,
    options?: { force?: boolean }
  ): Promise<CalendarDaySummary[] | null> {
    const cacheKey = getMonthCacheKey(targetYear, targetMonth)
    if (!options?.force && monthCacheRef.current.has(cacheKey)) {
      return monthCacheRef.current.get(cacheKey)!
    }

    setLoading(true)
    const result = await getPortalCalendarMonthSummaries(targetYear, targetMonth)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return null
    }

    monthCacheRef.current.set(cacheKey, result.days)
    return result.days
  }

  async function loadSelectedDayWorkout(
    dateKey: string,
    workoutId: string
  ): Promise<ClientScheduledWorkoutWithExercises | null> {
    if (workout?.id === workoutId && workout.scheduled_date === dateKey) {
      return workout
    }

    setWorkoutLoading(true)
    const result = await getPortalWorkoutWithExercises(workoutId)
    setWorkoutLoading(false)

    if (!result.success) {
      toast.error(result.error)
      setWorkout(null)
      return null
    }

    setWorkout(result.workout)
    return result.workout
  }

  function openLogWorkout(
    workoutToLog: ClientScheduledWorkoutWithExercises | null = workout
  ) {
    if (!workoutToLog) return

    openWorkoutLog({
      router,
      isMobile,
      workoutId: workoutToLog.id,
      selectedDate,
      context: { variant: 'client' },
      openModal: () => setLogOpen(true),
    })
  }

  async function refreshCalendar(
    nextYear = year,
    nextMonth = month,
    nextSelectedDate = selectedDate
  ) {
    invalidateMonthCache(nextYear, nextMonth)
    const days = await ensureMonthDays(nextYear, nextMonth, { force: true })
    if (!days) {
      return null
    }

    setScheduledDays(days)

    const summary = days.find((day) => day.scheduled_date === nextSelectedDate)
    if (!summary) {
      setWorkout(null)
      return null
    }

    return loadSelectedDayWorkout(nextSelectedDate, summary.id)
  }

  async function handleMonthChange(nextYear: number, nextMonth: number) {
    setYear(nextYear)
    setMonth(nextMonth)

    const days = (await ensureMonthDays(nextYear, nextMonth)) ?? []
    setScheduledDays(days)

    const summary = days.find((day) => day.scheduled_date === selectedDate)
    if (summary) {
      if (workout?.scheduled_date !== selectedDate) {
        void loadSelectedDayWorkout(selectedDate, summary.id)
      }
      return
    }

    if (workout?.scheduled_date !== selectedDate) {
      setWorkout(null)
    }
  }

  async function handleSelectDate(dateKey: string) {
    if (logOpen && workout && workout.scheduled_date !== dateKey) {
      setLogOpen(false)
    }

    setSelectedDate(dateKey)

    const summary = scheduledDays.find((day) => day.scheduled_date === dateKey)
    if (!summary) {
      setWorkout(null)
      return
    }

    await loadSelectedDayWorkout(dateKey, summary.id)
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
          openLogWorkout(loadedWorkout)
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
    if (!displayWorkout) return 'Log workout'
    if (displayWorkout.status === 'completed') return 'View log'
    if (displayWorkout.status === 'skipped') return 'View workout'
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
          {displayWorkout || selectedDaySummary ? (
            <p className="text-muted-foreground truncate text-sm">
              {displayWorkout?.name ?? selectedDaySummary?.name}
              {displayWorkout && displayWorkout.exercises.length > 0 &&
                ` · ${displayWorkout.exercises.length} exercise${
                  displayWorkout.exercises.length === 1 ? '' : 's'
                }`}
              {' · '}
              {getWorkoutDisplayStatus(
                displayWorkout?.status ?? selectedDaySummary!.status,
                displayWorkout
                  ? workoutHasProgress(displayWorkout, [])
                  : workoutHasProgress(selectedDaySummary!, [])
              ).label}
              {workoutLoading && !displayWorkout && (
                <Loader2 className="ml-1 inline size-3 animate-spin" />
              )}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Rest day — no session scheduled</p>
          )}
        </div>

        {displayWorkout && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => openLogWorkout()}>
              <ClipboardList className="size-4" />
              {getLogButtonLabel()}
            </Button>
            <PrintWorkoutButton workout={displayWorkout} selectedDate={selectedDate} />
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

      {displayWorkout && !isMobile && (
        <WorkoutLogModal
          open={logOpen}
          onOpenChange={setLogOpen}
          clientId={clientId}
          selectedDate={selectedDate}
          workoutId={displayWorkout.id}
          initialStatus={displayWorkout.status}
          exercises={[]}
          variant="client"
          weightUnit={weightUnit}
          onChanged={() => refreshCalendar()}
        />
      )}
    </div>
  )
}
