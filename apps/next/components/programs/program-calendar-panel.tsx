'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Copy, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  copyProgramScheduledWorkoutToDay,
  copyProgramScheduledWorkoutToDayRange,
  copyProgramWeekToWeek,
  copyProgramWeekToWeekRange,
  createProgramScheduledWorkout,
  deleteProgramScheduledWorkout,
  getProgramWeekData,
  getProgramWorkoutWithExercises,
} from '@/app/(dashboard)/library/programs/[programId]/calendar/actions'
import { ProgramWeekGrid } from '@/components/programs/program-week-grid'
import { ProgramPhasesPanel } from '@/components/programs/program-phases-panel'
import { ProgramWorkoutBuilderModal } from '@/components/programs/program-workout-builder-modal'
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
  ALL_WEEKDAY_VALUES,
  WEEKDAY_OPTIONS,
} from '@/lib/calendar'
import {
  countWeeksInRange,
  dayNumberToOffset,
  formatProgramDayLabel,
  formatProgramWeekLabel,
  getMatchingDayOffsetsInRange,
  getWeekDayOffsets,
  MAX_PROGRAM_WEEK_NUMBER,
  offsetToDayNumber,
  weekNumberToIndex,
} from '@/lib/program-calendar'
import {
  scheduledWorkoutFormSchema,
  type ScheduledWorkoutFormValues,
} from '@/lib/validations/calendar'
import type {
  Exercise,
  ProgramDaySummary,
  ProgramPhase,
  ProgramScheduledWorkoutWithExercises,
  Workout,
} from 'app/types/database'

type ProgramCalendarPanelProps = {
  programId: string
  programName: string
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  libraryWorkouts: Pick<Workout, 'id' | 'name' | 'status'>[]
  schemaError?: string | null
  phasesSchemaError?: string | null
  initialPhases: ProgramPhase[]
  initialWeekIndex: number
  initialSelectedDayOffset: number
  initialWorkouts: ProgramDaySummary[]
  initialSelectedWorkout: ProgramDaySummary | null
}

