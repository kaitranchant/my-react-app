'use client'

import * as React from 'react'
import {
  Check,
  Circle,
  CircleDot,
  Dumbbell,
  Loader2,
  Pause,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  completeWorkoutLog,
  getWorkoutLogData,
  reopenWorkoutLog,
  saveWorkoutLogSets,
  skipWorkoutLog,
  startWorkoutLog,
  stopWorkoutLog,
} from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatDayHeader } from '@/lib/calendar'
import { formatExercisePrescriptionSummary } from '@/lib/scheduled-exercise'
import {
  applySetPatchWithCompletion,
  buildSetDrafts,
  countCompletedSets,
  countTotalSetsForWorkout,
  deriveSetCompleted,
  formatPreviousPerformance,
  getBestE1rmFromDrafts,
  getBestE1rmFromPrevious,
  getLogFieldsForExercise,
  getSupersetColor,
  getWorkoutDisplayStatus,
  groupExercisesBySection,
  parseOptionalInt,
  parseOptionalNumber,
  workoutHasProgress,
  type WorkoutLogSetDraft,
} from '@/lib/workout-log'
import type { ExercisePreviousSets } from 'app/types/database'
import { cn } from '@/lib/utils'
import {
  isWorkoutLogSchemaError,
  WORKOUT_LOG_SCHEMA_TABLES,
  WORKOUT_LOG_SQL_FILE,
} from '@/lib/workout-log-schema'
import type {
  ScheduledWorkoutExerciseWithDetails,
  ScheduledWorkoutStatus,
  WorkoutLogData,
  WorkoutLogSet,
} from 'app/types/database'

type WorkoutLogModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  selectedDate: string
  workoutId: string
  initialStatus: ScheduledWorkoutStatus
  onChanged: () => void
}

type ExerciseLogState = Record<string, WorkoutLogSetDraft[]>

function buildExerciseState(
  exercises: ScheduledWorkoutExerciseWithDetails[],
  logSets: WorkoutLogSet[]
): ExerciseLogState {
  const setsByExercise = new Map<string, WorkoutLogSet[]>()

  for (const row of logSets) {
    const existing = setsByExercise.get(row.scheduled_exercise_id) ?? []
    existing.push(row)
    setsByExercise.set(row.scheduled_exercise_id, existing)
  }

  const state: ExerciseLogState = {}
  for (const exercise of exercises) {
    state[exercise.id] = buildSetDrafts(
      exercise,
      setsByExercise.get(exercise.id) ?? []
    )
  }
  return state
}

function WorkoutStatusBadge({
  status,
  hasProgress,
}: {
  status: ScheduledWorkoutStatus
  hasProgress: boolean
}) {
  const display = getWorkoutDisplayStatus(status, hasProgress)
  const tone = display.tone
  const isPaused = status === 'scheduled' && hasProgress

  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1.5 font-medium',
        tone === 'active' && 'border-brand/30 bg-brand/10 text-brand',
        tone === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
        tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-700'
      )}
    >
      {status === 'completed' ? (
        <Check className="size-3" />
      ) : status === 'in_progress' || isPaused ? (
        <CircleDot className="size-3" />
      ) : (
        <Circle className="size-3" />
      )}
      {display.label}
    </Badge>
  )
}

type WorkoutLogExerciseProps = {
  exercise: ScheduledWorkoutExerciseWithDetails
  sets: WorkoutLogSetDraft[]
  previousSets: ExercisePreviousSets
  previousSessionDate: string | null
  readOnly: boolean
  onSetChange: (
    setNumber: number,
    patch: Partial<WorkoutLogSetDraft>
  ) => void
}

