import { EXERCISE_BLOCK_OPTIONS } from '@/lib/exercise-groups'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type {
  ScheduledExerciseBlock,
  ScheduledWorkoutExerciseWithDetails,
  ScheduledWorkoutStatus,
  WorkoutLogSet,
} from 'app/types/database'

export type WorkoutLogSection = {
  block: ScheduledExerciseBlock | null
  label: string
  exercises: ScheduledWorkoutExerciseWithDetails[]
}

export type PreviousSetLog = {
  weight: number
  reps: number
}

export type WorkoutLogSetDraft = {
  setNumber: number
  targetLabel: string | null
  weight: string
  reps: string
  durationSeconds: string
  barSpeed: string
  peakPower: string
  completed: boolean
  notes: string
}

const DEFAULT_SET_COUNT = 3

export function parseSetCount(sets: string | null | undefined): number {
  if (!sets?.trim()) return DEFAULT_SET_COUNT

  const match = sets.trim().match(/^(\d+)/)
  if (!match) return DEFAULT_SET_COUNT

  const count = Number.parseInt(match[1], 10)
  if (!Number.isFinite(count) || count < 1) return DEFAULT_SET_COUNT
  return Math.min(count, 20)
}

export function parseTargetForSet(
  reps: string | null | undefined,
  setNumber: number
): string | null {
  if (!reps?.trim()) return null

  const parts = reps
    .split(/[,/]/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return parts[setNumber - 1] ?? parts[parts.length - 1]
}

export function getWorkoutStatusLabel(status: ScheduledWorkoutStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Not started'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    case 'skipped':
      return 'Skipped'
    default:
      return status
  }
}

export function workoutHasProgress(
  workout: { started_at: string | null },
  logSets: { length: number } | readonly unknown[]
): boolean {
  return Boolean(workout.started_at) || logSets.length > 0
}

export function getWorkoutDisplayStatus(
  status: ScheduledWorkoutStatus,
  hasProgress: boolean
): { label: string; tone: 'muted' | 'active' | 'success' | 'warning' } {
  if (status === 'scheduled' && hasProgress) {
    return { label: 'Paused', tone: 'active' }
  }

  return {
    label: getWorkoutStatusLabel(status),
    tone: getWorkoutStatusTone(status),
  }
}

export function getWorkoutStatusTone(
  status: ScheduledWorkoutStatus
): 'muted' | 'active' | 'success' | 'warning' {
  switch (status) {
    case 'in_progress':
      return 'active'
    case 'completed':
      return 'success'
    case 'skipped':
      return 'warning'
    default:
      return 'muted'
  }
}

export function groupExercisesBySection(
  exercises: ScheduledWorkoutExerciseWithDetails[]
): WorkoutLogSection[] {
  const sections: WorkoutLogSection[] = []
  const sectionIndex = new Map<string, number>()

  for (const exercise of exercises) {
    const block = exercise.exercise_block ?? null
    const key = block ?? '__default__'
    const label =
      EXERCISE_BLOCK_OPTIONS.find((option) => option.value === block)?.label ??
      'Workout'

    const existingIndex = sectionIndex.get(key)
    if (existingIndex === undefined) {
      sectionIndex.set(key, sections.length)
      sections.push({ block, label, exercises: [exercise] })
      continue
    }

    sections[existingIndex].exercises.push(exercise)
  }

  return sections
}

export function buildSetDrafts(
  exercise: ScheduledWorkoutExerciseWithDetails,
  existingSets: WorkoutLogSet[]
): WorkoutLogSetDraft[] {
  const setCount = parseSetCount(exercise.sets)
  const bySetNumber = new Map(
    existingSets.map((row) => [row.set_number, row])
  )

  return Array.from({ length: setCount }, (_, index) => {
    const setNumber = index + 1
    const existing = bySetNumber.get(setNumber)

    return {
      setNumber,
      targetLabel: parseTargetForSet(exercise.reps, setNumber),
      weight: existing?.weight != null ? String(existing.weight) : '',
      reps: existing?.reps != null ? String(existing.reps) : '',
      durationSeconds:
        existing?.duration_seconds != null
          ? String(existing.duration_seconds)
          : '',
      barSpeed: existing?.bar_speed != null ? String(existing.bar_speed) : '',
      peakPower:
        existing?.peak_power != null ? String(existing.peak_power) : '',
      completed: existing?.completed ?? false,
      notes: existing?.notes ?? '',
    }
  }).map((draft) =>
    applySetPatchWithCompletion(
      draft,
      {},
      getLogFieldsForExercise(exercise)
    )
  )
}

