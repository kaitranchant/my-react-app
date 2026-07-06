import { EXERCISE_BLOCK_OPTIONS } from '@/lib/exercise-groups'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import { isExerciseEligibleForProgressiveLoad } from '@/lib/progressive-overload-eligibility'
import type {
  ExercisePersonalBest,
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
  weight: number | null
  reps: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
}

export type WorkoutLogSetDraft = {
  setNumber: number
  targetLabel: string | null
  weight: string
  reps: string
  durationSeconds: string
  distanceMeters: string
  barSpeed: string
  peakPower: string
  completed: boolean
  predicted: boolean
  notes: string
}

const DEFAULT_SET_COUNT = 3
export const MAX_LOG_SETS = 20
export const MIN_LOG_SETS = 1

const DEFAULT_REST_SECONDS = 90
const DEFAULT_WEIGHT_INCREMENT = 2.5

export type SuggestLogValuesOptions = {
  personalBest?: ExercisePersonalBest | null
  progressiveOverloadEnabled?: boolean
}

/** Parse rest duration from prescription text like "90", "90s", or "1:30". */
export function parseRestSeconds(
  restSeconds: string | null | undefined
): number {
  if (!restSeconds?.trim()) return DEFAULT_REST_SECONDS

  const trimmed = restSeconds.trim().toLowerCase().replace(/s$/, '')

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const minutes = Number.parseInt(colonMatch[1], 10)
    const seconds = Number.parseInt(colonMatch[2], 10)
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return Math.max(5, Math.min(600, minutes * 60 + seconds))
    }
  }

  const numeric = Number.parseInt(trimmed.replace(/[^\d]/g, ''), 10)
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.max(5, Math.min(600, numeric))
  }

  return DEFAULT_REST_SECONDS
}

export function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

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

  const trimmed = reps.trim()

  const spaceParts = trimmed
    .split(/\s+/)
    .filter((part) => /\d/.test(part))
  if (
    spaceParts.length > 1 &&
    !trimmed.includes(',') &&
    !trimmed.includes('/')
  ) {
    return spaceParts[setNumber - 1] ?? spaceParts[spaceParts.length - 1]
  }

  const parts = trimmed
    .split(/[,/]/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return parts[setNumber - 1] ?? parts[parts.length - 1]
}

export function getExerciseRepMode(
  exercise: Pick<ScheduledWorkoutExerciseWithDetails, 'rep_mode'>
): 'reps' | 'time' | 'distance' {
  if (exercise.rep_mode === 'time') return 'time'
  if (exercise.rep_mode === 'distance') return 'distance'
  return 'reps'
}

export function getTargetLabelForSet(
  exercise: Pick<ScheduledWorkoutExerciseWithDetails, 'reps' | 'prescription'>,
  setNumber: number
): string | null {
  const fromReps = parseTargetForSet(exercise.reps, setNumber)
  if (fromReps) return fromReps

  return parseTargetForSet(exercise.prescription, setNumber)
}

/** Pull a numeric value suitable for an input from a prescription label like "10" or "10-12". */
export function parsePrescriptionNumber(
  target: string | null | undefined
): string | null {
  if (!target?.trim()) return null

  const match = target.trim().match(/^(\d+(?:\.\d+)?)/)
  return match ? match[1] : null
}

/** Parse duration prescriptions like "30", "30s", or "1:00" into seconds for logging. */
export function parseDurationPrescription(
  target: string | null | undefined
): string | null {
  if (!target?.trim()) return null

  const trimmed = target.trim().toLowerCase().replace(/s$/, '')

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const minutes = Number.parseInt(colonMatch[1], 10)
    const seconds = Number.parseInt(colonMatch[2], 10)
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return String(minutes * 60 + seconds)
    }
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)/)
  if (!match) return null

  const value = Number.parseFloat(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  return String(Math.round(value))
}

