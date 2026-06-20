'use client'

import * as React from 'react'
import Link from 'next/link'
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
  getCalendarMonthData,
  getSchedulableWorkoutTemplates,
  scheduleProgramWorkoutTemplateToDate,
  type SchedulableWorkoutTemplate,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
import { PrintWorkoutButton } from '@/components/calendar/print-workout-button'
import { WorkoutBuilderModal } from '@/components/calendar/workout-builder-modal'
import { WorkoutLogModal } from '@/components/calendar/workout-log-modal'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
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
}: ClientCalendarPanelProps) {
  const [year, setYear] = React.useState(initialYear)
  const [month, setMonth] = React.useState(initialMonth)
  const [selectedDate, setSelectedDate] = React.useState(initialSelectedDate)
  const [scheduledDays, setScheduledDays] = React.useState(initialDays)
  const [workout, setWorkout] =
    React.useState<ClientScheduledWorkoutWithExercises | null>(initialWorkout)
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [openBuilderForDate, setOpenBuilderForDate] = React.useState<
    string | null
  >(null)
  const [logOpen, setLogOpen] = React.useState(false)
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
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [libraryDate, setLibraryDate] = React.useState(initialSelectedDate)
  const [libraryTemplateKey, setLibraryTemplateKey] = React.useState('')
  const [createTemplateKey, setCreateTemplateKey] = React.useState('')
  const [schedulableTemplates, setSchedulableTemplates] = React.useState<
    SchedulableWorkoutTemplate[]
  >([])
  const [templatesLoading, setTemplatesLoading] = React.useState(false)
  const [templatesError, setTemplatesError] = React.useState<string | null>(null)
  const handledActionRef = React.useRef<string | null>(null)

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

    return getMatchingDatesInRange(copyStartDate, copyEndDate, copyWeekdays, {
      excludeDates: workout ? [workout.scheduled_date] : [],
    }).length
  }, [copyStartDate, copyEndDate, copyWeekdays, workout])

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

  React.useEffect(() => {
    void loadSchedulableTemplates()
  }, [loadSchedulableTemplates])

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
  ) {
    setLoading(true)
    const result = await getCalendarMonthData(
      clientId,
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

  async function handleDayDoubleClick(dateKey: string) {
    setSelectedDate(dateKey)

    const dayHasWorkout = scheduledDays.some(
      (day) => day.scheduled_date === dateKey
    )

    if (!dayHasWorkout) {
      openCreateDialog(dateKey)
      return
    }

    if (workout?.scheduled_date === dateKey) {
      setBuilderOpen(true)
      return
    }

    setOpenBuilderForDate(dateKey)
    const loaded = await refreshCalendar(year, month, dateKey)
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

      const loadedWorkout = await refreshCalendar(
        targetYear,
        targetMonth,
        dateKey
      )

      if (cancelled) return

      if (initialAction === 'log') {
        if (loadedWorkout) {
          setLogOpen(true)
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
    setCopyOpen(true)
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

  async function handleDeleteWorkout() {
    if (!workout) return
    if (!window.confirm('Remove this workout from the calendar?')) return

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
  }

  async function handleCopySingleDay() {
    if (!workout || !copySingleDate) return

    if (copySingleDate === workout.scheduled_date) {
      toast.error('Pick a different day than the source workout.')
      return
    }

    setPending(true)
    const result = await copyScheduledWorkoutToDate(
      clientId,
      workout.id,
      copySingleDate
    )
    setPending(false)

    if (result.success) {
      toast.success(`Workout copied to ${formatDayHeader(copySingleDate)}.`)
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
      copyWeekdays
    )
    setPending(false)

    if (result.success) {
      const skippedMessage =
        result.skippedCount > 0
          ? ` Skipped ${result.skippedCount} day${
              result.skippedCount === 1 ? '' : 's'
            } that already had workouts.`
          : ''
      toast.success(
        `Workout copied to ${result.copiedCount} day${
          result.copiedCount === 1 ? '' : 's'
        }.${skippedMessage}`
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
            <p className="text-muted-foreground text-sm">No workout scheduled</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {workout ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => setLogOpen(true)}
              >
                <ClipboardList className="size-4" />
                {workout.status === 'completed'
                  ? 'View log'
                  : workout.status === 'skipped'
                    ? 'Undo skip'
                    : workout.status === 'in_progress'
                      ? 'Continue log'
                      : workout.started_at
                        ? 'Resume workout'
                        : 'Log workout'}
              </Button>
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
                workout={workout}
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
                Clear day
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
        <>
          <WorkoutBuilderModal
            open={builderOpen}
            onOpenChange={setBuilderOpen}
            clientId={clientId}
            selectedDate={selectedDate}
            workout={workout}
            exercises={exercises}
            onChanged={() => refreshCalendar()}
            onCopy={openCopyDialog}
          />
          <WorkoutLogModal
            open={logOpen}
            onOpenChange={setLogOpen}
            clientId={clientId}
            selectedDate={selectedDate}
            workoutId={workout.id}
            initialStatus={workout.status}
            exercises={exercises}
            onChanged={() => refreshCalendar()}
          />
        </>
      )}

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
            <DialogTitle>Copy workout to dates</DialogTitle>
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

            <TabsContent value="single" className="mt-0 space-y-4">
              <div className="space-y-2">
                <label htmlFor="copy-single-date" className="text-sm font-medium">
                  Copy to
                </label>
                <Input
                  id="copy-single-date"
                  type="date"
                  value={copySingleDate}
                  onChange={(event) => setCopySingleDate(event.target.value)}
                />
              </div>

              {copySingleDate && workout && copySingleDate === workout.scheduled_date && (
                <p className="text-destructive text-sm">
                  Choose a day other than {formatDayHeader(workout.scheduled_date)}.
                </p>
              )}

              {copySingleDate &&
                workout &&
                copySingleDate !== workout.scheduled_date && (
                  <p className="text-muted-foreground text-sm">
                    Copy this workout to{' '}
                    <span className="text-foreground font-medium">
                      {formatDayHeader(copySingleDate)}
                    </span>
                    . If that day already has a workout, the copy will be
                    blocked.
                  </p>
                )}

              <Button
                type="button"
                className="w-full"
                disabled={
                  pending ||
                  !copySingleDate ||
                  (workout != null && copySingleDate === workout.scheduled_date)
                }
                onClick={handleCopySingleDay}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {copySingleDate
                  ? `Copy to ${formatDayHeader(copySingleDate)}`
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
                {copyTargetCount === 1 ? '' : 's'} in this range. Days that
                already have workouts will be skipped.
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
                copyTargetCount === 0
              }
              onClick={handleCopyDay}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {copyTargetCount > 0
                ? `Copy to ${copyTargetCount} day${copyTargetCount === 1 ? '' : 's'}`
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
    </div>
  )
}