export function getLogFieldsForExercise(
  exercise: ScheduledWorkoutExerciseWithDetails
) {
  const options = parseTrackingOptions(exercise.tracking_options)

  return {
    showWeight: !options.completionLift && !options.bodyweight,
    showReps: !options.completionLift && exercise.rep_mode === 'reps',
    showDuration: !options.completionLift && exercise.rep_mode === 'time',
    showBarSpeed: options.trackBarSpeed,
    showPeakPower: options.trackPeakPower,
    completionOnly: options.completionLift,
  }
}

export function countCompletedSets(logSets: WorkoutLogSet[]): number {
  return logSets.filter((row) => row.completed).length
}

export function countTotalSetsForWorkout(
  exercises: ScheduledWorkoutExerciseWithDetails[]
): number {
  return exercises.reduce(
    (total, exercise) => total + parseSetCount(exercise.sets),
    0
  )
}

export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

export function parseOptionalInt(value: string): number | null {
  const parsed = parseOptionalNumber(value)
  if (parsed == null) return null
  return Math.round(parsed)
}

const SUPERSET_COLORS: Record<string, string> = {
  A: 'bg-sky-500',
  B: 'bg-violet-500',
  C: 'bg-amber-500',
  D: 'bg-rose-500',
}

export function getSupersetColor(group: string | null): string {
  if (!group) return 'bg-muted-foreground'
  return SUPERSET_COLORS[group] ?? 'bg-muted-foreground'
}

/** Epley formula — standard estimated 1RM from weight × reps. */
export function calculateE1rm(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0) return null
  if (reps === 1) return Math.round(weight)
  return Math.round(weight * (1 + reps / 30))
}

export function formatPreviousPerformance(weight: number, reps: number): string {
  return `${weight} × ${reps}`
}

export function getBestE1rmFromDrafts(
  sets: Pick<WorkoutLogSetDraft, 'weight' | 'reps'>[]
): number | null {
  let best: number | null = null

  for (const set of sets) {
    const weight = parseOptionalNumber(set.weight)
    const reps = parseOptionalInt(set.reps)
    if (weight == null || reps == null) continue

    const estimate = calculateE1rm(weight, reps)
    if (estimate != null && (best == null || estimate > best)) {
      best = estimate
    }
  }

  return best
}

export function deriveSetCompleted(
  set: Pick<
    WorkoutLogSetDraft,
    'weight' | 'reps' | 'durationSeconds' | 'completed'
  >,
  fields: ReturnType<typeof getLogFieldsForExercise>
): boolean {
  if (fields.completionOnly) {
    return set.completed
  }

  if (fields.showWeight && fields.showReps) {
    return set.weight.trim() !== '' && set.reps.trim() !== ''
  }

  if (!fields.showWeight && fields.showReps) {
    return set.reps.trim() !== ''
  }

  if (fields.showDuration) {
    return set.durationSeconds.trim() !== ''
  }

  return false
}

export function getBestE1rmFromPrevious(
  previousSets: Record<number, PreviousSetLog>
): number | null {
  let best: number | null = null

  for (const set of Object.values(previousSets)) {
    const estimate = calculateE1rm(set.weight, set.reps)
    if (estimate != null && (best == null || estimate > best)) {
      best = estimate
    }
  }

  return best
}

export function applySetPatchWithCompletion(
  set: WorkoutLogSetDraft,
  patch: Partial<WorkoutLogSetDraft>,
  fields: ReturnType<typeof getLogFieldsForExercise>
): WorkoutLogSetDraft {
  const next = { ...set, ...patch }
  return {
    ...next,
    completed: deriveSetCompleted(next, fields),
  }
}
