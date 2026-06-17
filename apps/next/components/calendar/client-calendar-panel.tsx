'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarDays,
  Loader2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  copyScheduledWorkoutToDateRange,
  createScheduledWorkout,
  deleteScheduledWorkout,
  getCalendarMonthData,
  updateScheduledWorkout,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
import { ScheduledWorkoutView } from '@/components/calendar/scheduled-workout-view'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import {
  addDaysToDateKey,
  ALL_WEEKDAY_VALUES,
  getMatchingDatesInRange,
  toDateKey,
  WEEKDAY_OPTIONS,
} from '@/lib/calendar'
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
  const [copyOpen, setCopyOpen] = React.useState(false)
  const [copyStartDate, setCopyStartDate] = React.useState('')
  const [copyEndDate, setCopyEndDate] = React.useState('')
  const [copyWeekdays, setCopyWeekdays] = React.useState<number[]>([
    ...ALL_WEEKDAY_VALUES,
  ])

  const copyTargetCount = React.useMemo(() => {
    if (!copyStartDate || !copyEndDate || copyWeekdays.length === 0) {
      return 0
    }

    return getMatchingDatesInRange(copyStartDate, copyEndDate, copyWeekdays, {
      excludeDates: workout ? [workout.scheduled_date] : [],
    }).length
  }, [copyStartDate, copyEndDate, copyWeekdays, workout])

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

  const form = useForm<ScheduledWorkoutFormValues>({
    resolver: zodResolver(scheduledWorkoutFormSchema),
    values: {
      name: workout?.name ?? `${clientName.split(' ')[0]} Workout`,
      notes: workout?.notes ?? '',
    },
  })

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
      return
    }

    setScheduledDays(result.data.days)
    setWorkout(result.data.selectedWorkout)
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

  async function handleCreateWorkout(libraryWorkoutId?: string) {
    const values = form.getValues()
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
      await refreshCalendar()
      return
    }

    toast.error(result.error)
  }

  async function handleSaveWorkout(values: ScheduledWorkoutFormValues) {
    if (!workout) return

    setPending(true)
    const result = await updateScheduledWorkout(clientId, workout.id, values)
    setPending(false)

    if (result.success) {
      toast.success('Workout updated.')
      await refreshCalendar()
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
      form.reset({ name: `${clientName.split(' ')[0]} Workout`, notes: '' })
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
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <CalendarMonthGrid
            year={year}
            month={month}
            selectedDate={selectedDate}
            scheduledDays={scheduledDays}
            onMonthChange={handleMonthChange}
            onSelectDate={handleSelectDate}
          />

          <Card className="gap-0 py-0">
            <CardContent className="space-y-3 px-4 py-4">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                Calendar actions
              </p>
              {workout ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={openCopyDialog}
                  >
                    Copy to another day
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive w-full justify-start"
                    disabled={pending}
                    onClick={handleDeleteWorkout}
                  >
                    <Trash2 className="size-4" />
                    Clear this day
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Select a day and create a workout to unlock copy and clear actions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading calendar…
            </div>
          ) : workout ? (
            <>
              <div className="border-b px-5 py-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSaveWorkout)}
                    className="space-y-3"
                  >
                    <div className="flex flex-wrap items-end gap-3">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="min-w-[200px] flex-1">
                            <FormLabel>Workout name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" size="sm" disabled={pending}>
                        Save
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coach notes</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={2}
                              placeholder="Optional session notes for this day"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
              <ScheduledWorkoutView
                clientId={clientId}
                selectedDate={selectedDate}
                workout={workout}
                exercises={exercises}
                onChanged={() => refreshCalendar()}
                onCopy={openCopyDialog}
              />
            </>
          ) : (
            <div className="p-5">
              <div className="mb-6 flex items-center gap-2">
                <CalendarDays className="text-brand size-5" />
                <div>
                  <p className="font-semibold">Schedule a workout</p>
                  <p className="text-muted-foreground text-sm">
                    Build {clientName}&apos;s session for{' '}
                    {selectedDate.replace(/-/g, '/')}
                  </p>
                </div>
              </div>

              <Form {...form}>
                <form className="space-y-4">
                  <FormField
                    control={form.control}
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
                      <Select onValueChange={(value) => handleCreateWorkout(value)}>
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

                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => handleCreateWorkout()}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Create workout for this day
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </Card>
      </div>

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