export function getPrescribedDurationSecondsForSet(
  exercise: Pick<ScheduledWorkoutExerciseWithDetails, 'reps' | 'prescription'>,
  setNumber: number
): number | null {
  const label = getTargetLabelForSet(exercise, setNumber)
  const parsed = parseDurationPrescription(label)
  if (!parsed) return null

  const value = Number.parseInt(parsed, 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

const METERS_PER_MILE = 1609.34

/** Parse distance prescriptions like "400", "400m", "5k", "1.5km", or "1mi" into meters. */
export function parseDistancePrescription(
  target: string | null | undefined
): string | null {
  if (!target?.trim()) return null

  const trimmed = target.trim().toLowerCase()

  const mileMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?)$/)
  if (mileMatch) {
    const miles = Number.parseFloat(mileMatch[1])
    if (Number.isFinite(miles) && miles > 0) {
      return String(Math.round(miles * METERS_PER_MILE))
    }
  }

  const kmMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:k(?:m)?)$/)
  if (kmMatch) {
    const km = Number.parseFloat(kmMatch[1])
    if (Number.isFinite(km) && km > 0) {
      return String(Math.round(km * 1000))
    }
  }

  const meterMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*m$/)
  if (meterMatch) {
    const meters = Number.parseFloat(meterMatch[1])
    if (Number.isFinite(meters) && meters > 0) {
      return String(Math.round(meters))
    }
  }

  const plainMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (plainMatch) {
    const meters = Number.parseFloat(plainMatch[1])
    if (Number.isFinite(meters) && meters > 0) {
      return String(Math.round(meters))
    }
  }

  return null
}

export function getPrescribedDistanceMetersForSet(
  exercise: Pick<ScheduledWorkoutExerciseWithDetails, 'reps' | 'prescription'>,
  setNumber: number
): number | null {
  const label = getTargetLabelForSet(exercise, setNumber)
  const parsed = parseDistancePrescription(label)
  if (!parsed) return null

  const value = Number.parseInt(parsed, 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function formatDistanceMeters(meters: number): string {
  if (meters >= METERS_PER_MILE) {
    const miles = meters / METERS_PER_MILE
    if (Math.abs(miles - Math.round(miles)) < 0.05) {
      return `${Math.round(miles)}mi`
    }
  }

  if (meters >= 1000) {
    const km = meters / 1000
    const rounded = Math.round(km * 10) / 10
    return Number.isInteger(rounded) ? `${rounded}km` : `${rounded}km`
  }

  return `${meters}m`
}

export function getPreviousDurationSeconds(
  previous: PreviousSetLog | null | undefined
): number | null {
  if (!previous) return null
  if (previous.durationSeconds != null) return previous.durationSeconds
  if (previous.reps != null) return previous.reps
  return null
}

export function getPreviousDistanceMeters(
  previous: PreviousSetLog | null | undefined
): number | null {
  if (!previous) return null
  return previous.distanceMeters ?? null
}

/** Parse a percent-of-1RM prescription like "75", "75%", or "70-80". */
export function parseWeightPercent(
  value: string | null | undefined
): number | null {
  if (!value?.trim()) return null

  const trimmed = value.trim().replace(/%$/, '')
  const rangeMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/
  )

  if (rangeMatch) {
    const low = Number.parseFloat(rangeMatch[1])
    const high = Number.parseFloat(rangeMatch[2])
    if (
      Number.isFinite(low) &&
      Number.isFinite(high) &&
      low > 0 &&
      high > 0 &&
      low <= 100 &&
      high <= 100
    ) {
      return (low + high) / 2
    }
    return null
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)/)
  if (!match) return null

  const percent = Number.parseFloat(match[1])
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return null
  }

  return percent
}

