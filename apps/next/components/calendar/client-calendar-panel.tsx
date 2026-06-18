'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  copyScheduledWorkoutToDateRange,
  createScheduledWorkout,
  deleteScheduledWorkout,
  getCalendarMonthData,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
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
  addDaysToDateKey,
  ALL_WEEKDAY_VALUES,
  formatDayHeader,
  getMatchingDatesInRange,
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
  const [logOpen, setLogOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [copyOpen, setCopyOpen] = React.useState(false)
  const [copyStartDate, setCopyStartDate] = React.useState('')
  const [copyEndDate, setCopyEndDate] = React.useState('')
  const [copyWeekdays, setCopyWeekdays] = React.useState<number[]>([
    ...ALL_WEEKDAY_VALUES,
  ])

  const createForm = useForm<ScheduledWorkoutFormValues>({
    resolver: zodResolver(scheduledWorkoutFormSchema),
    defaultValues: {
      name: `${clientName.split(' ')[0]} Workout`,
      notes: '',
    },
  })

  const copyTargetCount = React.useMemo(() => {
    if (!copyStartDate || !copyEndDate || copyWeekdays.length === 0) {
      return 0
    }

    return getMatchingDatesInRange(copyStartDate, copyEndDate, copyWeekdays, {
      excludeDates: workout ? [workout.scheduled_date] : [],
    }).length
  }, [copyStartDate, copyEndDate, copyWeekdays, workout])

  const loadableWorkouts = libraryWorkouts.filter(
    (item) => item.status !== 'archived'
  )

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
    const nextWorkout = await refreshCalendar(year, month, dateKey)

    if (nextWorkout) {
      setBuilderOpen(true)
    }
  }

  function openCreateDialog() {
    createForm.reset({
      name: `${clientName.split(' ')[0]} Workout`,
      notes: '',
    })
    setCreateOpen(true)
  }

  function openCopyDialog() {
    const today = toDateKey(new Date())
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
    libraryWorkoutId?: string
  ) {
    const parsed = scheduledWorkoutFormSchema.safeParse(values)
    if (!parsed.success) {
      toast.error('Enter a workout name.')
      return
    }

    if (libraryWorkoutId) {
      const libraryWorkout = loadableWorkouts.find(
        (item) => item.id === libraryWorkoutId
      )
      if (libraryWorkout) {
        parsed.data.name = libraryWorkout.name
      }
    }

    setPending(true)
    const result = await createScheduledWorkout(
      clientId,
      selectedDate,
      parsed.data,
      libraryWorkoutId ?? null
    )
    setPending(false)

    if (result.success) {
      toast.success('Workout scheduled.')
      setCreateOpen(false)
      await refreshCalendar()
      setBuilderOpen(true)
      return
    }

    toast.error(result.error)
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

      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openCopyDialog}
              >
                Copy to dates
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
            <Button type="button" size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Schedule workout
            </Button>
          )}
        </div>
      </div>

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
              Create {clientName}&apos;s session for{' '}
              <span className="text-foreground font-medium">
                {formatDayHeader(selectedDate)}
              </span>
            </p>
          </div>

          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((values) =>
                handleCreateWorkout(values)
              )}
              className="space-y-4"
            >
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

              {loadableWorkouts.length > 0 && (
                <FormItem>
                  <FormLabel>Load from library</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      handleCreateWorkout(createForm.getValues(), value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional — pick a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadableWorkouts.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}

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
          <div className="space-y-4">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
