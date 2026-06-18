'use client'

import * as React from 'react'
import {
  Check,
  Circle,
  CircleDot,
  Dumbbell,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { removeScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import {
  completeWorkoutLog,
  getWorkoutLogData,
  reopenWorkoutLog,
  saveWorkoutLogSets,
  skipWorkoutLog,
  startWorkoutLog,
  stopWorkoutLog,
} from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
import { AddExerciseDialog } from '@/components/calendar/add-exercise-dialog'
import { EditScheduledExerciseDialog } from '@/components/calendar/edit-scheduled-exercise-dialog'
import { ExerciseMediaDialog } from '@/components/calendar/exercise-media-dialog'
import { ReplaceExerciseDialog } from '@/components/calendar/replace-exercise-dialog'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatDayHeader } from '@/lib/calendar'
import {
  getExerciseMediaUrl,
  hasExerciseMedia,
} from '@/lib/exercise-media'
import { formatExercisePrescriptionSummary } from '@/lib/scheduled-exercise'
import {
  applyExerciseSetChanges,
  appendSetDraft,
  buildSetDrafts,
  countCompletedSets,
  countTotalSetsForWorkout,
  countTotalSetsFromDrafts,
  formatPreviousPerformance,
  getBestE1rmFromDrafts,
  getBestE1rmFromPrevious,
  getLogFieldsForExercise,
  getSupersetColor,
  getWorkoutDisplayStatus,
  groupExercisesBySection,
  MAX_LOG_SETS,
  MIN_LOG_SETS,
  parseOptionalInt,
  parseOptionalNumber,
  removeSetDraft,
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
  Exercise,
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
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onChanged: () => void
}

type ExerciseLogState = Record<string, WorkoutLogSetDraft[]>

function buildExerciseState(
  exercises: ScheduledWorkoutExerciseWithDetails[],
  logSets: WorkoutLogSet[],
  previousSetsByExerciseId: Record<string, ExercisePreviousSets> = {}
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
      setsByExercise.get(exercise.id) ?? [],
      previousSetsByExerciseId[exercise.exercise_id] ?? {}
    )
  }
  return state
}

function resolveExerciseMediaFields(
  exercise: ScheduledWorkoutExerciseWithDetails,
  libraryExercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
) {
  const base = exercise.exercise

  if (hasExerciseMedia(base)) {
    return base
  }

  const libraryMatch = libraryExercises.find((row) => row.id === base.id)
  if (!libraryMatch?.external_id) {
    return base
  }

  return {
    ...base,
    external_id: libraryMatch.external_id,
  }
}

function serializeExerciseStateForSave(state: ExerciseLogState): string {
  return JSON.stringify(
    Object.entries(state)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([exerciseId, sets]) => [
        exerciseId,
        sets.map((set) => ({
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.durationSeconds,
          barSpeed: set.barSpeed,
          peakPower: set.peakPower,
          completed: set.completed,
          notes: set.notes,
        })),
      ])
  )
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
  libraryExercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  sets: WorkoutLogSetDraft[]
  previousSets: ExercisePreviousSets
  previousSessionDate: string | null
  readOnly: boolean
  onSetChange: (
    setNumber: number,
    patch: Partial<WorkoutLogSetDraft>
  ) => void
  onAddSet: () => void
  onRemoveSet: (setNumber: number) => void
  onEdit: () => void
  onReplace: () => void
  onDelete: () => void
}

