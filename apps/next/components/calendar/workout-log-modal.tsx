'use client'

import * as React from 'react'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Dumbbell,
  LayoutList,
  Loader2,
  MoreVertical,
  PlayCircle,
  Plus,
  StickyNote,
  Trash2,
  Trophy,
  Video,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { removeScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import {
  completeWorkoutLog,
  getWorkoutLogData,
  saveWorkoutLogSets,
  skipWorkoutLog,
  startWorkoutLog,
  stopWorkoutLog,
} from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
import {
  completePortalWorkoutLog,
  getPortalWorkoutLogData,
  savePortalWorkoutLogSets,
  skipPortalWorkoutLog,
  startPortalWorkoutLog,
  stopPortalWorkoutLog,
} from '@/app/portal/workout-log-actions'
import { AddExerciseDialog } from '@/components/calendar/add-exercise-dialog'
import {
  ExerciseHistoryButton,
  ExerciseHistoryDialog,
} from '@/components/calendar/exercise-history-dialog'
import { EditScheduledExerciseDialog } from '@/components/calendar/edit-scheduled-exercise-dialog'
import { ExerciseLogNotesDialog } from '@/components/calendar/exercise-log-notes-dialog'
import { ExerciseMediaDialog } from '@/components/calendar/exercise-media-dialog'
import { ReplaceExerciseDialog } from '@/components/calendar/replace-exercise-dialog'
import { FormReviewSubmitDialog } from '@/components/form-review/form-review-submit-dialog'
import { PrCelebrationDialog } from '@/components/workout/pr-celebration-dialog'
import { WorkoutCompleteDialog } from '@/components/workout/workout-complete-dialog'
import {
  RestTimerChip,
  RestTimerProvider,
  useRestTimer,
} from '@/components/calendar/rest-timer'
import {
  WorkoutElapsedTimer,
  WorkoutProgressBar,
} from '@/components/calendar/workout-elapsed-timer'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent } from '@/components/ui/card'
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
  clusterExercisesBySuperset,
  getSupersetPosition,
} from '@/lib/superset-groups'
import {
  calcSessionVolumeForExercise,
} from '@/lib/load-analytics'
import {
  formatVolume,
  weightUnitLabel,
} from '@/lib/coach-preferences'
import {
  getExerciseDemoVideoPublicUrl,
  getExerciseMediaUrl,
  hasExerciseMedia,
} from '@/lib/exercise-media'
import { formatExercisePrescriptionSummary, parseTrackingOptions } from '@/lib/scheduled-exercise'
import {
  applyExerciseSetChanges,
  appendSetDraft,
  buildSetDrafts,
  calculateWeightFromPercent,
  countCompletedSets,
  countTotalSetsForWorkout,
  countTotalSetsFromDrafts,
  findResumeExerciseIndex,
  formatPreviousPerformance,
  getSectionLabelForExercise,
  isExerciseFullyLogged,
  isWorkoutFullyLogged,
  getBestE1rmFromDrafts,
  getBestE1rmFromPrevious,
  getLogFieldsForExercise,
  getWorkoutLogSetGridTemplate,
  getSupersetColor,
  getWorkoutDisplayStatus,
  groupExercisesBySection,
  parseWeightPercent,
  parseTargetWeight,
  previousSessionMetTargets,
  suggestProgressiveLoadWeight,
  MAX_LOG_SETS,
  MIN_LOG_SETS,
  parseOptionalInt,
  parseOptionalNumber,
  parseRestSeconds,
  removeSetDraft,
  workoutHasProgress,
  type WorkoutLogSetDraft,
} from '@/lib/workout-log'
import { getWorkoutToneBadgeClass } from '@/lib/status-colors'
import type { ExercisePreviousSets } from 'app/types/database'
import { cn } from '@/lib/utils'
import {
  getWorkoutLogSchemaSetup,
  isWorkoutLogSchemaError,
} from '@/lib/workout-log-schema'
import type {
  Exercise,
  ExercisePersonalBest,
  ScheduledWorkoutExerciseWithDetails,
  ScheduledWorkoutStatus,
  WorkoutLogData,
  WorkoutLogSet,
} from 'app/types/database'
import type { WeightUnit } from 'app/types/database'
import type { NewPrSummary } from '@/lib/pr-records'

type WorkoutLogBaseProps = {
  clientId: string
  selectedDate: string
  workoutId: string
  initialStatus: ScheduledWorkoutStatus
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onChanged: () => void
  variant?: 'coach' | 'client'
  weightUnit?: WeightUnit
  athleteName?: string
}

export type WorkoutLogScreenProps = WorkoutLogBaseProps & {
  presentation: 'modal' | 'page'
  active: boolean
  onClose?: () => void
  returnHref?: string
}

type WorkoutLogModalProps = WorkoutLogBaseProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExerciseLogState = Record<string, WorkoutLogSetDraft[]>