export function parseTargetWeight(
  value: string | null | undefined
): number | null {
  if (!value?.trim()) return null
  const parsed = Number.parseFloat(value.trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

export function roundToWeightIncrement(
  weight: number,
  increment = DEFAULT_WEIGHT_INCREMENT
): number {
  return Math.round(weight / increment) * increment
}

export function calculateWeightFromPercent(
  e1rm: number,
  percent: number
): number {
  return roundToWeightIncrement((e1rm * percent) / 100)
}

export function previousSessionMetTargets(
  exercise: Pick<
    ScheduledWorkoutExerciseWithDetails,
    'reps' | 'prescription' | 'sets' | 'rep_mode' | 'tracking_options'
  >,
  previousSets: Record<number, PreviousSetLog>
): boolean {
  const fields = getLogFieldsForExercise(
    exercise as ScheduledWorkoutExerciseWithDetails
  )
  const prescribedCount = parseSetCount(exercise.sets)
  const setNumbers = Object.keys(previousSets)
    .map(Number)
    .filter((setNumber) => setNumber >= 1 && setNumber <= prescribedCount)

  if (setNumbers.length < prescribedCount) {
    return false
  }

  return setNumbers.every((setNumber) => {
    const previous = previousSets[setNumber]
    if (!previous) return false

    const targetLabel = getTargetLabelForSet(exercise, setNumber)

    if (fields.showDuration) {
      const targetDuration = parseDurationPrescription(targetLabel)
      if (!targetDuration) return true

      const loggedDuration = getPreviousDurationSeconds(previous)
      if (loggedDuration == null) return false

      return loggedDuration >= Number.parseInt(targetDuration, 10)
    }

    if (fields.showDistance) {
      const targetDistance = parseDistancePrescription(targetLabel)
      if (!targetDistance) return true

      const loggedDistance = getPreviousDistanceMeters(previous)
      if (loggedDistance == null) return false

      return loggedDistance >= Number.parseInt(targetDistance, 10)
    }

    const targetReps = parsePrescriptionNumber(targetLabel)
    if (!targetReps) return true
    if (previous.reps == null) return false

    return previous.reps >= Number.parseFloat(targetReps)
  })
}

export function suggestProgressiveLoadWeight(
  exercise: ScheduledWorkoutExerciseWithDetails,
  previousSets: Record<number, PreviousSetLog>,
  progressiveOverloadEnabled = false
): number | null {
  if (!progressiveOverloadEnabled) return null
  if (!isExerciseEligibleForProgressiveLoad(exercise)) return null
  if (!previousSessionMetTargets(exercise, previousSets)) return null

  const weights = Object.values(previousSets)
    .map((set) => set.weight)
    .filter((value): value is number => value != null)
  if (weights.length === 0) return null

  return roundToWeightIncrement(Math.max(...weights) + DEFAULT_WEIGHT_INCREMENT)
}

export function resolvePreviousSetLog(
  previousSets: Record<number, PreviousSetLog>,
  setNumber: number
): PreviousSetLog | null {
  const exact = previousSets[setNumber]
  if (exact) return exact

  const setNumbers = Object.keys(previousSets)
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)

  if (setNumbers.length === 0) return null

  let fallback: PreviousSetLog | null = null
  for (const number of setNumbers) {
    if (number <= setNumber) {
      fallback = previousSets[number]
    }
  }

  return fallback ?? previousSets[setNumbers[0]] ?? null
}

function hasPreviousSessionData(
  previousSets: Record<number, PreviousSetLog>
): boolean {
  return Object.keys(previousSets).length > 0
}

export function getSuggestedLogValuesForSet(
  exercise: ScheduledWorkoutExerciseWithDetails,
  setNumber: number,
  previousSets: Record<number, PreviousSetLog> = {},
  options: SuggestLogValuesOptions = {}
): Pick<WorkoutLogSetDraft, 'weight' | 'reps' | 'durationSeconds' | 'distanceMeters'> {
  const fields = getLogFieldsForExercise(exercise)
  const targetLabel = getTargetLabelForSet(exercise, setNumber)
  const previous = resolvePreviousSetLog(previousSets, setNumber)
  const hasHistory = hasPreviousSessionData(previousSets)

  let weight = ''
  let reps = ''
  let durationSeconds = ''
  let distanceMeters = ''

  if (fields.showReps) {
    if (previous?.reps != null) {
      reps = String(previous.reps)
    } else {
      const prescribed = parsePrescriptionNumber(targetLabel)
      if (prescribed) {
        reps = prescribed
      }
    }
  }

  if (fields.showDuration) {
    const previousDuration = getPreviousDurationSeconds(previous)
    if (previousDuration != null) {
      durationSeconds = String(previousDuration)
    } else {
      const prescribed = parseDurationPrescription(targetLabel)
      if (prescribed) {
        durationSeconds = prescribed
      }
    }
  }

  if (fields.showDistance) {
    const previousDistance = getPreviousDistanceMeters(previous)
    if (previousDistance != null) {
      distanceMeters = String(previousDistance)
    } else {
      const prescribed = parseDistancePrescription(targetLabel)
      if (prescribed) {
        distanceMeters = prescribed
      }
    }
  }

  if (fields.showWeight) {
    const targetWeight = parseTargetWeight(exercise.target_weight)
    const e1rm = options.personalBest?.e1rm ?? null
    const percent = parseWeightPercent(exercise.weight_percent)
    const progressiveWeight = suggestProgressiveLoadWeight(
      exercise,
      previousSets,
      options.progressiveOverloadEnabled ?? false
    )

    if (targetWeight != null) {
      weight = String(targetWeight)
    } else if (progressiveWeight != null) {
      weight = String(progressiveWeight)
    } else if (previous?.weight != null) {
      weight = String(previous.weight)
    } else if (!hasHistory && e1rm != null && percent != null) {
      weight = String(calculateWeightFromPercent(e1rm, percent))
    }
  }

  return { weight, reps, durationSeconds, distanceMeters }
}

function hasSuggestedLogValues(
  values: Pick<
    WorkoutLogSetDraft,
    'weight' | 'reps' | 'durationSeconds' | 'distanceMeters'
  >
): boolean {
  return Boolean(
    values.weight || values.reps || values.durationSeconds || values.distanceMeters
  )
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

export function getEffectiveSetCount(
  exercise: ScheduledWorkoutExerciseWithDetails,
  existingSets: WorkoutLogSet[] = []
): number {
  const prescribed = parseSetCount(exercise.sets)
  const loggedMax = existingSets.reduce(
    (max, row) => Math.max(max, row.set_number),
    0
  )
  return Math.min(Math.max(prescribed, loggedMax), MAX_LOG_SETS)
}

function buildSetDraft(
  exercise: ScheduledWorkoutExerciseWithDetails,
  setNumber: number,
  existing: WorkoutLogSet | undefined,
  previousSets: Record<number, PreviousSetLog>,
  personalBest: ExercisePersonalBest | null = null,
  progressiveOverloadEnabled = false
): WorkoutLogSetDraft {
  const targetLabel = getTargetLabelForSet(exercise, setNumber)
  const suggested = getSuggestedLogValuesForSet(
    exercise,
    setNumber,
    previousSets,
    { personalBest, progressiveOverloadEnabled }
  )

  if (!existing) {
    return {
      setNumber,
      targetLabel,
      weight: suggested.weight,
      reps: suggested.reps,
      durationSeconds: suggested.durationSeconds,
      distanceMeters: suggested.distanceMeters,
      barSpeed: '',
      peakPower: '',
      completed: false,
      predicted: hasSuggestedLogValues(suggested),
      notes: '',
    }
  }

  const weight =
    existing.weight != null ? String(existing.weight) : suggested.weight
  const reps = existing.reps != null ? String(existing.reps) : suggested.reps
  const durationSeconds =
    existing.duration_seconds != null
      ? String(existing.duration_seconds)
      : suggested.durationSeconds
  const distanceMeters =
    existing.distance_meters != null
      ? String(existing.distance_meters)
      : suggested.distanceMeters
  const usedSuggestion =
    (existing.weight == null && suggested.weight !== '') ||
    (existing.reps == null && suggested.reps !== '') ||
    (existing.duration_seconds == null && suggested.durationSeconds !== '') ||
    (existing.distance_meters == null && suggested.distanceMeters !== '')

  return {
    setNumber,
    targetLabel,
    weight,
    reps,
    durationSeconds,
    distanceMeters,
    barSpeed: existing.bar_speed != null ? String(existing.bar_speed) : '',
    peakPower: existing.peak_power != null ? String(existing.peak_power) : '',
    completed: existing.completed ?? false,
    predicted: usedSuggestion && !(existing.completed ?? false),
    notes: existing.notes ?? '',
  }
}

export function buildSetDrafts(
  exercise: ScheduledWorkoutExerciseWithDetails,
  existingSets: WorkoutLogSet[],
  previousSets: Record<number, PreviousSetLog> = {},
  personalBest: ExercisePersonalBest | null = null,
  progressiveOverloadEnabled = false
): WorkoutLogSetDraft[] {
  const fields = getLogFieldsForExercise(exercise)
  const setCount = getEffectiveSetCount(exercise, existingSets)
  const bySetNumber = new Map(
    existingSets.map((row) => [row.set_number, row])
  )

  const drafts = Array.from({ length: setCount }, (_, index) => {
    const setNumber = index + 1
    return buildSetDraft(
      exercise,
      setNumber,
      bySetNumber.get(setNumber),
      previousSets,
      personalBest,
      progressiveOverloadEnabled
    )
  })

  return restorePredictedFlags(drafts, fields)
}

export function getLogFieldsForExercise(
  exercise: ScheduledWorkoutExerciseWithDetails
) {
  const options = parseTrackingOptions(exercise.tracking_options)
  const repMode = getExerciseRepMode(exercise)

  return {
    showWeight: !options.completionLift && !options.bodyweight,
    showReps: !options.completionLift && repMode === 'reps',
    showDuration: !options.completionLift && repMode === 'time',
    showDistance: !options.completionLift && repMode === 'distance',
    showBarSpeed: options.trackBarSpeed,
    showPeakPower: options.trackPeakPower,
    completionOnly: options.completionLift,
  }
}

export type WorkoutLogFieldFlags = ReturnType<typeof getLogFieldsForExercise>

export function exerciseHasRpeTarget(
  exercise: Pick<ScheduledWorkoutExerciseWithDetails, 'rpe_target'>
): boolean {
  return Boolean(exercise.rpe_target?.trim())
}

export function getWorkoutLogSetGridTemplate(
  fields: WorkoutLogFieldFlags,
  canRemoveSet: boolean,
  options?: { hideConfirmColumn?: boolean }
): string {
  if (fields.completionOnly) {
    if (options?.hideConfirmColumn) {
      return canRemoveSet
        ? '1.5rem minmax(0, 1fr) 1.5rem'
        : '1.5rem minmax(0, 1fr)'
    }

    return canRemoveSet
      ? '1.5rem minmax(0, 1fr) 2rem 1.5rem'
      : '1.5rem minmax(0, 1fr) 2rem'
  }

  const inputCount =
    Number(fields.showWeight) +
    Number(fields.showReps) +
    Number(fields.showDuration) +
    Number(fields.showDistance)

  const parts = ['1.5rem', '3.25rem']

  if (inputCount === 1) {
    parts.push('minmax(4rem, 1fr)')
  } else if (inputCount === 2) {
    parts.push('minmax(3rem, 1fr)', 'minmax(3rem, 1fr)')
  } else {
    parts.push('3.5rem', '3.5rem', '3.5rem')
  }

  parts.push('2rem')
  if (canRemoveSet) {
    parts.push('1.5rem')
  }

  return parts.join(' ')
}

export function countCompletedSets(logSets: WorkoutLogSet[]): number {
  return logSets.filter((row) => row.completed).length
}

export function isExerciseFullyLogged(sets: WorkoutLogSetDraft[]): boolean {
  return sets.length > 0 && sets.every((set) => set.completed)
}

export function isGuidedWorkoutSessionEligible(input: {
  isPage: boolean
  readOnly: boolean
  isCompleted: boolean
  exerciseCount: number
  isClientPortal: boolean
  preferMobileKeypad: boolean
}): boolean {
  return (
    input.isPage &&
    !input.readOnly &&
    !input.isCompleted &&
    input.exerciseCount > 0 &&
    (input.isClientPortal || input.preferMobileKeypad)
  )
}

export function findResumeExerciseIndex(
  exercises: ScheduledWorkoutExerciseWithDetails[],
  exerciseState: Record<string, WorkoutLogSetDraft[]>
): number {
  if (exercises.length === 0) return 0

  const firstIncomplete = exercises.findIndex((exercise) => {
    const sets = exerciseState[exercise.id] ?? []
    return !isExerciseFullyLogged(sets)
  })

  return firstIncomplete === -1 ? exercises.length - 1 : firstIncomplete
}

export function getSectionLabelForExercise(
  exercise: ScheduledWorkoutExerciseWithDetails,
  sections: WorkoutLogSection[]
): string | null {
  if (sections.length <= 1) return null

  for (const section of sections) {
    if (section.exercises.some((row) => row.id === exercise.id)) {
      return section.label
    }
  }

  return null
}

export function isWorkoutFullyLogged(
  exercises: ScheduledWorkoutExerciseWithDetails[],
  exerciseState: Record<string, WorkoutLogSetDraft[]>
): boolean {
  if (exercises.length === 0) return false

  return exercises.every((exercise) => {
    const sets = exerciseState[exercise.id] ?? []
    return isExerciseFullyLogged(sets)
  })
}

export function countTotalSetsForWorkout(
  exercises: ScheduledWorkoutExerciseWithDetails[]
): number {
  return exercises.reduce(
    (total, exercise) => total + parseSetCount(exercise.sets),
    0
  )
}

export function countTotalSetsFromDrafts(
  exerciseState: Record<string, WorkoutLogSetDraft[]>
): number {
  return Object.values(exerciseState).reduce(
    (total, sets) => total + sets.length,
    0
  )
}

export function appendSetDraft(
  exercise: ScheduledWorkoutExerciseWithDetails,
  sets: WorkoutLogSetDraft[],
  previousSets: Record<number, PreviousSetLog> = {},
  personalBest: ExercisePersonalBest | null = null
): WorkoutLogSetDraft[] | null {
  if (sets.length >= MAX_LOG_SETS) return null

  const nextSetNumber =
    sets.length > 0 ? Math.max(...sets.map((set) => set.setNumber)) + 1 : 1

  const suggested = getSuggestedLogValuesForSet(
    exercise,
    nextSetNumber,
    previousSets,
    { personalBest }
  )
  const fields = getLogFieldsForExercise(exercise)
  const lastSet = sets[sets.length - 1]

  let weight = suggested.weight
  let reps = suggested.reps
  let durationSeconds = suggested.durationSeconds
  let distanceMeters = suggested.distanceMeters
  let predicted = hasSuggestedLogValues(suggested)

  if (lastSet) {
    if (fields.showWeight && fields.showReps) {
      if (lastSet.weight.trim() !== '' && lastSet.reps.trim() !== '') {
        weight = lastSet.weight
        reps = lastSet.reps
        predicted = true
      }
    } else if (fields.showWeight && fields.showDuration) {
      if (
        lastSet.weight.trim() !== '' &&
        lastSet.durationSeconds.trim() !== ''
      ) {
        weight = lastSet.weight
        durationSeconds = lastSet.durationSeconds
        predicted = true
      }
    } else if (fields.showWeight && fields.showDistance) {
      if (
        lastSet.weight.trim() !== '' &&
        lastSet.distanceMeters.trim() !== ''
      ) {
        weight = lastSet.weight
        distanceMeters = lastSet.distanceMeters
        predicted = true
      }
    } else if (!fields.showWeight && fields.showReps && lastSet.reps.trim() !== '') {
      reps = lastSet.reps
      predicted = true
    } else if (
      fields.showDuration &&
      lastSet.durationSeconds.trim() !== ''
    ) {
      durationSeconds = lastSet.durationSeconds
      predicted = true
    } else if (
      fields.showDistance &&
      lastSet.distanceMeters.trim() !== ''
    ) {
      distanceMeters = lastSet.distanceMeters
      predicted = true
    }
  }

  return [
    ...sets,
    {
      setNumber: nextSetNumber,
      targetLabel: getTargetLabelForSet(exercise, nextSetNumber),
      weight,
      reps,
      durationSeconds,
      distanceMeters,
      barSpeed: '',
      peakPower: '',
      completed: false,
      predicted,
      notes: '',
    },
  ]
}

export function removeSetDraft(
  exercise: ScheduledWorkoutExerciseWithDetails,
  sets: WorkoutLogSetDraft[],
  setNumber: number
): WorkoutLogSetDraft[] | null {
  if (sets.length <= MIN_LOG_SETS) return null

  return sets
    .filter((set) => set.setNumber !== setNumber)
    .map((set, index) => {
      const nextSetNumber = index + 1
      return {
        ...set,
        setNumber: nextSetNumber,
        targetLabel: getTargetLabelForSet(exercise, nextSetNumber),
      }
    })
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

export { getSupersetColor } from '@/lib/superset-groups'

/** Epley formula — standard estimated 1RM from weight × reps. */
export function calculateE1rm(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0) return null
  if (reps === 1) return Math.round(weight)
  return Math.round(weight * (1 + reps / 30))
}

export function formatPreviousPerformance(
  weight: number | null,
  reps: number | null,
  durationSeconds?: number | null,
  distanceMeters?: number | null
): string {
  if (distanceMeters != null) {
    const distanceLabel = formatDistanceMeters(distanceMeters)
    if (weight != null) {
      return `${weight} × ${distanceLabel}`
    }
    return distanceLabel
  }

  if (durationSeconds != null) {
    if (weight != null) {
      return `${weight} × ${durationSeconds}s`
    }
    return `${durationSeconds}s`
  }

  if (weight != null && reps != null) {
    return `${weight} × ${reps}`
  }
  if (reps != null) {
    return `${reps} reps`
  }
  if (weight != null) {
    return `${weight}`
  }
  return '—'
}

export function setHasRequiredLogValues(
  set: WorkoutLogSetDraft,
  fields: WorkoutLogFieldFlags
): boolean {
  if (fields.completionOnly) return true

  if (fields.showWeight && fields.showReps) {
    return set.weight.trim() !== '' && set.reps.trim() !== ''
  }

  if (fields.showWeight && fields.showDuration) {
    return set.weight.trim() !== '' && set.durationSeconds.trim() !== ''
  }

  if (fields.showWeight && fields.showDistance) {
    return set.weight.trim() !== '' && set.distanceMeters.trim() !== ''
  }

  if (fields.showReps) {
    return set.reps.trim() !== ''
  }

  if (fields.showDuration) {
    return set.durationSeconds.trim() !== ''
  }

  if (fields.showDistance) {
    return set.distanceMeters.trim() !== ''
  }

  if (fields.showWeight) {
    return set.weight.trim() !== ''
  }

  return false
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

export function applySetPatchWithCompletion(
  set: WorkoutLogSetDraft,
  patch: Partial<WorkoutLogSetDraft>,
  _fields: ReturnType<typeof getLogFieldsForExercise>
): WorkoutLogSetDraft {
  const next = { ...set, ...patch }

  if ('completed' in patch) {
    return next
  }

  const touchesLogValues =
    'weight' in patch ||
    'reps' in patch ||
    'durationSeconds' in patch ||
    'distanceMeters' in patch ||
    'barSpeed' in patch ||
    'peakPower' in patch

  if (touchesLogValues && set.completed) {
    return { ...next, completed: false, predicted: false }
  }

  return { ...next, completed: set.completed }
}

function isSetLogEmpty(
  set: WorkoutLogSetDraft,
  fields: ReturnType<typeof getLogFieldsForExercise>
): boolean {
  return !setHasRequiredLogValues(set, fields)
}

function canReceivePrediction(
  set: WorkoutLogSetDraft,
  _fields: ReturnType<typeof getLogFieldsForExercise>
): boolean {
  return !set.completed
}

function findPropagationSourceSet(
  sets: WorkoutLogSetDraft[],
  fields: ReturnType<typeof getLogFieldsForExercise>
): WorkoutLogSetDraft | null {
  let lastCompleted: WorkoutLogSetDraft | null = null

  for (const set of sets) {
    if (!getPropagationValues(set, fields)) continue
    if (set.completed) {
      lastCompleted = set
    }
  }

  if (lastCompleted) return lastCompleted

  for (const set of sets) {
    if (!getPropagationValues(set, fields)) continue

    const hasUserAnchor =
      (fields.showWeight && set.weight.trim() !== '') ||
      (fields.showReps && set.reps.trim() !== '') ||
      (fields.showDuration && set.durationSeconds.trim() !== '') ||
      (fields.showDistance && set.distanceMeters.trim() !== '')

    if (hasUserAnchor) {
      return set
    }
  }

  return null
}

function restorePredictedFlags(
  sets: WorkoutLogSetDraft[],
  fields: ReturnType<typeof getLogFieldsForExercise>
): WorkoutLogSetDraft[] {
  const source = findPropagationSourceSet(sets, fields)
  if (!source) return sets

  const sourceValues = getPropagationValues(source, fields)
  if (!sourceValues) return sets

  return sets.map((set) => {
    if (set.setNumber <= source.setNumber || set.completed) return set
    if (set.predicted) return set

    const setValues = getPropagationValues(set, fields)
    if (!setValues || !propagationValuesMatch(sourceValues, setValues)) {
      return set
    }

    return { ...set, predicted: true }
  })
}

function propagationValuesMatch(
  a: NonNullable<ReturnType<typeof getPropagationValues>>,
  b: NonNullable<ReturnType<typeof getPropagationValues>>
): boolean {
  return (
    (a.weight ?? '') === (b.weight ?? '') &&
    (a.reps ?? '') === (b.reps ?? '') &&
    (a.durationSeconds ?? '') === (b.durationSeconds ?? '') &&
    (a.distanceMeters ?? '') === (b.distanceMeters ?? '')
  )
}

function getPropagationValues(
  source: WorkoutLogSetDraft,
  fields: ReturnType<typeof getLogFieldsForExercise>
): Partial<
  Pick<WorkoutLogSetDraft, 'weight' | 'reps' | 'durationSeconds' | 'distanceMeters'>
> | null {
  const values: Partial<
    Pick<WorkoutLogSetDraft, 'weight' | 'reps' | 'durationSeconds' | 'distanceMeters'>
  > = {}

  if (fields.showWeight && source.weight.trim() !== '') {
    values.weight = source.weight
  }

  if (fields.showReps && source.reps.trim() !== '') {
    values.reps = source.reps
  }

  if (fields.showDuration && source.durationSeconds.trim() !== '') {
    values.durationSeconds = source.durationSeconds
  }

  if (fields.showDistance && source.distanceMeters.trim() !== '') {
    values.distanceMeters = source.distanceMeters
  }

  return Object.keys(values).length > 0 ? values : null
}

function propagateValuesToFollowingSets(
  sets: WorkoutLogSetDraft[],
  sourceSetNumber: number,
  fields: ReturnType<typeof getLogFieldsForExercise>
): WorkoutLogSetDraft[] {
  const source = sets.find((set) => set.setNumber === sourceSetNumber)
  if (!source) return sets

  const values = getPropagationValues(source, fields)
  if (!values) return sets

  return sets.map((set) => {
    if (set.setNumber <= sourceSetNumber || !canReceivePrediction(set, fields)) {
      return set
    }

    return {
      ...set,
      ...values,
      predicted: true,
      completed: false,
    }
  })
}

export function applyExerciseSetChanges(
  sets: WorkoutLogSetDraft[],
  setNumber: number,
  patch: Partial<WorkoutLogSetDraft>,
  fields: ReturnType<typeof getLogFieldsForExercise>
): WorkoutLogSetDraft[] {
  if ('completed' in patch && Object.keys(patch).length === 1) {
    const targetCompleted = Boolean(patch.completed)

    let nextSets = sets.map((set) => {
      if (set.setNumber !== setNumber) return set

      if (!targetCompleted) {
        return { ...set, completed: false, predicted: false }
      }

      if (fields.completionOnly) {
        return { ...set, completed: true, predicted: false }
      }

      const hasValues = setHasRequiredLogValues(set, fields)

      if (!hasValues) return set

      return { ...set, completed: true, predicted: false }
    })

    if (targetCompleted) {
      nextSets = propagateValuesToFollowingSets(nextSets, setNumber, fields)
    }

    return nextSets
  }

  let nextSets = sets.map((set) => {
    if (set.setNumber !== setNumber) return set

    return applySetPatchWithCompletion(
      { ...set, predicted: false },
      patch,
      fields
    )
  })

  const touchesLogValues =
    'weight' in patch ||
    'reps' in patch ||
    'durationSeconds' in patch ||
    'distanceMeters' in patch

  if (touchesLogValues) {
    nextSets = propagateValuesToFollowingSets(nextSets, setNumber, fields)
  }

  return nextSets
}

export function getBestE1rmFromPrevious(
  previousSets: Record<number, PreviousSetLog>
): number | null {
  let best: number | null = null

  for (const set of Object.values(previousSets)) {
    if (set.weight == null || set.reps == null) continue

    const estimate = calculateE1rm(set.weight, set.reps)
    if (estimate != null && (best == null || estimate > best)) {
      best = estimate
    }
  }

  return best
}