export function ProgramCalendarPanel({
  programId,
  programName,
  exercises,
  libraryWorkouts,
  schemaError = null,
  phasesSchemaError = null,
  initialPhases,
  initialWeekIndex,
  initialSelectedDayOffset,
  initialWorkouts,
  initialSelectedWorkout,
}: ProgramCalendarPanelProps) {
  const [weekIndex, setWeekIndex] = React.useState(initialWeekIndex)
  const [selectedDayOffset, setSelectedDayOffset] =
    React.useState(initialSelectedDayOffset)
  const [scheduledWorkouts, setScheduledWorkouts] =
    React.useState(initialWorkouts)
  const [selectedWorkout, setSelectedWorkout] =
    React.useState<ProgramDaySummary | null>(initialSelectedWorkout)
  const [builderWorkout, setBuilderWorkout] =
    React.useState<ProgramScheduledWorkoutWithExercises | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [copyOpen, setCopyOpen] = React.useState(false)
  const [copyMode, setCopyMode] = React.useState<'single' | 'range'>('single')
  const [copySingleDay, setCopySingleDay] = React.useState('')
  const [copyStartDay, setCopyStartDay] = React.useState('')
  const [copyEndDay, setCopyEndDay] = React.useState('')
  const [copyWeekdays, setCopyWeekdays] = React.useState<number[]>([
    ...ALL_WEEKDAY_VALUES,
  ])
  const [copyWeekOpen, setCopyWeekOpen] = React.useState(false)
  const [copyWeekPending, setCopyWeekPending] = React.useState(false)
  const [copySourceWeekIndex, setCopySourceWeekIndex] =
    React.useState(initialWeekIndex)
  const [copySourceWorkoutCount, setCopySourceWorkoutCount] = React.useState(0)
  const [copyWeekMode, setCopyWeekMode] = React.useState<'single' | 'range'>(
    'single'
  )
  const [copySingleWeek, setCopySingleWeek] = React.useState('')
  const [copyStartWeek, setCopyStartWeek] = React.useState('')
  const [copyEndWeek, setCopyEndWeek] = React.useState('')
  const [phases, setPhases] = React.useState(initialPhases)

  const dayOffsets = getWeekDayOffsets(weekIndex)
  const loadableWorkouts = libraryWorkouts.filter(
    (item) => item.status !== 'archived'
  )

  const copyTargetCount = React.useMemo(() => {
    const startOffset = copyStartDay ? dayNumberToOffset(Number(copyStartDay)) : null
    const endOffset = copyEndDay ? dayNumberToOffset(Number(copyEndDay)) : null

    if (
      startOffset === null ||
      endOffset === null ||
      Number.isNaN(startOffset) ||
      Number.isNaN(endOffset) ||
      copyWeekdays.length === 0
    ) {
      return 0
    }

    return getMatchingDayOffsetsInRange(startOffset, endOffset, copyWeekdays, {
      excludeOffsets: selectedWorkout ? [selectedWorkout.day_offset] : [],
    }).length
  }, [copyStartDay, copyEndDay, copyWeekdays, selectedWorkout])

  const copySingleDayNumber = copySingleDay ? Number(copySingleDay) : null
  const copySingleDayOffset =
    copySingleDayNumber !== null && !Number.isNaN(copySingleDayNumber)
      ? dayNumberToOffset(copySingleDayNumber)
      : null

  const copySingleWeekNumber = copySingleWeek ? Number(copySingleWeek) : null
  const copySingleWeekIndex =
    copySingleWeekNumber !== null && !Number.isNaN(copySingleWeekNumber)
      ? weekNumberToIndex(copySingleWeekNumber)
      : null

  const copyWeekTargetCount = React.useMemo(() => {
    const startWeekIndex = copyStartWeek
      ? weekNumberToIndex(Number(copyStartWeek))
      : null
    const endWeekIndex = copyEndWeek ? weekNumberToIndex(Number(copyEndWeek)) : null

    if (
      startWeekIndex === null ||
      endWeekIndex === null ||
      Number.isNaN(startWeekIndex) ||
      Number.isNaN(endWeekIndex) ||
      startWeekIndex > endWeekIndex
    ) {
      return 0
    }

    const weekCount = countWeeksInRange(startWeekIndex, endWeekIndex, {
      excludeWeekIndex: copySourceWeekIndex,
    })

    return weekCount * copySourceWorkoutCount
  }, [copyStartWeek, copyEndWeek, copySourceWorkoutCount, copySourceWeekIndex])

  const canCopyCurrentWeek = scheduledWorkouts.length > 0

  const createForm = useForm<ScheduledWorkoutFormValues>({
    resolver: zodResolver(scheduledWorkoutFormSchema),
    defaultValues: {
      name: '',
      notes: '',
    },
  })

  async function refreshWeek(
    nextWeekIndex = weekIndex,
    nextSelectedDayOffset = selectedDayOffset
  ) {
    setLoading(true)
    const data = await getProgramWeekData(
      programId,
      nextWeekIndex,
      nextSelectedDayOffset
    )
    setLoading(false)
    setScheduledWorkouts(data.workouts)
    setSelectedWorkout(data.selectedWorkout)
    return data
  }

  async function openBuilderForWorkout(workoutId: string, dayOffset: number) {
    setSelectedDayOffset(dayOffset)
    const result = await getProgramWorkoutWithExercises(programId, workoutId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setBuilderWorkout(result.workout)
    setBuilderOpen(true)
  }

  async function handleWeekChange(nextWeekIndex: number) {
    const nextOffsets = getWeekDayOffsets(nextWeekIndex)
    const nextSelected = nextOffsets.includes(selectedDayOffset)
      ? selectedDayOffset
      : nextOffsets[0]
    setWeekIndex(nextWeekIndex)
    setSelectedDayOffset(nextSelected)
    await refreshWeek(nextWeekIndex, nextSelected)
  }

  async function handleSelectDay(dayOffset: number) {
    setSelectedDayOffset(dayOffset)
    await refreshWeek(weekIndex, dayOffset)
  }

  function openCreateDialog(dayOffset?: number) {
    if (dayOffset !== undefined) {
      setSelectedDayOffset(dayOffset)
    }
    createForm.reset({
      name: `${programName} Workout`,
      notes: '',
    })
    setCreateOpen(true)
  }

  async function handleDayDoubleClick(dayOffset: number) {
    setSelectedDayOffset(dayOffset)
    const data = await refreshWeek(weekIndex, dayOffset)
    const workout = data.selectedWorkout

    if (workout) {
      await openBuilderForWorkout(workout.id, dayOffset)
      return
    }

    openCreateDialog(dayOffset)
  }

  function openCopyDialog() {
    if (!selectedWorkout) return

    const nextDay = offsetToDayNumber(selectedWorkout.day_offset + 1)
    setCopyMode('single')
    setCopySingleDay(String(nextDay))
    setCopyStartDay(String(offsetToDayNumber(selectedWorkout.day_offset)))
    setCopyEndDay(String(nextDay + 27))
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

  async function handleCopySingleDay() {
    if (!selectedWorkout || copySingleDayOffset === null) return

    if (copySingleDayOffset === selectedWorkout.day_offset) {
      toast.error('Choose a different day than the source workout.')
      return
    }

    setPending(true)
    try {
      const result = await copyProgramScheduledWorkoutToDay(
        programId,
        selectedWorkout.id,
        copySingleDayOffset
      )

      if (result.success) {
        toast.success(`Workout copied to ${formatProgramDayLabel(copySingleDayOffset)}.`)
        setCopyOpen(false)
        await refreshWeek()
        return
      }

      toast.error(result.error)
    } finally {
      setPending(false)
    }
  }

  async function handleCopyDayRange() {
    if (!selectedWorkout || !copyStartDay || !copyEndDay || copyWeekdays.length === 0) {
      return
    }

    const startOffset = dayNumberToOffset(Number(copyStartDay))
    const endOffset = dayNumberToOffset(Number(copyEndDay))

    if (Number.isNaN(startOffset) || Number.isNaN(endOffset)) {
      toast.error('Enter valid day numbers.')
      return
    }

    if (startOffset > endOffset) {
      toast.error('Start day must be on or before end day.')
      return
    }

    setPending(true)
    try {
      const result = await copyProgramScheduledWorkoutToDayRange(
        programId,
        selectedWorkout.id,
        startOffset,
        endOffset,
        copyWeekdays
      )

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
        await refreshWeek()
        return
      }

      toast.error(result.error)
    } finally {
      setPending(false)
    }
  }

  function openCopyWeekDialog() {
    setCopySourceWeekIndex(weekIndex)
    setCopySourceWorkoutCount(scheduledWorkouts.length)
    const nextWeekNumber = weekIndex + 2
    setCopyWeekMode('single')
    setCopySingleWeek(String(nextWeekNumber))
    setCopyStartWeek(String(nextWeekNumber))
    setCopyEndWeek(String(Math.min(nextWeekNumber + 3, MAX_PROGRAM_WEEK_NUMBER)))
    setCopyWeekOpen(true)
  }

  async function handleCopySingleWeek() {
    if (copySingleWeekIndex === null) return

    if (copySingleWeekIndex === copySourceWeekIndex) {
      toast.error('Choose a different week than the source week.')
      return
    }

    setCopyWeekPending(true)
    try {
      const result = await copyProgramWeekToWeek(
        programId,
        copySourceWeekIndex,
        copySingleWeekIndex
      )

      if (result.success) {
        const skippedMessage =
          result.skippedCount > 0
            ? ` Skipped ${result.skippedCount} day${
                result.skippedCount === 1 ? '' : 's'
              } that already had workouts.`
            : ''
        toast.success(
          result.copiedCount === 0
            ? `Workouts are already scheduled in ${formatProgramWeekLabel(copySingleWeekIndex)}.`
            : `Week copied to ${formatProgramWeekLabel(copySingleWeekIndex)} — ` +
                `${result.copiedCount} workout${
                  result.copiedCount === 1 ? '' : 's'
                } added.${skippedMessage}`
        )
        setCopyWeekOpen(false)
        void refreshWeek()
        return
      }

      toast.error(result.error)
    } catch {
      toast.error('Could not copy week. Please try again.')
    } finally {
      setCopyWeekPending(false)
    }
  }

  async function handleCopyWeekRange() {
    if (!copyStartWeek || !copyEndWeek) return

    const startWeekIndex = weekNumberToIndex(Number(copyStartWeek))
    const endWeekIndex = weekNumberToIndex(Number(copyEndWeek))

    if (Number.isNaN(startWeekIndex) || Number.isNaN(endWeekIndex)) {
      toast.error('Enter valid week numbers.')
      return
    }

    if (startWeekIndex > endWeekIndex) {
      toast.error('Start week must be on or before end week.')
      return
    }

    setCopyWeekPending(true)
    try {
      const result = await copyProgramWeekToWeekRange(
        programId,
        copySourceWeekIndex,
        startWeekIndex,
        endWeekIndex
      )

      if (result.success) {
        const skippedMessage =
          result.skippedCount > 0
            ? ` Skipped ${result.skippedCount} day${
                result.skippedCount === 1 ? '' : 's'
              } that already had workouts.`
            : ''
        toast.success(
          `Week copied to ${result.copiedCount} day${
            result.copiedCount === 1 ? '' : 's'
          } across the selected weeks.${skippedMessage}`
        )
        setCopyWeekOpen(false)
        void refreshWeek()
        return
      }

      toast.error(result.error)
    } catch {
      toast.error('Could not copy week. Please try again.')
    } finally {
      setCopyWeekPending(false)
    }
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
    const result = await createProgramScheduledWorkout(
      programId,
      selectedDayOffset,
      parsed.data,
      libraryWorkoutId ?? null
    )
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Workout added')
    setCreateOpen(false)
    await refreshWeek()
    await openBuilderForWorkout(result.workoutId, selectedDayOffset)
  }

  async function handleDeleteWorkout() {
    if (!selectedWorkout) return
    if (!window.confirm('Remove this workout from the program?')) return

    setPending(true)
    const result = await deleteProgramScheduledWorkout(
      programId,
      selectedWorkout.id
    )
    setPending(false)

    if (result.success) {
      toast.success('Workout removed')
      setSelectedWorkout(null)
      setBuilderOpen(false)
      setBuilderWorkout(null)
      await refreshWeek()
      return
    }

    toast.error(result.error)
  }

  async function handleBuilderChanged() {
    await refreshWeek()
    if (builderWorkout) {
      const result = await getProgramWorkoutWithExercises(
        programId,
        builderWorkout.id
      )
      if (result.success) {
        setBuilderWorkout(result.workout)
      }
    }
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice
        tables={['program_scheduled_workouts', 'program_scheduled_workout_exercises']}
        sqlFile="apply-program-calendar.sql"
      />
    )
  }

  return (
    <div className="space-y-4">
      <ProgramPhasesPanel
        programId={programId}
        phases={phases}
        onPhasesChange={setPhases}
        schemaError={phasesSchemaError}
        selectedDayOffset={selectedDayOffset}
        onJumpToWeek={handleWeekChange}
      />

      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">Selected day</p>
          <p className="font-semibold">{formatProgramDayLabel(selectedDayOffset)}</p>
          {selectedWorkout ? (
            <p className="text-muted-foreground truncate text-sm">
              {selectedWorkout.name}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">No workout scheduled</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedWorkout ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  openBuilderForWorkout(selectedWorkout.id, selectedDayOffset)
                }
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
            <Button type="button" size="sm" onClick={() => openCreateDialog()}>
              <Plus className="size-4" />
              Add workout
            </Button>
          )}
        </div>
      </div>

      <ProgramWeekGrid
        weekIndex={weekIndex}
        dayOffsets={dayOffsets}
        selectedDayOffset={selectedDayOffset}
        scheduledWorkouts={scheduledWorkouts}
        phases={phases}
        loading={loading}
        onWeekChange={handleWeekChange}
        onSelectDay={handleSelectDay}
        onDayDoubleClick={handleDayDoubleClick}
        onCopyWeek={openCopyWeekDialog}
        canCopyWeek={canCopyCurrentWeek}
      />

      <p className="text-muted-foreground text-sm">
        Day 1 is the program start date when you assign this program to a client.
        Assigning fills their calendar with these workouts and exercises.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add workout</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="text-brand size-5 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Schedule a workout for{' '}
              <span className="text-foreground font-medium">
                {formatProgramDayLabel(selectedDayOffset)}
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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Adding…' : 'Add & build workout'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy workout to days</DialogTitle>
          </DialogHeader>
          <Tabs
            value={copyMode}
            onValueChange={(value) => setCopyMode(value as 'single' | 'range')}
            className="gap-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single day</TabsTrigger>
              <TabsTrigger value="range">Day range</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-0 space-y-4">
              <div className="space-y-2">
                <label htmlFor="copy-single-day" className="text-sm font-medium">
                  Copy to day
                </label>
                <Input
                  id="copy-single-day"
                  type="number"
                  min={1}
                  max={365}
                  value={copySingleDay}
                  onChange={(event) => setCopySingleDay(event.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              {selectedWorkout &&
                copySingleDayOffset !== null &&
                copySingleDayOffset === selectedWorkout.day_offset && (
                  <p className="text-destructive text-sm">
                    Choose a day other than{' '}
                    {formatProgramDayLabel(selectedWorkout.day_offset)}.
                  </p>
                )}

              {selectedWorkout &&
                copySingleDayOffset !== null &&
                copySingleDayOffset !== selectedWorkout.day_offset && (
                  <p className="text-muted-foreground text-sm">
                    Copy this workout to{' '}
                    <span className="text-foreground font-medium">
                      {formatProgramDayLabel(copySingleDayOffset)}
                    </span>
                    . Exercises and prescriptions are included. Days that
                    already have a workout are skipped.
                  </p>
                )}

              <Button
                type="button"
                className="w-full"
                disabled={
                  pending ||
                  copySingleDayOffset === null ||
                  (selectedWorkout != null &&
                    copySingleDayOffset === selectedWorkout.day_offset)
                }
                onClick={handleCopySingleDay}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {copySingleDayOffset !== null
                  ? `Copy to ${formatProgramDayLabel(copySingleDayOffset)}`
                  : 'Copy workout'}
              </Button>
            </TabsContent>

            <TabsContent value="range" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="copy-start-day" className="text-sm font-medium">
                    Start day
                  </label>
                  <Input
                    id="copy-start-day"
                    type="number"
                    min={1}
                    max={365}
                    value={copyStartDay}
                    onChange={(event) => setCopyStartDay(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="copy-end-day" className="text-sm font-medium">
                    End day
                  </label>
                  <Input
                    id="copy-end-day"
                    type="number"
                    min={1}
                    max={365}
                    value={copyEndDay}
                    onChange={(event) => setCopyEndDay(event.target.value)}
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
                disabled={pending || copyTargetCount === 0}
                onClick={handleCopyDayRange}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Copy to matching days
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog
        open={copyWeekOpen}
        onOpenChange={(open) => {
          if (!copyWeekPending) {
            setCopyWeekOpen(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy week to other weeks</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Copy all workouts from{' '}
            <span className="text-foreground font-medium">
              {formatProgramWeekLabel(copySourceWeekIndex)}
            </span>{' '}
            ({copySourceWorkoutCount} workout
            {copySourceWorkoutCount === 1 ? '' : 's'}) to other weeks.
            Days that already have workouts are skipped.
          </p>
          <Tabs
            value={copyWeekMode}
            onValueChange={(value) => setCopyWeekMode(value as 'single' | 'range')}
            className="gap-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single week</TabsTrigger>
              <TabsTrigger value="range">Week range</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-0 space-y-4">
              <div className="space-y-2">
                <label htmlFor="copy-single-week" className="text-sm font-medium">
                  Copy to week
                </label>
                <Input
                  id="copy-single-week"
                  type="number"
                  min={1}
                  max={MAX_PROGRAM_WEEK_NUMBER}
                  value={copySingleWeek}
                  onChange={(event) => setCopySingleWeek(event.target.value)}
                  placeholder="e.g. 2"
                />
              </div>

              {copySingleWeekIndex !== null &&
                copySingleWeekIndex === copySourceWeekIndex && (
                <p className="text-destructive text-sm">
                  Choose a week other than{' '}
                  {formatProgramWeekLabel(copySourceWeekIndex)}.
                </p>
              )}

              {copySingleWeekIndex !== null &&
                copySingleWeekIndex !== copySourceWeekIndex && (
                <p className="text-muted-foreground text-sm">
                  Copy this week&apos;s schedule to{' '}
                  <span className="text-foreground font-medium">
                    {formatProgramWeekLabel(copySingleWeekIndex)}
                  </span>
                  . Exercises and prescriptions are included.
                </p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={
                  copyWeekPending ||
                  copySingleWeekIndex === null ||
                  copySingleWeekIndex === copySourceWeekIndex
                }
                onClick={handleCopySingleWeek}
              >
                {copyWeekPending && <Loader2 className="size-4 animate-spin" />}
                {copySingleWeekIndex !== null
                  ? `Copy to ${formatProgramWeekLabel(copySingleWeekIndex)}`
                  : 'Copy week'}
              </Button>
            </TabsContent>

            <TabsContent value="range" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="copy-start-week" className="text-sm font-medium">
                    Start week
                  </label>
                  <Input
                    id="copy-start-week"
                    type="number"
                    min={1}
                    max={MAX_PROGRAM_WEEK_NUMBER}
                    value={copyStartWeek}
                    onChange={(event) => setCopyStartWeek(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="copy-end-week" className="text-sm font-medium">
                    End week
                  </label>
                  <Input
                    id="copy-end-week"
                    type="number"
                    min={1}
                    max={MAX_PROGRAM_WEEK_NUMBER}
                    value={copyEndWeek}
                    onChange={(event) => setCopyEndWeek(event.target.value)}
                  />
                </div>
              </div>

              {copyWeekTargetCount > 0 && (
                <p className="text-muted-foreground text-sm">
                  Up to {copyWeekTargetCount} workout
                  {copyWeekTargetCount === 1 ? '' : 's'} across the selected
                  weeks. Days that already have workouts will be skipped.
                </p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={copyWeekPending || copyWeekTargetCount === 0}
                onClick={handleCopyWeekRange}
              >
                {copyWeekPending && <Loader2 className="size-4 animate-spin" />}
                Copy to matching weeks
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {builderWorkout && (
        <ProgramWorkoutBuilderModal
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          programId={programId}
          dayOffset={selectedDayOffset}
          workout={builderWorkout}
          exercises={exercises}
          onChanged={handleBuilderChanged}
          onCopy={openCopyDialog}
        />
      )}
    </div>
  )
}
