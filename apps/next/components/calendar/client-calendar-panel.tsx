'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarDays,
  ClipboardList,
  Copy,
  LibraryBig,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  copyScheduledWorkoutToDate,
  copyScheduledWorkoutToDateRange,
  createScheduledWorkout,
  deleteScheduledWorkout,
  getCalendarCopyTargetClients,
  getCalendarMonthSummaries,
  getClientWorkoutWithExercises,
  getSchedulableWorkoutTemplates,
  scheduleProgramWorkoutTemplateToDate,
  type CalendarCopyTargetClient,
  type SchedulableWorkoutTemplate,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
import { PrintWorkoutButton } from '@/components/calendar/print-workout-button'
import { SelectWorkoutDialog } from '@/components/calendar/select-workout-dialog'
import { WorkoutBuilderModal } from '@/components/calendar/workout-builder-modal'
import { WorkoutLogModal } from '@/components/calendar/workout-log-modal'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useHorizontalSwipeNavigation } from '@/lib/hooks/use-horizontal-swipe-navigation'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { openWorkoutLog } from '@/lib/open-workout-log'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  addDaysToDateKey,
  ALL_WEEKDAY_VALUES,
  coerceDateKey,
  formatDayHeader,
  getMatchingDatesInRange,
  parseDateKey,
  toDateKey,
  WEEKDAY_OPTIONS,
} from '@/lib/calendar'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import {
  getSummariesForDate,
  pickSummaryForDate,
} from '@/lib/calendar-workouts'
import {
  scheduledWorkoutFormSchema,
  type ScheduledWorkoutFormValues,
} from '@/lib/validations/calendar'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  Workout,
} from 'app/types/database'

type CalendarQuickAction = 'log' | 'schedule'

function getMonthCacheKey(targetYear: number, targetMonth: number) {
  return `${targetYear}-${targetMonth}`
}

type ClientCalendarPanelProps = {
  clientId: string
  clientName: string
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  libraryWorkouts: Pick<Workout, 'id' | 'name' | 'status'>[]
  schemaError?: string | null
  initialYear: number
  initialMonth: number
  initialSelectedDate: string
  initialDays: CalendarDaySummary[]
  initialWorkout: ClientScheduledWorkoutWithExercises | null
  initialAction?: CalendarQuickAction | null
  initialActionDate?: string | null
  onActionConsumed?: () => void
  personalMode?: boolean
  weightUnit?: import('app/types/database').WeightUnit
}

