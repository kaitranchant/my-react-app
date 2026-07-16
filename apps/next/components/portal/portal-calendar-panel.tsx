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
import { SelectWorkoutDialog } from '@/components/calendar/select-workout-dialog'
import { WorkoutLogModal } from '@/components/calendar/workout-log-modal'
import { Button } from '@/components/ui/button'
import { coerceDateKey, formatDayHeader, addDaysToDateKey, parseDateKey, toDateKey } from '@/lib/calendar'
import {
  getSummariesForDate,
  pickSummaryForDate,
} from '@/lib/calendar-workouts'
import { useHorizontalSwipeNavigation } from '@/lib/hooks/use-horizontal-swipe-navigation'
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
  const [selectedWorkoutId, setSelectedWorkoutId] = React.useState<string | null>(
    initialWorkout?.id ?? null
  )
  const [activeLogWorkout, setActiveLogWorkout] =
    React.useState<ClientScheduledWorkoutWithExercises | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [workoutLoading, setWorkoutLoading] = React.useState(false)
  const monthCacheRef = React.useRef(
    new Map<string, CalendarDaySummary[]>([
      [getMonthCacheKey(initialYear, initialMonth), initialDays],
    ])
  )
  const [logOpen, setLogOpen] = React.useState(false)
  const [logPickerOpen, setLogPickerOpen] = React.useState(false)
  const handledActionRef = React.useRef<string | null>(null)

  const selectedDaySummaries = React.useMemo(
    () => getSummariesForDate(scheduledDays, selectedDate),
    [scheduledDays, selectedDate]
  )

  const activeDaySummary = React.useMemo(
    () => pickSummaryForDate(selectedDaySummaries, selectedWorkoutId),
    [selectedDaySummaries, selectedWorkoutId]
  )

  const displayWorkout =
    workout?.scheduled_date === selectedDate &&
    workout.id === activeDaySummary?.id
      ? workout
      : null

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

  async function beginLogWorkout(workoutId: string) {
    let workoutToLog =
      workout?.id === workoutId && workout.scheduled_date === selectedDate
        ? workout
        : activeLogWorkout?.id === workoutId
          ? activeLogWorkout
          : null

    if (!workoutToLog) {
      workoutToLog = await loadSelectedDayWorkout(selectedDate, workoutId)
    }

    if (!workoutToLog) return

    setActiveLogWorkout(workoutToLog)
    openWorkoutLog({
      router,
      isMobile,
      workoutId: workoutToLog.id,
      selectedDate,
      context: { variant: 'client' },
      openModal: () => setLogOpen(true),
    })
  }

  function openLogWorkout(
    workoutToLog: ClientScheduledWorkoutWithExercises | null = workout
  ) {
    if (!workoutToLog) return
    void beginLogWorkout(workoutToLog.id)
  }

  function handleLogWorkoutClick() {
    if (selectedDaySummaries.length > 1) {
      setLogPickerOpen(true)
      return
    }

    const summary = selectedDaySummaries[0]
    if (!summary) return
    void beginLogWorkout(summary.id)
  }

  async function refreshCalendar(
    nextYear = year,
    nextMonth = month,
    nextSelectedDate = selectedDate
  ): Promise<{
    workout: ClientScheduledWorkoutWithExercises | null
    summaries: CalendarDaySummary[]
  } | null> {
    invalidateMonthCache(nextYear, nextMonth)
    const days = await ensureMonthDays(nextYear, nextMonth, { force: true })
    if (!days) {
      return null
    }

    setScheduledDays(days)

    const summaries = getSummariesForDate(days, nextSelectedDate)
    if (summaries.length === 0) {
      setSelectedWorkoutId(null)
      setWorkout(null)
      return { workout: null, summaries }
    }

    const summary = pickSummaryForDate(summaries, selectedWorkoutId)
    setSelectedWorkoutId(summary!.id)
    const loadedWorkout = await loadSelectedDayWorkout(
      nextSelectedDate,
      summary!.id
    )
    return { workout: loadedWorkout, summaries }
  }

  async function handleMonthChange(nextYear: number, nextMonth: number) {
    setYear(nextYear)
    setMonth(nextMonth)

    const days = (await ensureMonthDays(nextYear, nextMonth)) ?? []
    setScheduledDays(days)

    const summaries = getSummariesForDate(days, selectedDate)
    if (summaries.length > 0) {
      const summary = pickSummaryForDate(summaries, selectedWorkoutId)
      if (workout?.scheduled_date !== selectedDate || workout.id !== summary?.id) {
        void loadSelectedDayWorkout(selectedDate, summary!.id)
      }
      return
    }

    if (workout?.scheduled_date !== selectedDate) {
      setWorkout(null)
    }
  }

  async function selectWorkout(workoutId: string) {
    setSelectedWorkoutId(workoutId)
    await loadSelectedDayWorkout(selectedDate, workoutId)
  }

  async function handleSelectDate(dateKey: string) {
    if (logOpen && workout && workout.scheduled_date !== dateKey) {
      setLogOpen(false)
    }

    selectedDateRef.current = dateKey
    setSelectedDate(dateKey)

    const summaries = getSummariesForDate(scheduledDays, dateKey)
    if (summaries.length === 0) {
      setSelectedWorkoutId(null)
      setWorkout(null)
      return
    }

    const summary = pickSummaryForDate(summaries, selectedWorkoutId)
    setSelectedWorkoutId(summary!.id)
    await loadSelectedDayWorkout(dateKey, summary!.id)
  }

  const selectedDateRef = React.useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const daySwipeGenerationRef = React.useRef(0)

  async function navigateSelectedDateByDays(delta: -1 | 1) {
    const generation = ++daySwipeGenerationRef.current
    const nextDate = addDaysToDateKey(selectedDateRef.current, delta)
    const parsed = parseDateKey(nextDate)
    const nextYear = parsed.getFullYear()
    const nextMonth = parsed.getMonth()

    if (logOpen && workout && workout.scheduled_date !== nextDate) {
      setLogOpen(false)
    }

    selectedDateRef.current = nextDate
    setSelectedDate(nextDate)

    let days = scheduledDays
    if (nextYear !== year || nextMonth !== month) {
      setYear(nextYear)
      setMonth(nextMonth)
      days = (await ensureMonthDays(nextYear, nextMonth)) ?? []
      if (generation !== daySwipeGenerationRef.current) return
      setScheduledDays(days)
    }

    if (generation !== daySwipeGenerationRef.current) return

    const summaries = getSummariesForDate(days, nextDate)
    if (summaries.length === 0) {
      setSelectedWorkoutId(null)
      setWorkout(null)
      return
    }

    const summary = pickSummaryForDate(summaries, selectedWorkoutId)
    setSelectedWorkoutId(summary!.id)
    await loadSelectedDayWorkout(nextDate, summary!.id)
  }

  const navigateSelectedDateByDaysRef = React.useRef(navigateSelectedDateByDays)
  navigateSelectedDateByDaysRef.current = navigateSelectedDateByDays

  const { swipeProps: daySwipeProps } = useHorizontalSwipeNavigation({
    enabled: isMobile,
    onPrevious: () => {
      void navigateSelectedDateByDaysRef.current(-1)
    },
    onNext: () => {
      void navigateSelectedDateByDaysRef.current(1)
    },
  })

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
      const calendarResult = await refreshCalendar(year, month, dateKey)

      if (cancelled) return

      if (initialAction === 'log') {
        const summaries = calendarResult?.summaries ?? []
        if (summaries.length > 1) {
          setLogPickerOpen(true)
        } else if (calendarResult?.workout) {
          openLogWorkout(calendarResult.workout)
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
    const status = displayWorkout?.status ?? activeDaySummary?.status
    if (!status) return 'Log workout'
    if (status === 'completed') return 'View log'
    if (status === 'skipped') return 'View workout'
    return 'Log workout'
  }

  return (
    <div className="touch-pan-y space-y-4" {...daySwipeProps}>
      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">
            Selected day
          </p>
          <p className="font-semibold">{formatDayHeader(selectedDate)}</p>
          {selectedDaySummaries.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedDaySummaries.map((summary) => (
                <Button
                  key={summary.id}
                  type="button"
                  size="sm"
                  variant={
                    activeDaySummary?.id === summary.id ? 'default' : 'outline'
                  }
                  className="h-7 max-w-full px-2 text-xs"
                  onClick={() => void selectWorkout(summary.id)}
                >
                  <span className="truncate">{summary.name}</span>
                </Button>
              ))}
            </div>
          )}
          {displayWorkout || activeDaySummary ? (
            <p className="text-muted-foreground truncate text-sm">
              {displayWorkout?.name ?? activeDaySummary?.name}
              {displayWorkout && displayWorkout.exercises.length > 0 &&
                ` · ${displayWorkout.exercises.length} exercise${
                  displayWorkout.exercises.length === 1 ? '' : 's'
                }`}
              {' · '}
              {getWorkoutDisplayStatus(
                displayWorkout?.status ?? activeDaySummary!.status,
                displayWorkout
                  ? workoutHasProgress(displayWorkout, [])
                  : workoutHasProgress(activeDaySummary!, [])
              ).label}
              {selectedDaySummaries.length > 1 && (
                <span className="ml-1">
                  · {selectedDaySummaries.length} workouts
                </span>
              )}
              {workoutLoading && !displayWorkout && (
                <Loader2 className="ml-1 inline size-3 animate-spin" />
              )}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Rest day — no session scheduled</p>
          )}
        </div>

        {selectedDaySummaries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-swipe-ignore="">
            <Button type="button" size="sm" onClick={handleLogWorkoutClick}>
              <ClipboardList className="size-4" />
              {getLogButtonLabel()}
            </Button>
            {displayWorkout && (
              <PrintWorkoutButton workout={displayWorkout} selectedDate={selectedDate} />
            )}
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

      {!isMobile && (activeLogWorkout ?? displayWorkout) && (
        <WorkoutLogModal
          open={logOpen}
          onOpenChange={(open) => {
            setLogOpen(open)
            if (!open) {
              setActiveLogWorkout(null)
            }
          }}
          clientId={clientId}
          selectedDate={selectedDate}
          workoutId={(activeLogWorkout ?? displayWorkout)!.id}
          initialStatus={(activeLogWorkout ?? displayWorkout)!.status}
          exercises={[]}
          variant="client"
          weightUnit={weightUnit}
          onChanged={() => refreshCalendar()}
        />
      )}

      <SelectWorkoutDialog
        open={logPickerOpen}
        onOpenChange={setLogPickerOpen}
        workouts={selectedDaySummaries}
        onSelect={(workoutId) => void beginLogWorkout(workoutId)}
      />
    </div>
  )
}