function WorkoutLogExercise({
  exercise,
  libraryExercises,
  sets,
  previousSets,
  previousSessionDate,
  readOnly,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onEdit,
  onReplace,
  onDelete,
}: WorkoutLogExerciseProps) {
  const [mediaOpen, setMediaOpen] = React.useState(false)
  const mediaExercise = resolveExerciseMediaFields(exercise, libraryExercises)
  const mediaUrl = getExerciseMediaUrl(mediaExercise, '180')
  const showMedia = hasExerciseMedia(mediaExercise)

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
    fields.completionOnly ||
    fields.showWeight ||
    fields.showReps ||
    fields.showDuration
  const canRemoveSet = !readOnly && sets.length > MIN_LOG_SETS
  const setGridCols = fields.completionOnly
    ? canRemoveSet
      ? 'grid-cols-[2.5rem_1fr_2rem_2rem]'
      : 'grid-cols-[2.5rem_1fr_2rem]'
    : fields.showWeight && fields.showReps
      ? canRemoveSet
        ? 'grid-cols-[2.5rem_5rem_1fr_1fr_2rem_2rem]'
        : 'grid-cols-[2.5rem_5rem_1fr_1fr_2rem]'
      : canRemoveSet
        ? 'grid-cols-[2.5rem_5rem_1fr_2rem_2rem]'
        : 'grid-cols-[2.5rem_5rem_1fr_2rem]'

  return (
    <div className="border-b py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => showMedia && setMediaOpen(true)}
            disabled={!showMedia}
            className={cn(
              'relative flex size-10 items-center justify-center overflow-hidden rounded-full',
              showMedia
                ? 'hover:ring-brand/40 ring-offset-background focus-visible:ring-brand ring-2 ring-transparent transition-shadow focus-visible:outline-none'
                : 'bg-muted'
            )}
            aria-label={
              showMedia
                ? `View form for ${exercise.exercise.name}`
                : exercise.exercise.name
            }
          >
            {mediaUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <PlayCircle className="size-4 text-white drop-shadow" />
                </span>
              </>
            ) : (
              <Dumbbell className="text-muted-foreground size-4" />
            )}
          </button>
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{exercise.exercise.name}</p>
              <p className="text-muted-foreground text-sm">{summary}</p>
            </div>
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Actions for ${exercise.exercise.name}`}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {showMedia && (
                    <DropdownMenuItem onSelect={() => setMediaOpen(true)}>
                      View form
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onEdit}>
                    Edit prescription
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onReplace}>
                    Replace exercise
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    Remove exercise
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {readOnly && showMedia && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setMediaOpen(true)}
              >
                View form
              </Button>
            )}
          </div>
          <div>
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
                    'text-muted-foreground grid gap-2 px-1 text-xs font-medium',
                    setGridCols
                  )}
                >
                  <span>Set</span>
                  {fields.completionOnly ? (
                    <span>Target</span>
                  ) : (
                    <>
                      <span>Prev</span>
                      {fields.showWeight && <span>Lbs</span>}
                      {fields.showReps && <span>Reps</span>}
                      {fields.showDuration && <span>Sec</span>}
                    </>
                  )}
                  <span className="sr-only">Done</span>
                  {canRemoveSet && <span className="sr-only">Remove</span>}
                </div>

                {sets.map((set) => {
                  const previous = previousSets[set.setNumber]
                  return (
                    <div
                      key={set.setNumber}
                      className={cn(
                        'grid items-center gap-2 rounded-md border px-1 py-1.5',
                        setGridCols,
                        set.completed && 'border-emerald-500/30 bg-emerald-500/5',
                        set.predicted &&
                          !set.completed &&
                          'border-brand/30 bg-brand/5'
                      )}
                    >
                      <span className="text-muted-foreground pl-1 text-xs font-semibold">
                        {set.setNumber}
                      </span>

                      {fields.completionOnly ? (
                        <span className="text-muted-foreground px-1 text-sm">
                          {set.targetLabel ?? '—'}
                        </span>
                      ) : (
                        <span className="bg-muted/60 text-muted-foreground rounded px-2 py-1.5 text-center text-xs">
                          {previous
                            ? formatPreviousPerformance(
                                previous.weight,
                                previous.reps
                              )
                            : '—'}
                        </span>
                      )}

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
                        <button
                          type="button"
                          disabled={
                            readOnly ||
                            (!set.completed &&
                              !(
                                fields.completionOnly ||
                                (fields.showWeight &&
                                  fields.showReps &&
                                  set.weight.trim() !== '' &&
                                  set.reps.trim() !== '') ||
                                (!fields.showWeight &&
                                  fields.showReps &&
                                  set.reps.trim() !== '') ||
                                (fields.showDuration &&
                                  set.durationSeconds.trim() !== '')
                              ))
                          }
                          onClick={() =>
                            onSetChange(set.setNumber, {
                              completed: !set.completed,
                            })
                          }
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full border transition-colors',
                            set.completed
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                              : set.predicted
                                ? 'border-brand/50 hover:bg-brand/10'
                                : 'border-muted-foreground/30 hover:bg-muted/50',
                            'disabled:pointer-events-none disabled:opacity-40'
                          )}
                          aria-label={
                            set.completed
                              ? `Mark set ${set.setNumber} incomplete`
                              : `Confirm set ${set.setNumber}`
                          }
                        >
                          {set.completed && (
                            <Check className="size-3.5" strokeWidth={3} />
                          )}
                        </button>
                      </div>

                      {canRemoveSet && (
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => onRemoveSet(set.setNumber)}
                            className="text-muted-foreground hover:text-destructive flex size-6 items-center justify-center rounded-md transition-colors"
                            aria-label={`Remove set ${set.setNumber}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!readOnly && sets.length < MAX_LOG_SETS && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-1.5"
                    onClick={onAddSet}
                  >
                    <Plus className="size-4" />
                    Add set
                  </Button>
                )}
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

      <ExerciseMediaDialog
        exercise={mediaExercise}
        open={mediaOpen}
        onOpenChange={setMediaOpen}
      />
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
  exercises,
  onChanged,
}: WorkoutLogModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [schemaError, setSchemaError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<WorkoutLogData | null>(null)
  const [exerciseState, setExerciseState] = React.useState<ExerciseLogState>({})
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0)
  const [editingExercise, setEditingExercise] =
    React.useState<ScheduledWorkoutExerciseWithDetails | null>(null)
  const [replacingExercise, setReplacingExercise] =
    React.useState<ScheduledWorkoutExerciseWithDetails | null>(null)

  const exerciseStateRef = React.useRef(exerciseState)
  exerciseStateRef.current = exerciseState

  const skipAutoSaveRef = React.useRef(true)
  const prevSetLengthsRef = React.useRef('')
  const lastPersistedStateRef = React.useRef('')
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = React.useRef(false)
  const queuedSaveRef = React.useRef(false)
  const onChangedRef = React.useRef(onChanged)
  onChangedRef.current = onChanged

  const AUTO_SAVE_DELAY_MS = 600

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
    skipAutoSaveRef.current = true
    setExerciseState(
      buildExerciseState(
        result.data.exercises,
        result.data.logSets,
        result.data.previousSetsByExerciseId
      )
    )
  }, [clientId, workoutId])

  const buildSetsPayload = React.useCallback(
    (state: ExerciseLogState, exercises: ScheduledWorkoutExerciseWithDetails[]) =>
      Object.entries(state).flatMap(([scheduledExerciseId, rows]) =>
        rows.map((set) => ({
          scheduledExerciseId,
          setNumber: set.setNumber,
          weight: parseOptionalNumber(set.weight),
          reps: parseOptionalInt(set.reps),
          durationSeconds: parseOptionalInt(set.durationSeconds),
          barSpeed: parseOptionalNumber(set.barSpeed),
          peakPower: parseOptionalNumber(set.peakPower),
          completed: set.completed,
          notes: set.notes.trim() ? set.notes.trim() : null,
        }))
      ),
    []
  )

  const persistSets = React.useCallback(
    async (
      state: ExerciseLogState,
      options?: {
        silent?: boolean
        reload?: boolean
        notifyParent?: boolean
        blockUi?: boolean
        revalidate?: boolean
      }
    ): Promise<boolean> => {
      if (!data) return false

      if (options?.blockUi) setPending(true)

      const result = await saveWorkoutLogSets(
        clientId,
        workoutId,
        buildSetsPayload(state, data.exercises),
        { revalidate: options?.revalidate ?? true }
      )

      if (options?.blockUi) setPending(false)

      if (result.success) {
        lastPersistedStateRef.current = serializeExerciseStateForSave(state)
        if (options?.reload) {
          skipAutoSaveRef.current = true
          await loadData()
        }
        if (options?.notifyParent) onChangedRef.current()
        return true
      }

      if (isWorkoutLogSchemaError(result.error)) {
        setSchemaError(result.error)
        return false
      }

      if (options?.silent) {
        toast.error('Could not auto-save workout log.')
      } else {
        toast.error(result.error)
      }

      return false
    },
    [buildSetsPayload, clientId, data, loadData, workoutId]
  )

  const persistSetsRef = React.useRef(persistSets)
  persistSetsRef.current = persistSets

  const runAutoSave = React.useCallback(async () => {
    if (saveInFlightRef.current) {
      queuedSaveRef.current = true
      return
    }

    const state = exerciseStateRef.current
    const payloadKey = serializeExerciseStateForSave(state)
    if (payloadKey === lastPersistedStateRef.current) {
      return
    }

    saveInFlightRef.current = true
    await persistSetsRef.current(state, {
      silent: true,
      reload: false,
      notifyParent: false,
      blockUi: false,
      revalidate: false,
    })
    saveInFlightRef.current = false

    if (queuedSaveRef.current) {
      queuedSaveRef.current = false
      void runAutoSave()
    }
  }, [])

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

  React.useEffect(() => {
    if (!open || readOnly || !data) return

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false
      prevSetLengthsRef.current = JSON.stringify(
        Object.fromEntries(
          Object.entries(exerciseState).map(([id, sets]) => [id, sets.length])
        )
      )
      lastPersistedStateRef.current = serializeExerciseStateForSave(exerciseState)
      return
    }

    const payloadKey = serializeExerciseStateForSave(exerciseState)
    if (payloadKey === lastPersistedStateRef.current) {
      return
    }

    const setLengths = Object.fromEntries(
      Object.entries(exerciseState).map(([id, sets]) => [id, sets.length])
    )
    const setLengthsKey = JSON.stringify(setLengths)
    const structuralChange = setLengthsKey !== prevSetLengthsRef.current
    prevSetLengthsRef.current = setLengthsKey

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    const delay = structuralChange ? 0 : AUTO_SAVE_DELAY_MS
    autoSaveTimerRef.current = setTimeout(() => {
      void runAutoSave()
    }, delay)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [exerciseState, open, readOnly, data])

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      if (open && !readOnly && data) {
        const state = exerciseStateRef.current
        if (
          serializeExerciseStateForSave(state) !== lastPersistedStateRef.current
        ) {
          void persistSetsRef.current(state, {
            silent: true,
            reload: false,
            notifyParent: true,
            blockUi: false,
            revalidate: true,
          })
        }
      }
    }
    onOpenChange(nextOpen)
  }

  const completedSetCount = React.useMemo(() => {
    if (!data) return 0
    const drafts = Object.values(exerciseState).flat()
    return drafts.filter((set) => set.completed).length
  }, [data, exerciseState])

  const totalSetCount = React.useMemo(() => {
    if (!data) return 0
    const draftTotal = countTotalSetsFromDrafts(exerciseState)
    if (draftTotal > 0) return draftTotal
    return countTotalSetsForWorkout(data.exercises)
  }, [data, exerciseState])
  const savedCompletedCount = data ? countCompletedSets(data.logSets) : 0

  function handleSetChange(
    exercise: ScheduledWorkoutExerciseWithDetails,
    setNumber: number,
    patch: Partial<WorkoutLogSetDraft>
  ) {
    const fields = getLogFieldsForExercise(exercise)
    setExerciseState((current) => ({
      ...current,
      [exercise.id]: applyExerciseSetChanges(
        current[exercise.id] ?? [],
        setNumber,
        patch,
        fields
      ),
    }))
  }

  function handleAddSet(exercise: ScheduledWorkoutExerciseWithDetails) {
    const previousSets =
      data?.previousSetsByExerciseId[exercise.exercise_id] ?? {}

    setExerciseState((current) => {
      const nextSets = appendSetDraft(
        exercise,
        current[exercise.id] ?? [],
        previousSets
      )

      if (!nextSets) {
        toast.error(`You can log up to ${MAX_LOG_SETS} sets per exercise.`)
        return current
      }

      return {
        ...current,
        [exercise.id]: nextSets,
      }
    })
  }

  function handleRemoveSet(
    exercise: ScheduledWorkoutExerciseWithDetails,
    setNumber: number
  ) {
    setExerciseState((current) => {
      const nextSets = removeSetDraft(
        exercise,
        current[exercise.id] ?? [],
        setNumber
      )

      if (!nextSets) {
        toast.error('Each exercise needs at least one set.')
        return current
      }

      return {
        ...current,
        [exercise.id]: nextSets,
      }
    })
  }

  async function handleRemoveExercise(
    exercise: ScheduledWorkoutExerciseWithDetails
  ) {
    if (
      !window.confirm(
        `Remove ${exercise.exercise.name} from this workout? Logged sets for this exercise will be deleted.`
      )
    ) {
      return
    }

    if (data && workoutHasProgress(data, data.logSets)) {
      const saved = await persistSets(exerciseStateRef.current, {
        silent: true,
        reload: false,
        notifyParent: false,
        blockUi: false,
      })
      if (!saved) return
    }

    setPending(true)
    const result = await removeScheduledExercise(clientId, exercise.id)
    setPending(false)

    if (result.success) {
      toast.success('Exercise removed.')
      await loadData()
      onChanged()
      return
    }

    toast.error(result.error)
  }

  async function handleExerciseStructureChanged() {
    await loadData()
    onChanged()
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
    return persistSets(exerciseStateRef.current, {
      silent: options?.silent,
      reload: true,
      notifyParent: true,
      blockUi: true,
    })
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex h-[min(92vh,900px)] max-h-[92vh] w-[min(96vw,1200px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]">
        <div className="shrink-0 border-b px-5 py-4 pr-14">
          <DialogTitle className="sr-only">Log workout</DialogTitle>
          <DialogDescription className="sr-only">
            Log sets for {formatDayHeader(selectedDate)}
          </DialogDescription>

          <div className="space-y-3">
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs font-medium">
                {formatDayHeader(selectedDate)}
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
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
                  <AddExerciseDialog
                    clientId={clientId}
                    workoutId={workoutId}
                    exercises={exercises}
                    onAdded={handleExerciseStructureChanged}
                  />
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
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                Add exercises to this workout before logging.
              </p>
              {!readOnly && (
                <div className="mt-4 flex justify-center">
                  <AddExerciseDialog
                    clientId={clientId}
                    workoutId={workoutId}
                    exercises={exercises}
                    onAdded={handleExerciseStructureChanged}
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              {sections.length > 1 && activeSection && (
                <div className="border-b py-3">
                  <p className="text-muted-foreground text-xs font-medium">
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
                  libraryExercises={exercises}
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
                  onAddSet={() => handleAddSet(exercise)}
                  onRemoveSet={(setNumber) =>
                    handleRemoveSet(exercise, setNumber)
                  }
                  onEdit={() => setEditingExercise(exercise)}
                  onReplace={() => setReplacingExercise(exercise)}
                  onDelete={() => void handleRemoveExercise(exercise)}
                />
              ))}
            </div>
          )}
        </div>

        {editingExercise && (
          <EditScheduledExerciseDialog
            clientId={clientId}
            row={editingExercise}
            open
            hideTrigger
            onOpenChange={(next) => {
              if (!next) setEditingExercise(null)
            }}
            onChanged={() => {
              setEditingExercise(null)
              void handleExerciseStructureChanged()
            }}
          />
        )}

        {replacingExercise && (
          <ReplaceExerciseDialog
            open
            onOpenChange={(next) => {
              if (!next) setReplacingExercise(null)
            }}
            clientId={clientId}
            exerciseRowId={replacingExercise.id}
            currentExerciseName={replacingExercise.exercise.name}
            exercises={exercises}
            onReplaced={() => {
              setReplacingExercise(null)
              void handleExerciseStructureChanged()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