function buildExerciseState(
  exercises: ScheduledWorkoutExerciseWithDetails[],
  logSets: WorkoutLogSet[],
  previousSetsByExerciseId: Record<string, ExercisePreviousSets> = {},
  personalBestsByExerciseId: Record<string, ExercisePersonalBest> = {}
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
      previousSetsByExerciseId[exercise.exercise_id] ?? {},
      personalBestsByExerciseId[exercise.exercise_id] ?? null
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
      className={cn('gap-1.5 font-medium', getWorkoutToneBadgeClass(tone))}
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
  personalBest: ExercisePersonalBest | null
  readOnly: boolean
  isWorkoutActive: boolean
  clientId: string
  workoutId: string
  variant: 'coach' | 'client'
  onSetChange: (
    setNumber: number,
    patch: Partial<WorkoutLogSetDraft>
  ) => void
  onAddSet: () => void
  onRemoveSet: (setNumber: number) => void
  onEdit: () => void
  onReplace: () => void
  onDelete: () => void
  onNotesChanged: () => void
  allowPrescriptionEdits?: boolean
  weightUnit?: WeightUnit
  className?: string
  guidedLayout?: boolean
}

function WorkoutLogExercise({
  exercise,
  libraryExercises,
  sets,
  previousSets,
  previousSessionDate,
  personalBest,
  readOnly,
  isWorkoutActive,
  clientId,
  workoutId,
  variant,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onEdit,
  onReplace,
  onDelete,
  onNotesChanged,
  allowPrescriptionEdits = true,
  weightUnit = 'lbs',
  className,
  guidedLayout = false,
}: WorkoutLogExerciseProps) {
  const [mediaOpen, setMediaOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [formReviewOpen, setFormReviewOpen] = React.useState(false)
  const [notesOpen, setNotesOpen] = React.useState(false)
  const { startRestTimer } = useRestTimer()
  const restSeconds = parseRestSeconds(exercise.rest_seconds)
  const mediaExercise = resolveExerciseMediaFields(exercise, libraryExercises)
  const demoVideoUrl = getExerciseDemoVideoPublicUrl(mediaExercise)
  const mediaUrl = getExerciseMediaUrl(mediaExercise)
  const showMedia = hasExerciseMedia(mediaExercise)
  const showVideoThumbnail = Boolean(demoVideoUrl && !mediaUrl)

  const trackingOptions = parseTrackingOptions(exercise.tracking_options)
  const prTrackingEnabled = !trackingOptions.disablePrTracking
  const fields = getLogFieldsForExercise(exercise)
  const summary = formatExercisePrescriptionSummary(exercise)
  const currentE1rm =
    prTrackingEnabled && fields.showWeight && fields.showReps
      ? getBestE1rmFromDrafts(sets)
      : null
  const previousE1rm =
    prTrackingEnabled && fields.showWeight && fields.showReps
      ? getBestE1rmFromPrevious(previousSets)
      : null
  const allTimeE1rm = personalBest?.e1rm ?? null
  const weightPercent = parseWeightPercent(exercise.weight_percent)
  const approvedTargetWeight = parseTargetWeight(exercise.target_weight)
  const percentTargetWeight =
    approvedTargetWeight == null &&
    weightPercent != null &&
    allTimeE1rm != null
      ? calculateWeightFromPercent(allTimeE1rm, weightPercent)
      : null
  const progressiveLoadWeight =
    approvedTargetWeight == null &&
    trackingOptions.autoProgressLoad &&
    previousSessionMetTargets(exercise, previousSets)
      ? suggestProgressiveLoadWeight(exercise, previousSets)
      : null
  const isLivePr =
    currentE1rm != null &&
    (allTimeE1rm == null || currentE1rm > allTimeE1rm)
  const sessionVolume = trackingOptions.trackVolume
    ? calcSessionVolumeForExercise(
        sets.map((set) => ({
          weight: parseOptionalNumber(set.weight),
          reps: parseOptionalInt(set.reps),
          completed: set.completed,
        })),
        trackingOptions
      )
    : 0
  const showSetTable =
    fields.completionOnly ||
    fields.showWeight ||
    fields.showReps ||
    fields.showDuration
  const canRemoveSet = !readOnly && sets.length > MIN_LOG_SETS
  const hasExerciseNotes = Boolean(
    exercise.workout_notes?.trim() || exercise.client_notes?.trim()
  )
  const useConfirmAllButton =
    fields.completionOnly && guidedLayout && !readOnly
  const setGridTemplate = getWorkoutLogSetGridTemplate(fields, canRemoveSet, {
    hideConfirmColumn: useConfirmAllButton,
  })

  const activeSetNumber =
    sets.find((set) => !set.completed)?.setNumber ?? null
  const completedCount = sets.filter((set) => set.completed).length
  const allComplete = sets.length > 0 && completedCount === sets.length

  function handleSetToggle(set: WorkoutLogSetDraft) {
    const nextCompleted = !set.completed
    onSetChange(set.setNumber, { completed: nextCompleted })

    if (
      nextCompleted &&
      isWorkoutActive &&
      !readOnly &&
      restSeconds > 0
    ) {
      startRestTimer(exercise.exercise.name, restSeconds)
    }
  }

  function handleMarkAll() {
    for (const set of sets) {
      if (!set.completed) {
        onSetChange(set.setNumber, { completed: true })
      }
    }
  }

  function handleConfirmAll() {
    const hadIncomplete = sets.some((set) => !set.completed)
    handleMarkAll()

    if (
      hadIncomplete &&
      isWorkoutActive &&
      !readOnly &&
      restSeconds > 0
    ) {
      startRestTimer(exercise.exercise.name, restSeconds)
    }
  }

  function canConfirmSet(set: WorkoutLogSetDraft): boolean {
    if (set.completed) return true
    return (
      fields.completionOnly ||
      (fields.showWeight &&
        fields.showReps &&
        set.weight.trim() !== '' &&
        set.reps.trim() !== '') ||
      (!fields.showWeight &&
        fields.showReps &&
        set.reps.trim() !== '') ||
      (fields.showDuration && set.durationSeconds.trim() !== '')
    )
  }

  return (
    <Card
      className={cn(
        'mb-4 gap-0 overflow-hidden py-0 shadow-sm',
        className
      )}
    >
      {exercise.superset_group && (
        <div
          className={cn(
            'px-4 py-1.5 text-center text-[11px] font-bold tracking-wide text-white uppercase',
            getSupersetColor(exercise.superset_group)
          )}
        >
          Superset {exercise.superset_group}
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => showMedia && setMediaOpen(true)}
              disabled={!showMedia}
              className={cn(
                'relative flex size-12 items-center justify-center overflow-hidden rounded-xl',
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
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <PlayCircle className="size-5 text-white drop-shadow" />
                  </span>
                </>
              ) : showVideoThumbnail ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <PlayCircle className="size-5 text-white drop-shadow" />
                </span>
              ) : (
                <Dumbbell className="text-muted-foreground size-5" />
              )}
            </button>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base leading-snug font-semibold">
                  {exercise.exercise.name}
                </p>
                <p className="text-muted-foreground text-sm">{summary}</p>
                {(approvedTargetWeight != null ||
                  percentTargetWeight != null ||
                  progressiveLoadWeight != null) && (
                  <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                    {approvedTargetWeight != null && (
                      <p>
                        Coach target{' '}
                        <span className="text-foreground font-medium">
                          {approvedTargetWeight} lb
                        </span>
                      </p>
                    )}
                    {percentTargetWeight != null && allTimeE1rm != null && (
                      <p>
                        Target load{' '}
                        <span className="text-foreground font-medium">
                          {percentTargetWeight} lb
                        </span>{' '}
                        ({exercise.weight_percent?.trim()} of {allTimeE1rm} lb e1RM)
                      </p>
                    )}
                    {progressiveLoadWeight != null && (
                      <p>
                        Suggested{' '}
                        <span className="text-foreground font-medium">
                          {progressiveLoadWeight} lb
                        </span>{' '}
                        based on last session performance
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <ExerciseHistoryButton onClick={() => setHistoryOpen(true)} />
                {variant === 'client' && !readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden shrink-0 gap-1.5 sm:inline-flex"
                    onClick={() => setFormReviewOpen(true)}
                  >
                    <Video className="size-3.5" />
                    Submit form
                  </Button>
                )}
                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative size-8 shrink-0"
                        aria-label={`Actions for ${exercise.exercise.name}`}
                      >
                        <MoreVertical className="size-4" />
                        {hasExerciseNotes && (
                          <span className="bg-brand absolute top-1 right-1 size-1.5 rounded-full" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setNotesOpen(true)}>
                        <StickyNote className="size-4" />
                        {hasExerciseNotes ? 'Edit notes' : 'Add notes'}
                      </DropdownMenuItem>
                      {variant === 'client' && (
                        <DropdownMenuItem onSelect={() => setFormReviewOpen(true)}>
                          Submit form photo/video
                        </DropdownMenuItem>
                      )}
                      {showMedia && (
                        <DropdownMenuItem onSelect={() => setMediaOpen(true)}>
                          View form
                        </DropdownMenuItem>
                      )}
                      {allowPrescriptionEdits && (
                        <>
                          <DropdownMenuSeparator />
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
                        </>
                      )}
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isWorkoutActive && !readOnly && (
                <RestTimerChip
                  seconds={restSeconds}
                  onClick={() =>
                    startRestTimer(exercise.exercise.name, restSeconds)
                  }
                />
              )}
              {currentE1rm != null && (
                <span className="text-sm">
                  1RM{' '}
                  <span className="text-brand font-semibold">{currentE1rm}</span>
                  <span className="text-muted-foreground ml-0.5 text-xs">{weightUnitLabel(weightUnit)}</span>
                </span>
              )}
              {isLivePr && (
                <Badge variant="warning-soft" className="gap-1">
                  <Trophy className="size-3" />
                  PR pace
                </Badge>
              )}
            </div>

            <div>
              {(exercise.workout_notes?.trim() || exercise.client_notes?.trim()) && (
                <div className="space-y-2">
                  {exercise.workout_notes?.trim() && (
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                        Coach notes
                      </p>
                      <p className="text-sm leading-snug">
                        {exercise.workout_notes.trim()}
                      </p>
                    </div>
                  )}
                  {exercise.client_notes?.trim() && (
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                        {variant === 'client' ? 'Your notes' : 'Client notes'}
                      </p>
                      <p className="text-sm leading-snug">
                        {exercise.client_notes.trim()}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {(previousE1rm != null || allTimeE1rm != null) && (
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {allTimeE1rm != null && <span>All-time {allTimeE1rm} lb</span>}
                  {previousE1rm != null && (
                    <span>
                      Last {previousE1rm} lb
                      {previousSessionDate &&
                        ` · ${formatDayHeader(previousSessionDate)}`}
                    </span>
                  )}
                </div>
              )}
              {sessionVolume > 0 && (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Volume{' '}
                  <span className="text-foreground font-medium">
                    {formatVolume(sessionVolume, weightUnit)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-3">
            {showSetTable ? (
              <div className="bg-muted/25 overflow-hidden rounded-xl border">
                    <div
                      className="text-muted-foreground grid gap-1.5 border-b px-2 py-2 text-[11px] font-semibold tracking-wide uppercase sm:gap-2 sm:px-3"
                      style={{ gridTemplateColumns: setGridTemplate }}
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
                      {!useConfirmAllButton && (
                        <span className="sr-only">Done</span>
                      )}
                      {canRemoveSet && <span className="sr-only">Remove</span>}
                    </div>

                    {sets.map((set) => {
                      const previous = previousSets[set.setNumber]
                      const isActive =
                        !readOnly &&
                        activeSetNumber === set.setNumber &&
                        !set.completed

                      return (
                        <div
                          key={set.setNumber}
                          className={cn(
                            'relative grid items-center gap-1.5 border-b px-2 py-2 last:border-b-0 sm:gap-2 sm:px-3',
                            set.completed && 'bg-status-success/5',
                            set.predicted &&
                              !set.completed &&
                              'bg-brand/5',
                            isActive && 'bg-brand/8'
                          )}
                          style={{ gridTemplateColumns: setGridTemplate }}
                        >
                          {isActive && (
                            <span className="bg-brand absolute inset-y-1 left-0 w-1 rounded-r-full" />
                          )}

                          <span
                            className={cn(
                              'pl-1 text-xs font-bold tabular-nums',
                              isActive ? 'text-brand' : 'text-muted-foreground'
                            )}
                          >
                            {set.setNumber}
                          </span>

                          {fields.completionOnly ? (
                            <span className="text-muted-foreground min-w-0 truncate text-sm">
                              {set.targetLabel ?? '—'}
                            </span>
                          ) : (
                            <span className="bg-background/80 text-muted-foreground min-w-0 truncate rounded-md px-1 py-1.5 text-center text-[11px] leading-tight sm:text-xs">
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
                              className="bg-background h-9 min-w-0 rounded-lg px-1.5 text-center font-medium sm:h-10 sm:px-2"
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
                              className="bg-background h-9 min-w-0 rounded-lg px-1.5 text-center font-medium sm:h-10 sm:px-2"
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
                              className="bg-background h-9 min-w-0 rounded-lg px-1.5 text-center font-medium sm:h-10 sm:px-2"
                              aria-label={`Set ${set.setNumber} duration`}
                            />
                          )}

                          {!useConfirmAllButton && (
                            <div className="flex justify-center">
                              <button
                                type="button"
                                disabled={readOnly || !canConfirmSet(set)}
                                onClick={() => handleSetToggle(set)}
                                className={cn(
                                  'flex size-7 items-center justify-center rounded-full border-2 transition-all sm:size-8',
                                  set.completed
                                    ? 'border-status-success bg-status-success text-white shadow-sm'
                                    : isActive
                                      ? 'border-brand hover:bg-brand/10'
                                      : set.predicted
                                        ? 'border-brand/50 hover:bg-brand/10'
                                        : 'border-muted-foreground/25 hover:bg-muted/50',
                                  'disabled:pointer-events-none disabled:opacity-40'
                                )}
                                aria-label={
                                  set.completed
                                    ? `Mark set ${set.setNumber} incomplete`
                                    : `Confirm set ${set.setNumber}`
                                }
                              >
                                {set.completed && (
                                  <Check className="size-4" strokeWidth={3} />
                                )}
                              </button>
                            </div>
                          )}

                          {canRemoveSet && (
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => onRemoveSet(set.setNumber)}
                                className="text-muted-foreground hover:text-destructive flex size-7 items-center justify-center rounded-md transition-colors"
                                aria-label={`Remove set ${set.setNumber}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                {!readOnly && (
                  <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                    {sets.length < MAX_LOG_SETS && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1.5"
                        onClick={onAddSet}
                      >
                        <Plus className="size-4" />
                        Add set
                      </Button>
                    )}
                    {!allComplete && sets.length > 0 && !useConfirmAllButton && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-brand ml-auto h-auto p-0"
                        onClick={handleMarkAll}
                      >
                        Mark all
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {useConfirmAllButton && sets.length > 0 && !allComplete && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-full border-2 text-base font-semibold"
                  onClick={handleConfirmAll}
                >
                  Confirm
                </Button>
                <p className="text-muted-foreground text-center text-xs">
                  Press &apos;Confirm&apos; to mark all sets complete.
                </p>
              </div>
            )}

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
      </CardContent>

      <ExerciseMediaDialog
        exercise={mediaExercise}
        open={mediaOpen}
        onOpenChange={setMediaOpen}
      />

      <ExerciseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        exerciseName={exercise.exercise.name}
        libraryExerciseId={exercise.exercise_id}
        clientId={clientId}
        excludeWorkoutId={workoutId}
        variant={variant}
      />

      {variant === 'client' && (
        <FormReviewSubmitDialog
          open={formReviewOpen}
          onOpenChange={setFormReviewOpen}
          exerciseName={exercise.exercise.name}
          exerciseId={exercise.exercise_id}
          scheduledWorkoutId={workoutId}
          scheduledExerciseId={exercise.id}
        />
      )}

      <ExerciseLogNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        exerciseName={exercise.exercise.name}
        exerciseRowId={exercise.id}
        clientId={clientId}
        workoutId={workoutId}
        variant={variant}
        coachNotes={exercise.workout_notes}
        clientNotes={exercise.client_notes ?? null}
        onSaved={onNotesChanged}
      />
    </Card>
  )
}

export function WorkoutLogScreen({
  presentation,
  active,
  onClose,
  returnHref,
  clientId,
  selectedDate,
  workoutId,
  initialStatus,
  exercises,
  onChanged,
  variant = 'coach',
  weightUnit = 'lbs',
  athleteName,
}: WorkoutLogScreenProps) {
  const router = useRouter()
  const isPage = presentation === 'page'
  const isClientPortal = variant === 'client'
  const allowPrescriptionEdits = !isClientPortal
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [schemaError, setSchemaError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<WorkoutLogData | null>(null)
  const [exerciseState, setExerciseState] = React.useState<ExerciseLogState>({})
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0)
  const [activeExerciseIndex, setActiveExerciseIndex] = React.useState(0)
  const [sessionViewMode, setSessionViewMode] =
    React.useState<'guided' | 'list'>('guided')
  const guidedAutoAdvanceRef = React.useRef(false)
  const guidedWorkoutInitRef = React.useRef<string | null>(null)
  const [editingExercise, setEditingExercise] =
    React.useState<ScheduledWorkoutExerciseWithDetails | null>(null)
  const [replacingExercise, setReplacingExercise] =
    React.useState<ScheduledWorkoutExerciseWithDetails | null>(null)
  const [celebrationPrs, setCelebrationPrs] = React.useState<NewPrSummary[]>([])
  const [showCelebration, setShowCelebration] = React.useState(false)
  const [showWorkoutComplete, setShowWorkoutComplete] = React.useState(false)
  const [exerciseToRemove, setExerciseToRemove] =
    React.useState<ScheduledWorkoutExerciseWithDetails | null>(null)

  const removeExerciseConfirm = useConfirmDialog({
    title: exerciseToRemove
      ? `Remove ${exerciseToRemove.exercise.name}?`
      : 'Remove exercise?',
    description: 'Logged sets for this exercise will be deleted.',
    confirmLabel: 'Remove exercise',
    destructive: true,
    onConfirm: async () => {
      const exercise = exerciseToRemove
      if (!exercise) return

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

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Exercise removed.')
      setExerciseToRemove(null)
      await loadData()
      onChanged()
    },
  })

  const skipWorkoutConfirm = useConfirmDialog({
    title: 'Skip workout?',
    description: 'This marks the workout as skipped.',
    confirmLabel: 'Skip workout',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = isClientPortal
        ? await skipPortalWorkoutLog(workoutId)
        : await skipWorkoutLog(clientId, workoutId)
      setPending(false)

      if (result.success) {
        toast.success('Workout skipped.')
        await loadData()
        onChanged()
        return
      }

      toast.error(result.error)
      throw new Error(result.error)
    },
  })

  const exerciseStateRef = React.useRef(exerciseState)
  exerciseStateRef.current = exerciseState

  const skipAutoSaveRef = React.useRef(true)
  const prevSetLengthsRef = React.useRef('')
  const lastPersistedStateRef = React.useRef('')
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = React.useRef(false)
  const queuedSaveRef = React.useRef(false)
  const autoCompletingRef = React.useRef(false)
  const wasLoggingActiveRef = React.useRef(false)
  const leavingPageRef = React.useRef(false)
  const onChangedRef = React.useRef(onChanged)
  onChangedRef.current = onChanged

  const dataRef = React.useRef(data)
  dataRef.current = data

  const readOnly = data?.status === 'skipped'
  const isCompleted = data?.status === 'completed'
  const canEditPrescription = allowPrescriptionEdits && !isCompleted && !readOnly
  const canSkip =
    data?.status === 'scheduled' || data?.status === 'in_progress'

  const AUTO_SAVE_DELAY_MS = 600

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setSchemaError(null)
    const result = isClientPortal
      ? await getPortalWorkoutLogData(workoutId)
      : await getWorkoutLogData(clientId, workoutId)
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
        result.data.previousSetsByExerciseId,
        result.data.personalBestsByExerciseId
      )
    )
  }, [clientId, isClientPortal, workoutId])

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

      const result = isClientPortal
        ? await savePortalWorkoutLogSets(
            workoutId,
            buildSetsPayload(state, data.exercises),
            { revalidate: options?.revalidate ?? true }
          )
        : await saveWorkoutLogSets(
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
    [buildSetsPayload, clientId, data, isClientPortal, loadData, workoutId]
  )

  const persistSetsRef = React.useRef(persistSets)
  persistSetsRef.current = persistSets

  const pauseWorkout = React.useCallback(async () => {
    if (autoCompletingRef.current) return
    if (dataRef.current?.status !== 'in_progress') return

    const result = isClientPortal
      ? await stopPortalWorkoutLog(workoutId)
      : await stopWorkoutLog(clientId, workoutId)

    if (result.success) {
      onChangedRef.current()
    }
  }, [clientId, isClientPortal, workoutId])

  const completeWorkout = React.useCallback(async () => {
    autoCompletingRef.current = true

    const saved = await persistSetsRef.current(exerciseStateRef.current, {
      silent: true,
      reload: false,
      notifyParent: false,
      blockUi: false,
      revalidate: true,
    })

    if (!saved) {
      autoCompletingRef.current = false
      return
    }

    const result = isClientPortal
      ? await completePortalWorkoutLog(workoutId)
      : await completeWorkoutLog(clientId, workoutId)

    autoCompletingRef.current = false

    if (result.success) {
      if (result.newPrs.length > 0) {
        setCelebrationPrs(result.newPrs)
        setShowCelebration(true)
      } else if (isClientPortal) {
        setShowWorkoutComplete(true)
      } else {
        toast.success('Workout complete!')
      }
      await loadData()
      onChangedRef.current()
      return
    }

    toast.error(result.error)
  }, [clientId, isClientPortal, loadData, workoutId])

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
    if (!active) return
    void loadData()
  }, [active, loadData])

  React.useEffect(() => {
    if (!active || readOnly || !data) return
    if (data.status === 'completed' || data.status === 'skipped') return
    if (data.status === 'in_progress') return

    let cancelled = false

    async function autoStart() {
      const result = isClientPortal
        ? await startPortalWorkoutLog(workoutId)
        : await startWorkoutLog(clientId, workoutId)

      if (cancelled) return

      if (result.success) {
        await loadData()
        onChangedRef.current()
        return
      }

      if (isWorkoutLogSchemaError(result.error)) {
        setSchemaError(result.error)
        return
      }

      toast.error(result.error)
    }

    void autoStart()

    return () => {
      cancelled = true
    }
  }, [
    active,
    readOnly,
    data,
    clientId,
    isClientPortal,
    loadData,
    workoutId,
  ])

  React.useEffect(() => {
    if (active) {
      wasLoggingActiveRef.current = true
      return () => {
        if (!leavingPageRef.current) {
          void pauseWorkout()
        }
      }
    }

    if (wasLoggingActiveRef.current) {
      wasLoggingActiveRef.current = false
      if (!leavingPageRef.current) {
        void pauseWorkout()
      }
    }
  }, [active, pauseWorkout])

  React.useEffect(() => {
    if (!active || readOnly || !data || autoCompletingRef.current) return
    if (data.status === 'completed') return
    if (!isWorkoutFullyLogged(data.exercises, exerciseState)) return

    void completeWorkout()
  }, [active, readOnly, data, exerciseState, completeWorkout])

  const sections = React.useMemo(
    () => (data ? groupExercisesBySection(data.exercises) : []),
    [data]
  )

  const activeSection = sections[activeSectionIndex] ?? sections[0]
  const guidedSessionEligible =
    isClientPortal &&
    isPage &&
    !readOnly &&
    !isCompleted &&
    Boolean(data && data.exercises.length > 0)
  const showGuidedSession =
    guidedSessionEligible && sessionViewMode === 'guided'
  const orderedExercises = data?.exercises ?? []
  const activeExercise = orderedExercises[activeExerciseIndex] ?? null
  const activeSupersetPosition =
    activeExercise != null
      ? getSupersetPosition(activeExercise, orderedExercises)
      : null
  const activeExerciseSectionLabel =
    activeExercise != null
      ? getSectionLabelForExercise(activeExercise, sections)
      : null

  React.useEffect(() => {
    guidedWorkoutInitRef.current = null
  }, [workoutId])

  React.useEffect(() => {
    if (!guidedSessionEligible || !data) return
    if (data.exercises.length > 0 && Object.keys(exerciseState).length === 0) {
      return
    }

    if (guidedWorkoutInitRef.current === data.id) return

    guidedWorkoutInitRef.current = data.id
    setActiveExerciseIndex(
      findResumeExerciseIndex(data.exercises, exerciseState)
    )
  }, [data, exerciseState, guidedSessionEligible])

  React.useEffect(() => {
    if (!showGuidedSession || !data || !activeExercise) {
      guidedAutoAdvanceRef.current = false
      return
    }

    const sets = exerciseState[activeExercise.id] ?? []
    if (!isExerciseFullyLogged(sets)) {
      guidedAutoAdvanceRef.current = false
      return
    }

    if (
      guidedAutoAdvanceRef.current ||
      activeExerciseIndex >= orderedExercises.length - 1
    ) {
      return
    }

    guidedAutoAdvanceRef.current = true
    const timer = setTimeout(() => {
      setActiveExerciseIndex((current) =>
        Math.min(current + 1, orderedExercises.length - 1)
      )
      guidedAutoAdvanceRef.current = false
    }, 500)

    return () => clearTimeout(timer)
  }, [
    activeExercise,
    activeExerciseIndex,
    exerciseState,
    orderedExercises.length,
    showGuidedSession,
    data,
  ])

  React.useEffect(() => {
    if (!active || readOnly || !data) return

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
  }, [exerciseState, active, readOnly, data])

  async function flushOnClose(options?: { notifyParent?: boolean }) {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    if (active && !readOnly && data) {
      const state = exerciseStateRef.current
      if (
        serializeExerciseStateForSave(state) !== lastPersistedStateRef.current
      ) {
        await persistSetsRef.current(state, {
          silent: true,
          reload: false,
          notifyParent: options?.notifyParent ?? true,
          blockUi: false,
          revalidate: true,
        })
      }
    }
    await pauseWorkout()
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      void flushOnClose()
    }
    if (!nextOpen) {
      onClose?.()
    }
  }

  function handleBack() {
    leavingPageRef.current = true
    void flushOnClose({ notifyParent: false })
    if (returnHref) {
      router.push(returnHref)
      return
    }
    router.back()
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
    const personalBest =
      data?.personalBestsByExerciseId[exercise.exercise_id] ?? null

    setExerciseState((current) => {
      const nextSets = appendSetDraft(
        exercise,
        current[exercise.id] ?? [],
        previousSets,
        personalBest
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

  function requestRemoveExercise(
    exercise: ScheduledWorkoutExerciseWithDetails
  ) {
    setExerciseToRemove(exercise)
    removeExerciseConfirm.open()
  }

  async function handleExerciseStructureChanged() {
    await loadData()
    onChanged()
  }

  const status = data?.status ?? initialStatus
  const hasProgress = data
    ? workoutHasProgress(data, data.logSets)
    : false
  const isLoggingActive = active && data?.status === 'in_progress'

  function renderWorkoutLogExercise(
    exercise: ScheduledWorkoutExerciseWithDetails,
    options?: { className?: string }
  ) {
    if (!data) return null

    return (
      <WorkoutLogExercise
        key={exercise.id}
        exercise={exercise}
        libraryExercises={exercises}
        sets={exerciseState[exercise.id] ?? []}
        previousSets={
          data.previousSetsByExerciseId[exercise.exercise_id] ?? {}
        }
        previousSessionDate={
          data.previousSessionDateByExerciseId[exercise.exercise_id] ?? null
        }
        personalBest={
          data.personalBestsByExerciseId[exercise.exercise_id] ?? null
        }
        readOnly={readOnly}
        isWorkoutActive={isLoggingActive}
        clientId={clientId}
        workoutId={workoutId}
        variant={variant}
        onSetChange={(setNumber, patch) =>
          handleSetChange(exercise, setNumber, patch)
        }
        onAddSet={() => handleAddSet(exercise)}
        onRemoveSet={(setNumber) => handleRemoveSet(exercise, setNumber)}
        onEdit={() => setEditingExercise(exercise)}
        onReplace={() => setReplacingExercise(exercise)}
        onDelete={() => requestRemoveExercise(exercise)}
        onNotesChanged={() => void loadData()}
        allowPrescriptionEdits={canEditPrescription}
        weightUnit={weightUnit}
        className={options?.className}
        guidedLayout={showGuidedSession}
      />
    )
  }

  function renderClusteredExerciseList(
    exercises: ScheduledWorkoutExerciseWithDetails[]
  ) {
    const clusters = clusterExercisesBySuperset(exercises)

    return clusters.map((cluster, clusterIndex) => {
      if (cluster.type === 'single') {
        return (
          <React.Fragment key={cluster.exercise.id}>
            {renderWorkoutLogExercise(cluster.exercise)}
          </React.Fragment>
        )
      }

      return (
        <div
          key={`superset-${cluster.group}-${clusterIndex}`}
          className="mb-4 overflow-hidden rounded-lg border"
        >
          {cluster.exercises.length > 1 && (
            <div
              className={cn(
                'px-3 py-1.5 text-[10px] font-bold tracking-wide text-white uppercase',
                getSupersetColor(cluster.group)
              )}
            >
              Superset {cluster.group}
            </div>
          )}
          <div className="divide-y">
            {cluster.exercises.map((exercise) => (
              <React.Fragment key={exercise.id}>
                {renderWorkoutLogExercise(exercise)}
              </React.Fragment>
            ))}
          </div>
        </div>
      )
    })
  }

  const logContent = (
    <RestTimerProvider>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden',
          isPage && 'h-full'
        )}
      >
        <div
          className={cn(
            'shrink-0 border-b px-4 py-3 sm:px-5 sm:py-4',
            isPage ? 'pr-4 sm:pr-5' : 'pr-12 sm:pr-14'
          )}
        >
          {!isPage && (
            <>
              <DialogTitle className="sr-only">Log workout</DialogTitle>
              <DialogDescription className="sr-only">
                Log sets for {formatDayHeader(selectedDate)}
              </DialogDescription>
            </>
          )}

          {isPage && (
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              {guidedSessionEligible ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSessionViewMode((current) =>
                      current === 'guided' ? 'list' : 'guided'
                    )
                  }
                >
                  <LayoutList className="size-4" />
                  {sessionViewMode === 'guided' ? 'List view' : 'Guided'}
                </Button>
              ) : null}
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-muted-foreground text-xs font-medium">
                  {formatDayHeader(selectedDate)}
                </p>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                  {data?.name ?? 'Workout'}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 sm:gap-2 sm:pt-1">
                  <WorkoutStatusBadge status={status} hasProgress={hasProgress} />
                  <WorkoutElapsedTimer
                    startedAt={data?.started_at ?? null}
                    active={isLoggingActive}
                  />
                  {totalSetCount > 0 && (
                    <span className="text-muted-foreground text-sm">
                      {completedSetCount || savedCompletedCount} / {totalSetCount}{' '}
                      sets
                    </span>
                  )}
                </div>
              </div>
            </div>

            {totalSetCount > 0 && (
              <WorkoutProgressBar
                completed={completedSetCount || savedCompletedCount}
                total={totalSetCount}
              />
            )}

            {(canEditPrescription || canSkip) && (
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2 [&_button]:w-full sm:[&_button]:w-auto">
                {canEditPrescription && (
                  <AddExerciseDialog
                    clientId={clientId}
                    workoutId={workoutId}
                    exercises={exercises}
                    onAdded={handleExerciseStructureChanged}
                  />
                )}
                {canSkip && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={pending || loading}
                    onClick={skipWorkoutConfirm.open}
                  >
                    Skip
                  </Button>
                )}
              </div>
            )}

            {sections.length > 1 && !showGuidedSession && (
              <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <div className="inline-flex gap-1.5">
                  {sections.map((section, index) => (
                    <Button
                      key={section.label + index}
                      type="button"
                      size="sm"
                      variant={index === activeSectionIndex ? 'default' : 'outline'}
                      className="h-8 shrink-0 px-3 text-xs"
                      onClick={() => setActiveSectionIndex(index)}
                    >
                      {section.label}
                      <span
                        className={cn(
                          'ml-1 text-xs',
                          index === activeSectionIndex
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {section.exercises.length}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-6">
          {schemaError ? (
            <div className="py-6">
              <SchemaSetupNotice
                {...getWorkoutLogSchemaSetup(schemaError, isClientPortal)}
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
            </div>
          ) : data.exercises.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {allowPrescriptionEdits
                  ? 'Add exercises to this workout before logging.'
                  : 'Your coach has not added exercises to this session yet.'}
              </p>
              {canEditPrescription && (
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
          ) : showGuidedSession && activeExercise ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {activeExerciseSectionLabel && sections.length > 1 ? (
                <div className="border-b py-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    Section
                  </p>
                  <p className="font-semibold">{activeExerciseSectionLabel}</p>
                </div>
              ) : null}
              {renderWorkoutLogExercise(activeExercise, {
                className: 'mb-0 shadow-md',
              })}
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
              ).length > 0 &&
                renderClusteredExerciseList(
                  sections.length > 1 && activeSection
                    ? activeSection.exercises
                    : data.exercises
                )}
            </div>
          )}
        </div>

        {showGuidedSession && activeExercise && !loading ? (
          <div className="bg-card shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={activeExerciseIndex === 0}
                onClick={() =>
                  setActiveExerciseIndex((current) => Math.max(0, current - 1))
                }
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <div className="min-w-0 flex-1 text-center">
                <p className="text-muted-foreground text-xs font-medium">
                  {activeExerciseSectionLabel
                    ? `${activeExerciseSectionLabel} · `
                    : ''}
                  {activeSupersetPosition
                    ? `Superset ${activeSupersetPosition.group} · ${activeSupersetPosition.index} of ${activeSupersetPosition.total} · `
                    : ''}
                  Exercise {activeExerciseIndex + 1} of {orderedExercises.length}
                </p>
                <p className="truncate text-sm font-semibold">
                  {activeExercise.exercise.name}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={activeExerciseIndex >= orderedExercises.length - 1}
                onClick={() =>
                  setActiveExerciseIndex((current) =>
                    Math.min(orderedExercises.length - 1, current + 1)
                  )
                }
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {canEditPrescription && editingExercise && (
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

        {canEditPrescription && replacingExercise && (
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
      </div>
    </RestTimerProvider>
  )

  const celebrationDialog = (
    <PrCelebrationDialog
      open={showCelebration}
      onOpenChange={(open) => {
        setShowCelebration(open)
        if (!open) {
          setCelebrationPrs([])
          if (!isClientPortal) {
            toast.success('Workout complete!')
          }
        }
      }}
      prs={celebrationPrs}
      workoutName={data?.name ?? 'Workout'}
      athleteName={athleteName}
      weightUnit={weightUnit}
    />
  )

  const workoutCompleteDialog = isClientPortal ? (
    <WorkoutCompleteDialog
      open={showWorkoutComplete}
      onOpenChange={setShowWorkoutComplete}
      workoutName={data?.name ?? 'Workout'}
    />
  ) : null

  if (isPage) {
    return (
      <>
        <div className="bg-background fixed inset-0 z-50 flex flex-col pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:z-auto md:min-h-[calc(100dvh-10rem)] md:rounded-xl md:border md:pb-0">
          {logContent}
        </div>
        {celebrationDialog}
        {workoutCompleteDialog}
        {removeExerciseConfirm.dialog}
        {skipWorkoutConfirm.dialog}
      </>
    )
  }

  return (
    <>
      <Dialog open={active} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          viewport
          className="flex h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem),900px)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] w-[min(96vw,1200px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
        >
          {logContent}
        </DialogContent>
      </Dialog>
      {celebrationDialog}
      {workoutCompleteDialog}
      {removeExerciseConfirm.dialog}
      {skipWorkoutConfirm.dialog}
    </>
  )
}

export function WorkoutLogModal({
  open,
  onOpenChange,
  ...props
}: WorkoutLogModalProps) {
  return (
    <WorkoutLogScreen
      {...props}
      presentation="modal"
      active={open}
      onClose={() => onOpenChange(false)}
    />
  )
}