function WorkoutLogExercise({
  exercise,
  sets,
  previousSets,
  previousSessionDate,
  readOnly,
  onSetChange,
}: WorkoutLogExerciseProps) {
  const fields = getLogFieldsForExercise(exercise)
  const summary = formatExercisePrescriptionSummary(exercise)
  const currentE1rm = fields.showWeight && fields.showReps
    ? getBestE1rmFromDrafts(sets)
    : null
  const previousE1rm =
    fields.showWeight && fields.showReps
      ? getBestE1rmFromPrevious(previousSets)
      : null
  const showSetTable =
    fields.showWeight || fields.showReps || fields.showDuration

  return (
    <div className="border-b py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="bg-muted flex size-10 items-center justify-center rounded-full">
            <Dumbbell className="text-muted-foreground size-4" />
          </div>
          {exercise.superset_group && (
            <span
              className={cn(
                'absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                getSupersetColor(exercise.superset_group)
              )}
            >
              {exercise.superset_group}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-semibold">{exercise.exercise.name}</p>
            <p className="text-muted-foreground text-sm">{summary}</p>
            {exercise.workout_notes?.trim() && (
              <p className="text-muted-foreground mt-1 text-sm leading-snug">
                {exercise.workout_notes.trim()}
              </p>
            )}
            {(currentE1rm != null || previousE1rm != null) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {currentE1rm != null && (
                  <span>
                    Est. 1RM{' '}
                    <span className="text-foreground font-semibold">
                      {currentE1rm} lbs
                    </span>
                  </span>
                )}
                {previousE1rm != null && (
                  <span className="text-muted-foreground">
                    Last est. 1RM {previousE1rm} lbs
                    {previousSessionDate &&
                      ` · ${formatDayHeader(previousSessionDate)}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {showSetTable ? (
            <div className="overflow-x-auto">
              <div className="min-w-[320px] space-y-1">
                <div
                  className={cn(
                    'text-muted-foreground grid gap-2 px-1 text-[10px] font-semibold tracking-wide uppercase',
                    fields.showWeight && fields.showReps
                      ? 'grid-cols-[2.5rem_5rem_1fr_1fr_2rem]'
                      : fields.showReps
                        ? 'grid-cols-[2.5rem_5rem_1fr_2rem]'
                        : 'grid-cols-[2.5rem_5rem_1fr_2rem]'
                  )}
                >
                  <span>Set</span>
                  <span>Prev</span>
                  {fields.showWeight && <span>Lbs</span>}
                  {fields.showReps && <span>Reps</span>}
                  {fields.showDuration && <span>Sec</span>}
                  <span className="sr-only">Done</span>
                </div>

                {sets.map((set) => {
                  const previous = previousSets[set.setNumber]
                  return (
                    <div
                      key={set.setNumber}
                      className={cn(
                        'grid items-center gap-2 rounded-md border px-1 py-1.5',
                        fields.showWeight && fields.showReps
                          ? 'grid-cols-[2.5rem_5rem_1fr_1fr_2rem]'
                          : fields.showReps
                            ? 'grid-cols-[2.5rem_5rem_1fr_2rem]'
                            : 'grid-cols-[2.5rem_5rem_1fr_2rem]',
                        set.completed && 'border-emerald-500/30 bg-emerald-500/5'
                      )}
                    >
                      <span className="text-muted-foreground pl-1 text-xs font-semibold">
                        {set.setNumber}
                      </span>

                      <span className="bg-muted/60 text-muted-foreground rounded px-2 py-1.5 text-center text-xs">
                        {previous
                          ? formatPreviousPerformance(
                              previous.weight,
                              previous.reps
                            )
                          : '—'}
                      </span>

                      {fields.showWeight && (
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.5"
                          value={set.weight}
                          disabled={readOnly}
                          onChange={(event) =>
                            onSetChange(set.setNumber, {
                              weight: event.target.value,
                            })
                          }
                          placeholder="—"
                          className="h-8 text-center"
                          aria-label={`Set ${set.setNumber} weight`}
                        />
                      )}

                      {fields.showReps && (
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={set.reps}
                          disabled={readOnly}
                          onChange={(event) =>
                            onSetChange(set.setNumber, {
                              reps: event.target.value,
                            })
                          }
                          placeholder="—"
                          className="h-8 text-center"
                          aria-label={`Set ${set.setNumber} reps`}
                        />
                      )}

                      {fields.showDuration && (
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={set.durationSeconds}
                          disabled={readOnly}
                          onChange={(event) =>
                            onSetChange(set.setNumber, {
                              durationSeconds: event.target.value,
                            })
                          }
                          placeholder="—"
                          className="h-8 text-center"
                          aria-label={`Set ${set.setNumber} duration`}
                        />
                      )}

                      <div className="flex justify-center">
                        {set.completed ? (
                          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>
                        ) : (
                          <span
                            className="border-muted-foreground/30 size-6 rounded-full border"
                            aria-hidden
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {(fields.showBarSpeed || fields.showPeakPower) && (
            <div className="space-y-2">
              {sets.map((set) => (
                <div
                  key={`extra-${set.setNumber}`}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {fields.showBarSpeed && (
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Set {set.setNumber} bar speed (m/s)
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={set.barSpeed}
                        disabled={readOnly}
                        onChange={(event) =>
                          onSetChange(set.setNumber, {
                            barSpeed: event.target.value,
                          })
                        }
                        placeholder="—"
                        className="h-9"
                      />
                    </div>
                  )}
                  {fields.showPeakPower && (
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs">
                        Set {set.setNumber} peak power
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={set.peakPower}
                        disabled={readOnly}
                        onChange={(event) =>
                          onSetChange(set.setNumber, {
                            peakPower: event.target.value,
                          })
                        }
                        placeholder="—"
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function WorkoutLogModal({
  open,
  onOpenChange,
  clientId,
  selectedDate,
  workoutId,
  initialStatus,
  onChanged,
}: WorkoutLogModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [schemaError, setSchemaError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<WorkoutLogData | null>(null)
  const [exerciseState, setExerciseState] = React.useState<ExerciseLogState>({})
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setSchemaError(null)
    const result = await getWorkoutLogData(clientId, workoutId)
    setLoading(false)

    if (!result.success) {
      if (isWorkoutLogSchemaError(result.error)) {
        setSchemaError(result.error)
        return
      }
      toast.error(result.error)
      return
    }

    setData(result.data)
    setExerciseState(
      buildExerciseState(result.data.exercises, result.data.logSets)
    )
  }, [clientId, workoutId])

  React.useEffect(() => {
    if (!open) return
    void loadData()
  }, [open, loadData])

  const sections = React.useMemo(
    () => (data ? groupExercisesBySection(data.exercises) : []),
    [data]
  )

  const activeSection = sections[activeSectionIndex] ?? sections[0]
  const readOnly =
    data?.status === 'completed' || data?.status === 'skipped'

  const completedSetCount = React.useMemo(() => {
    if (!data) return 0
    const drafts = Object.values(exerciseState).flat()
    return drafts.filter((set) => set.completed).length
  }, [data, exerciseState])

  const totalSetCount = data ? countTotalSetsForWorkout(data.exercises) : 0
  const savedCompletedCount = data ? countCompletedSets(data.logSets) : 0

  function handleSetChange(
    exercise: ScheduledWorkoutExerciseWithDetails,
    setNumber: number,
    patch: Partial<WorkoutLogSetDraft>
  ) {
    const fields = getLogFieldsForExercise(exercise)
    setExerciseState((current) => ({
      ...current,
      [exercise.id]: (current[exercise.id] ?? []).map((set) =>
        set.setNumber === setNumber
          ? applySetPatchWithCompletion(set, patch, fields)
          : set
      ),
    }))
  }

  async function handleStartWorkout() {
    setPending(true)
    const result = await startWorkoutLog(clientId, workoutId)
    setPending(false)

    if (result.success) {
      const resuming = Boolean(
        data &&
          data.status === 'scheduled' &&
          workoutHasProgress(data, data.logSets)
      )
      toast.success(resuming ? 'Workout resumed.' : 'Workout started.')
      await loadData()
      onChanged()
      return
    }

    if (isWorkoutLogSchemaError(result.error)) {
      setSchemaError(result.error)
      return
    }

    toast.error(result.error)
  }

  async function handleSaveSets(options?: { silent?: boolean }) {
    if (!data) return false

    const sets = Object.entries(exerciseState).flatMap(
      ([scheduledExerciseId, rows]) => {
        const exercise = data.exercises.find((row) => row.id === scheduledExerciseId)
        const fields = exercise
          ? getLogFieldsForExercise(exercise)
          : getLogFieldsForExercise(data.exercises[0])

        return rows.map((set) => ({
          scheduledExerciseId,
          setNumber: set.setNumber,
          weight: parseOptionalNumber(set.weight),
          reps: parseOptionalInt(set.reps),
          durationSeconds: parseOptionalInt(set.durationSeconds),
          barSpeed: parseOptionalNumber(set.barSpeed),
          peakPower: parseOptionalNumber(set.peakPower),
          completed: deriveSetCompleted(set, fields),
          notes: set.notes.trim() ? set.notes.trim() : null,
        }))
      }
    )

    setPending(true)
    const result = await saveWorkoutLogSets(clientId, workoutId, sets)
    setPending(false)

    if (result.success) {
      if (!options?.silent) {
        toast.success('Workout log saved.')
      }
      await loadData()
      onChanged()
      return true
    }

    if (isWorkoutLogSchemaError(result.error)) {
      setSchemaError(result.error)
      return false
    }

    toast.error(result.error)
    return false
  }

  async function handleCompleteWorkout() {
    const saved = await handleSaveSets({ silent: true })
    if (!saved) return

    setPending(true)
    const result = await completeWorkoutLog(clientId, workoutId)
    setPending(false)

    if (result.success) {
      toast.success('Workout marked complete.')
      await loadData()
      onChanged()
      return
    }

    toast.error(result.error)
  }

  async function handleSkipWorkout() {
    if (!window.confirm('Mark this workout as skipped?')) return

    setPending(true)
    const result = await skipWorkoutLog(clientId, workoutId)
    setPending(false)

    if (result.success) {
      toast.success('Workout skipped.')
      await loadData()
      onChanged()
      return
    }

    toast.error(result.error)
  }

  async function handleReopenWorkout() {
    const wasSkipped = (data?.status ?? initialStatus) === 'skipped'

    setPending(true)
    const result = await reopenWorkoutLog(clientId, workoutId)
    setPending(false)

    if (result.success) {
      toast.success(
        wasSkipped ? 'Workout restored — you can log it now.' : 'Workout reopened for logging.'
      )
      await loadData()
      onChanged()
      return
    }

    if (isWorkoutLogSchemaError(result.error)) {
      setSchemaError(result.error)
      return
    }

    toast.error(result.error)
  }

  const status = data?.status ?? initialStatus
  const hasProgress = data
    ? workoutHasProgress(data, data.logSets)
    : false
  const isPaused = status === 'scheduled' && hasProgress
  const isActive = status === 'in_progress'

  async function handleStopWorkout() {
    const saved = await handleSaveSets({ silent: true })
    if (
      !saved &&
      data &&
      Object.values(exerciseState)
        .flat()
        .some((set) => set.weight || set.reps || set.completed)
    ) {
      return
    }

    setPending(true)
    const result = await stopWorkoutLog(clientId, workoutId)
    setPending(false)

    if (result.success) {
      toast.success('Workout stopped. Progress saved — resume anytime.')
      await loadData()
      onChanged()
      return
    }

    if (isWorkoutLogSchemaError(result.error)) {
      setSchemaError(result.error)
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,900px)] max-h-[92vh] w-[min(96vw,1200px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]">
        <div className="shrink-0 border-b px-5 py-4">
          <DialogTitle className="sr-only">Log workout</DialogTitle>
          <DialogDescription className="sr-only">
            Log sets for {formatDayHeader(selectedDate)}
          </DialogDescription>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                {formatDayHeader(selectedDate)}
              </p>
              <h2 className="text-xl font-bold tracking-tight">
                {data?.name ?? 'Workout'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <WorkoutStatusBadge status={status} hasProgress={hasProgress} />
                {totalSetCount > 0 && (
                  <span className="text-muted-foreground text-sm">
                    {completedSetCount || savedCompletedCount} / {totalSetCount}{' '}
                    sets logged
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!readOnly && !isActive && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || loading}
                  onClick={handleStartWorkout}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {isPaused ? 'Resume workout' : 'Start workout'}
                </Button>
              )}
              {!readOnly && isActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || loading}
                  onClick={() => void handleStopWorkout()}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Pause className="size-4" />
                  )}
                  Stop workout
                </Button>
              )}
              {!readOnly && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending || loading}
                    onClick={() => void handleSaveSets()}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Save progress
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || loading}
                    onClick={() => void handleCompleteWorkout()}
                  >
                    Complete workout
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={pending || loading}
                    onClick={handleSkipWorkout}
                  >
                    Skip
                  </Button>
                </>
              )}
              {readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || loading}
                  onClick={handleReopenWorkout}
                >
                  {status === 'skipped' ? 'Undo skip' : 'Reopen'}
                </Button>
              )}
            </div>
          </div>

          {sections.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sections.map((section, index) => (
                <Button
                  key={section.label + index}
                  type="button"
                  size="sm"
                  variant={index === activeSectionIndex ? 'default' : 'outline'}
                  onClick={() => setActiveSectionIndex(index)}
                >
                  {section.label}
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    {section.exercises.length}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {schemaError ? (
            <div className="py-6">
              <SchemaSetupNotice
                tables={WORKOUT_LOG_SCHEMA_TABLES}
                sqlFile={WORKOUT_LOG_SQL_FILE}
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Could not load workout.
            </p>
          ) : status === 'skipped' ? (
            <div className="py-8 text-center">
              <p className="font-medium">This workout was skipped.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Use <span className="text-foreground font-medium">Undo skip</span>{' '}
                above to restore it and log exercises.
              </p>
            </div>
          ) : data.exercises.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Add exercises to this workout before logging.
            </p>
          ) : (
            <div>
              {sections.length > 1 && activeSection && (
                <div className="border-b py-3">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                    Section
                  </p>
                  <p className="font-semibold">{activeSection.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {activeSection.exercises.length} exercise
                    {activeSection.exercises.length === 1 ? '' : 's'}
                  </p>
                </div>
              )}

              {(sections.length > 1 && activeSection
                ? activeSection.exercises
                : data.exercises
              ).map((exercise) => (
                <WorkoutLogExercise
                  key={exercise.id}
                  exercise={exercise}
                  sets={exerciseState[exercise.id] ?? []}
                  previousSets={
                    data.previousSetsByExerciseId[exercise.exercise_id] ?? {}
                  }
                  previousSessionDate={
                    data.previousSessionDateByExerciseId[exercise.exercise_id] ??
                    null
                  }
                  readOnly={readOnly}
                  onSetChange={(setNumber, patch) =>
                    handleSetChange(exercise, setNumber, patch)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