export function ClientCalendarPanel({
  clientId,
  clientName,
  exercises,
  libraryWorkouts,
  schemaError = null,
  initialYear,
  initialMonth,
  initialSelectedDate,
  initialDays,
  initialWorkout,
  initialAction = null,
  initialActionDate = null,
  onActionConsumed,
  personalMode = false,
  weightUnit = 'lbs',
}: ClientCalendarPanelProps) {
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
  const [pending, setPending] = React.useState(false)
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [openBuilderForDate, setOpenBuilderForDate] = React.useState<
    string | null
  >(null)
  const [logOpen, setLogOpen] = React.useState(false)
  const [logPickerOpen, setLogPickerOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createDialogDate, setCreateDialogDate] = React.useState(initialSelectedDate)
  const [copyOpen, setCopyOpen] = React.useState(false)
  const [copyMode, setCopyMode] = React.useState<'single' | 'range'>('single')
  const [copySingleDate, setCopySingleDate] = React.useState('')
  const [copyStartDate, setCopyStartDate] = React.useState('')
  const [copyEndDate, setCopyEndDate] = React.useState('')
  const [copyWeekdays, setCopyWeekdays] = React.useState<number[]>([
    ...ALL_WEEKDAY_VALUES,
  ])
  const [copyTargetClientId, setCopyTargetClientId] = React.useState(clientId)
  const [copyTargetClients, setCopyTargetClients] = React.useState<
    CalendarCopyTargetClient[]
  >([])
  const [copyClientsLoading, setCopyClientsLoading] = React.useState(false)
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [libraryDate, setLibraryDate] = React.useState(initialSelectedDate)
  const [libraryTemplateKey, setLibraryTemplateKey] = React.useState('')
  const [createTemplateKey, setCreateTemplateKey] = React.useState('')
  const [schedulableTemplates, setSchedulableTemplates] = React.useState<
    SchedulableWorkoutTemplate[]
  >([])
  const [templatesLoading, setTemplatesLoading] = React.useState(false)

  const deleteWorkoutConfirm = useConfirmDialog({
    title: 'Remove workout from calendar?',
    description: 'This removes the scheduled workout from this date.',
    confirmLabel: 'Remove workout',
    destructive: true,
    onConfirm: async () => {
      if (!workout) return

      setPending(true)
      const result = await deleteScheduledWorkout(clientId, workout.id)
      setPending(false)

      if (result.success) {
        toast.success('Workout removed.')
        setBuilderOpen(false)
        await refreshCalendar()
        return
      }

      toast.error(result.error)
      throw new Error(result.error)
    },
  })
  const [templatesError, setTemplatesError] = React.useState<string | null>(null)
  const handledActionRef = React.useRef<string | null>(null)

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
      context: { variant: 'coach', clientId },
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

  const defaultWorkoutName = personalMode
    ? 'My Workout'
    : `${clientName.split(' ')[0]} Workout`

  const createForm = useForm<ScheduledWorkoutFormValues>({
    resolver: zodResolver(scheduledWorkoutFormSchema),
    defaultValues: {
      name: defaultWorkoutName,
      notes: '',
    },
  })

  React.useEffect(() => {
    if (openBuilderForDate && workout?.scheduled_date === openBuilderForDate) {
      setOpenBuilderForDate(null)
      setBuilderOpen(true)
    }
  }, [openBuilderForDate, workout])

  const copyTargetCount = React.useMemo(() => {
    if (!copyStartDate || !copyEndDate || copyWeekdays.length === 0) {
      return 0
    }

    const excludeDates =
      copyTargetClientId === clientId && workout
        ? [workout.scheduled_date]
        : []

    return getMatchingDatesInRange(copyStartDate, copyEndDate, copyWeekdays, {
      excludeDates,
    }).length
  }, [
    copyStartDate,
    copyEndDate,
    copyWeekdays,
    workout,
    copyTargetClientId,
    clientId,
  ])

  const copyTargetClientName = React.useMemo(() => {
    if (copyTargetClientId === clientId) {
      return clientName
    }
    return (
      copyTargetClients.find((entry) => entry.id === copyTargetClientId)
        ?.full_name ?? 'selected client'
    )
  }, [copyTargetClientId, clientId, clientName, copyTargetClients])

  const showCopyClientPicker =
    !personalMode && copyTargetClients.length > 1

  const copySingleDateConflict =
    copyTargetClientId === clientId &&
    workout != null &&
    copySingleDate === workout.scheduled_date

  const loadSchedulableTemplates = React.useCallback(async () => {
    setTemplatesLoading(true)
    const result = await getSchedulableWorkoutTemplates()
    setTemplatesLoading(false)

    if (!result.success) {
      setTemplatesError(result.error)
      return
    }

    setTemplatesError(null)
    setSchedulableTemplates(result.templates)
  }, [])

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
    const result = await getCalendarMonthSummaries(
      clientId,
      targetYear,
      targetMonth
    )
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
    const result = await getClientWorkoutWithExercises(clientId, workoutId)
    setWorkoutLoading(false)

    if (!result.success) {
      toast.error(result.error)
      setWorkout(null)
      return null
    }

    setWorkout(result.workout)
    return result.workout
  }

  function formatTemplateLabel(template: SchedulableWorkoutTemplate) {
    const exerciseLabel =
      template.exerciseCount === 1
        ? '1 exercise'
        : `${template.exerciseCount} exercises`
    return template.exerciseCount > 0
      ? `${template.name} (${exerciseLabel})`
      : template.name
  }

  async function finalizeScheduledWorkout(scheduleDate: string) {
    setSelectedDate(scheduleDate)
    const targetDate = parseDateKey(scheduleDate)
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth()
    if (targetYear !== year || targetMonth !== month) {
      setYear(targetYear)
      setMonth(targetMonth)
    }
    await refreshCalendar(targetYear, targetMonth, scheduleDate)
    setBuilderOpen(true)
  }

  async function scheduleFromTemplate(
    templateKey: string,
    scheduleDate: string,
    fallbackName?: string
  ) {
    const template = schedulableTemplates.find((item) => item.key === templateKey)
    if (!template) {
      toast.error('Select a workout template.')
      return false
    }

    setPending(true)
    const result =
      template.source === 'program'
        ? await scheduleProgramWorkoutTemplateToDate(
            clientId,
            template.id,
            scheduleDate
          )
        : await createScheduledWorkout(
            clientId,
            scheduleDate,
            {
              name: fallbackName?.trim() || template.name,
              notes: '',
            },
            template.libraryWorkoutId
          )
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return false
    }

    toast.success('Workout added to calendar.')
    await finalizeScheduledWorkout(scheduleDate)
    return true
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

  async function handleDayDoubleClick(dateKey: string) {
    setSelectedDate(dateKey)

    const summaries = getSummariesForDate(scheduledDays, dateKey)
    if (summaries.length === 0) {
      openCreateDialog(dateKey)
      return
    }

    const summary = pickSummaryForDate(summaries, selectedWorkoutId)
    setSelectedWorkoutId(summary!.id)

    if (workout?.scheduled_date === dateKey && workout.id === summary?.id) {
      setBuilderOpen(true)
      return
    }

    setOpenBuilderForDate(dateKey)
    const loaded = await loadSelectedDayWorkout(dateKey, summary!.id)
    if (!loaded) {
      setOpenBuilderForDate(null)
    }
  }

  function openCreateDialog(forDate?: string) {
    const dateKey = coerceDateKey(forDate) ?? selectedDate
    setCreateDialogDate(dateKey)
    if (forDate) {
      setSelectedDate(dateKey)
    }
    createForm.reset({
      name: defaultWorkoutName,
      notes: '',
    })
    setCreateTemplateKey('')
    void loadSchedulableTemplates()
    setCreateOpen(true)
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
      const targetDate = parseDateKey(dateKey)

      if (Number.isNaN(targetDate.getTime())) {
        onActionConsumed?.()
        return
      }

      const targetYear = targetDate.getFullYear()
      const targetMonth = targetDate.getMonth()

      setSelectedDate(dateKey)
      if (targetYear !== year || targetMonth !== month) {
        setYear(targetYear)
        setMonth(targetMonth)
      }

      const calendarResult = await refreshCalendar(
        targetYear,
        targetMonth,
        dateKey
      )

      if (cancelled) return

      if (initialAction === 'log') {
        const summaries = calendarResult?.summaries ?? []
        if (summaries.length > 1) {
          setLogPickerOpen(true)
        } else if (calendarResult?.workout) {
          openLogWorkout(calendarResult.workout)
        } else {
          toast.error(
            `No workout scheduled for ${formatDayHeader(dateKey)}.`
          )
          openCreateDialog(dateKey)
        }
      } else if (initialAction === 'schedule') {
        openCreateDialog(dateKey)
      }

      onActionConsumed?.()
    }

    void runQuickAction()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per URL action
  }, [initialAction, initialActionDate])

  function openCopyDialog() {
    const today = toDateKey(new Date())
    setCopyMode('single')
    setCopySingleDate(addDaysToDateKey(selectedDate, 1))
    setCopyStartDate(today)
    setCopyEndDate(addDaysToDateKey(today, 28))
    setCopyWeekdays([...ALL_WEEKDAY_VALUES])
    setCopyTargetClientId(clientId)
    setCopyOpen(true)

    if (personalMode) {
      setCopyTargetClients([])
      return
    }

    setCopyClientsLoading(true)
    void getCalendarCopyTargetClients(clientId).then((result) => {
      setCopyClientsLoading(false)
      if (result.success) {
        setCopyTargetClients(result.clients)
        return
      }
      toast.error(result.error)
    })
  }

  function toggleCopyWeekday(weekday: number) {
    setCopyWeekdays((current) => {
      if (current.includes(weekday)) {
        return current.filter((value) => value !== weekday)
      }
      return [...current, weekday].sort((a, b) => a - b)
    })
  }

  async function handleCreateWorkout(
    values: ScheduledWorkoutFormValues,
    templateKey?: string
  ) {
    const scheduleDate = coerceDateKey(createDialogDate)
    if (!scheduleDate) {
      toast.error('Pick a valid date.')
      return
    }

    if (templateKey) {
      setCreateOpen(false)
      await scheduleFromTemplate(templateKey, scheduleDate, values.name)
      return
    }

    const parsed = scheduledWorkoutFormSchema.safeParse(values)
    if (!parsed.success) {
      toast.error('Enter a workout name.')
      return
    }

    setPending(true)
    const result = await createScheduledWorkout(
      clientId,
      scheduleDate,
      parsed.data,
      null
    )
    setPending(false)

    if (result.success) {
      toast.success('Workout scheduled.')
      setCreateOpen(false)
      await finalizeScheduledWorkout(scheduleDate)
      return
    }

    toast.error(result.error)
  }

  function openLibraryDialog(forDate?: string) {
    const dateKey = coerceDateKey(forDate) ?? selectedDate
    setLibraryDate(dateKey)
    setLibraryTemplateKey('')
    void loadSchedulableTemplates()
    setLibraryOpen(true)
  }

  async function handleAddFromLibrary() {
    if (!libraryTemplateKey) {
      toast.error('Select a workout template.')
      return
    }

    const scheduleDate = coerceDateKey(libraryDate)
    if (!scheduleDate) {
      toast.error('Pick a valid date.')
      return
    }

    const scheduled = await scheduleFromTemplate(libraryTemplateKey, scheduleDate)
    if (scheduled) {
      setLibraryOpen(false)
    }
  }

  function handleDeleteWorkout() {
    if (!workout) return
    deleteWorkoutConfirm.open()
  }

  async function handleCopySingleDay() {
    if (!workout || !copySingleDate) return

    if (copySingleDateConflict) {
      toast.error('Pick a different day than the source workout.')
      return
    }

    setPending(true)
    const result = await copyScheduledWorkoutToDate(
      clientId,
      workout.id,
      copySingleDate,
      copyTargetClientId
    )
    setPending(false)

    if (result.success) {
      const destinationLabel =
        copyTargetClientId === clientId
          ? formatDayHeader(copySingleDate)
          : `${formatDayHeader(copySingleDate)} for ${copyTargetClientName}`
      toast.success(`Workout copied to ${destinationLabel}.`)
      setCopyOpen(false)
      await refreshCalendar()
      return
    }

    toast.error(result.error)
  }

  async function handleCopyDay() {
    if (!workout || !copyStartDate || !copyEndDate || copyWeekdays.length === 0) {
      return
    }

    if (copyStartDate > copyEndDate) {
      toast.error('Start date must be on or before end date.')
      return
    }

    setPending(true)
    const result = await copyScheduledWorkoutToDateRange(
      clientId,
      workout.id,
      copyStartDate,
      copyEndDate,
      copyWeekdays,
      copyTargetClientId
    )
    setPending(false)

    if (result.success) {
      const skippedMessage =
        result.skippedCount > 0
          ? ` Skipped ${result.skippedCount} day${
              result.skippedCount === 1 ? '' : 's'
            } that already had workouts.`
          : ''
      const clientSuffix =
        copyTargetClientId === clientId ? '' : ` for ${copyTargetClientName}`
      toast.success(
        `Workout copied to ${result.copiedCount} day${
          result.copiedCount === 1 ? '' : 's'
        }${clientSuffix}.${skippedMessage}`
      )
      setCopyOpen(false)
      await refreshCalendar()
      return
    }

    toast.error(result.error)
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice
        tables={['client_scheduled_workouts', 'scheduled_workout_exercises']}
        sqlFile="apply-client-calendar.sql"
      />
    )
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
            <p className="text-muted-foreground text-sm">No workout scheduled</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" data-swipe-ignore="">
          {selectedDaySummaries.length > 0 ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleLogWorkoutClick}
              >
                <ClipboardList className="size-4" />
                {displayWorkout?.status === 'completed' ||
                activeDaySummary?.status === 'completed'
                  ? 'View log'
                  : displayWorkout?.status === 'skipped' ||
                      activeDaySummary?.status === 'skipped'
                    ? 'View workout'
                    : 'Log workout'}
              </Button>
              {displayWorkout && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBuilderOpen(true)}
                  >
                    <Pencil className="size-4" />
                    Edit workout
                  </Button>
                  <PrintWorkoutButton
                    workout={displayWorkout}
                    selectedDate={selectedDate}
                    subtitle={personalMode ? 'Personal training' : clientName}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openCopyDialog}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={pending}
                    onClick={handleDeleteWorkout}
                  >
                    <Trash2 className="size-4" />
                    Remove workout
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCreateDialog()}
              >
                <Plus className="size-4" />
                Add workout
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" onClick={() => openCreateDialog()}>
                <Plus className="size-4" />
                Schedule workout
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openLibraryDialog()}
              >
                <LibraryBig className="size-4" />
                Add from library
              </Button>
            </>
          )}
        </div>
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
        onDayDoubleClick={handleDayDoubleClick}
      />

      {workout && (
        <WorkoutBuilderModal
          open={builderOpen}
          onOpenChange={(open) => {
            setBuilderOpen(open)
            if (!open) {
              void refreshCalendar()
            }
          }}
          clientId={clientId}
          selectedDate={selectedDate}
          workout={workout}
          exercises={exercises}
          onChanged={async (nextWorkout) => {
            if (nextWorkout) {
              setWorkout(nextWorkout)
              return
            }
            await refreshCalendar()
          }}
          onCopy={openCopyDialog}
        />
      )}

      {!isMobile && (activeLogWorkout ?? workout) && (
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
          workoutId={(activeLogWorkout ?? workout)!.id}
          initialStatus={(activeLogWorkout ?? workout)!.status}
          exercises={exercises}
          onChanged={() => refreshCalendar()}
          weightUnit={weightUnit}
        />
      )}

      <SelectWorkoutDialog
        open={logPickerOpen}
        onOpenChange={setLogPickerOpen}
        workouts={selectedDaySummaries}
        onSelect={(workoutId) => void beginLogWorkout(workoutId)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a workout</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="text-brand size-5 shrink-0" />
            <p className="text-muted-foreground text-sm">
              {personalMode
                ? 'Create your session for the date below.'
                : `Create ${clientName}'s session for the date below.`}
            </p>
          </div>

          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((values) =>
                handleCreateWorkout(
                  values,
                  createTemplateKey || undefined
                )
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="schedule-date" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={createDialogDate}
                  onChange={(event) => setCreateDialogDate(event.target.value)}
                />
              </div>

              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout name</FormLabel>
                    <FormControl>
                      <Input placeholder="Push day, Legs, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Load from library</FormLabel>
                {templatesLoading ? (
                  <p className="text-muted-foreground text-sm">Loading templates…</p>
                ) : templatesError ? (
                  <p className="text-destructive text-sm">{templatesError}</p>
                ) : schedulableTemplates.length === 0 ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    No templates yet. Create workouts in{' '}
                    <Link
                      href="/library/workouts"
                      className="text-foreground font-medium underline underline-offset-2"
                    >
                      Library → Workouts
                    </Link>{' '}
                    or build sessions in a program, then return here.
                  </p>
                ) : (
                  <Select
                    onValueChange={(value) => {
                      setCreateTemplateKey(value)
                      const template = schedulableTemplates.find(
                        (item) => item.key === value
                      )
                      if (template) {
                        createForm.setValue('name', template.name)
                      }
                    }}
                    value={createTemplateKey || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional — pick a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulableTemplates.map((template) => (
                        <SelectItem key={template.key} value={template.key}>
                          {formatTemplateLabel(template)}
                          {template.subtitle ? ` · ${template.subtitle}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormItem>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Create & open builder
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy workout</DialogTitle>
          </DialogHeader>
          <Tabs
            value={copyMode}
            onValueChange={(value) =>
              setCopyMode(value as 'single' | 'range')
            }
            className="gap-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single day</TabsTrigger>
              <TabsTrigger value="range">Date range</TabsTrigger>
            </TabsList>

            {showCopyClientPicker ? (
              <div className="space-y-2">
                <label htmlFor="copy-target-client" className="text-sm font-medium">
                  Copy to client
                </label>
                <Select
                  value={copyTargetClientId}
                  onValueChange={setCopyTargetClientId}
                  disabled={copyClientsLoading || pending}
                >
                  <SelectTrigger id="copy-target-client">
                    <SelectValue
                      placeholder={
                        copyClientsLoading ? 'Loading clients…' : 'Select a client'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {copyTargetClients.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.full_name}
                        {entry.id === clientId ? ' (current)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <TabsContent value="single" className="mt-0 space-y-4">
              <div className="space-y-2">
                <label htmlFor="copy-single-date" className="text-sm font-medium">
                  Copy to date
                </label>
                <Input
                  id="copy-single-date"
                  type="date"
                  value={copySingleDate}
                  onChange={(event) => setCopySingleDate(event.target.value)}
                />
              </div>

              {copySingleDateConflict && (
                <p className="text-destructive text-sm">
                  Choose a day other than {formatDayHeader(workout!.scheduled_date)}.
                </p>
              )}

              {copySingleDate && !copySingleDateConflict && (
                <p className="text-muted-foreground text-sm">
                  Copy this workout to{' '}
                  <span className="text-foreground font-medium">
                    {formatDayHeader(copySingleDate)}
                  </span>
                  {copyTargetClientId !== clientId ? (
                    <>
                      {' '}
                      on{' '}
                      <span className="text-foreground font-medium">
                        {copyTargetClientName}
                      </span>
                      &apos;s calendar
                    </>
                  ) : null}
                  . Additional workouts can be scheduled on the same day.
                </p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={
                  pending ||
                  !copySingleDate ||
                  copySingleDateConflict ||
                  copyClientsLoading
                }
                onClick={handleCopySingleDay}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {copySingleDate
                  ? copyTargetClientId !== clientId
                    ? `Copy to ${copyTargetClientName}`
                    : `Copy to ${formatDayHeader(copySingleDate)}`
                  : 'Copy workout'}
              </Button>
            </TabsContent>

            <TabsContent value="range" className="mt-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="copy-start-date" className="text-sm font-medium">
                  Start date
                </label>
                <Input
                  id="copy-start-date"
                  type="date"
                  value={copyStartDate}
                  onChange={(event) => setCopyStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="copy-end-date" className="text-sm font-medium">
                  End date
                </label>
                <Input
                  id="copy-end-date"
                  type="date"
                  value={copyEndDate}
                  min={copyStartDate || undefined}
                  onChange={(event) => setCopyEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Days of the week</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {WEEKDAY_OPTIONS.map(({ label, value }) => {
                  const checked = copyWeekdays.includes(value)
                  return (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center justify-center rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
                        checked
                          ? 'border-brand bg-brand/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleCopyWeekday(value)}
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </div>

            {copyTargetCount > 0 && (
              <p className="text-muted-foreground text-sm">
                Up to {copyTargetCount} matching day
                {copyTargetCount === 1 ? '' : 's'} in this range
                {copyTargetClientId !== clientId
                  ? ` on ${copyTargetClientName}'s calendar`
                  : ''}
                . Days that already have workouts will be skipped.
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={
                pending ||
                !copyStartDate ||
                !copyEndDate ||
                copyWeekdays.length === 0 ||
                copyTargetCount === 0 ||
                copyClientsLoading
              }
              onClick={handleCopyDay}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {copyTargetCount > 0
                ? copyTargetClientId !== clientId
                  ? `Copy to ${copyTargetCount} day${
                      copyTargetCount === 1 ? '' : 's'
                    } for ${copyTargetClientName}`
                  : `Copy to ${copyTargetCount} day${
                      copyTargetCount === 1 ? '' : 's'
                    }`
                : 'Copy workout'}
            </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add from library</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-2">
            <LibraryBig className="text-brand size-5 shrink-0" />
            <p className="text-muted-foreground text-sm">
              {personalMode
                ? 'Pick a saved workout template and date to add it to your calendar.'
                : 'Pick a saved workout template and date to add it to the calendar.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="library-date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="library-date"
                type="date"
                value={libraryDate}
                onChange={(event) => setLibraryDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="library-workout" className="text-sm font-medium">
                Workout template
              </label>
              {templatesLoading ? (
                <p className="text-muted-foreground text-sm">Loading templates…</p>
              ) : templatesError ? (
                <p className="text-destructive text-sm">{templatesError}</p>
              ) : schedulableTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  No templates yet. Create workouts in{' '}
                  <Link
                    href="/library/workouts"
                    className="text-foreground font-medium underline underline-offset-2"
                  >
                    Library → Workouts
                  </Link>{' '}
                  or build sessions in a program first.
                </p>
              ) : (
                <Select
                  value={libraryTemplateKey || undefined}
                  onValueChange={setLibraryTemplateKey}
                >
                  <SelectTrigger id="library-workout">
                    <SelectValue placeholder="Select a workout template" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedulableTemplates.map((template) => (
                      <SelectItem key={template.key} value={template.key}>
                        {formatTemplateLabel(template)}
                        {template.subtitle ? ` · ${template.subtitle}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={
                pending ||
                templatesLoading ||
                !libraryTemplateKey ||
                schedulableTemplates.length === 0
              }
              onClick={handleAddFromLibrary}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add to calendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {deleteWorkoutConfirm.dialog}
    </div>
  )
}
