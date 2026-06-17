import type {
  ScheduledExerciseTrackingOptions,
  ScheduledWorkoutExercise,
} from 'app/types/database'

import { getExerciseBlockLabel } from './exercise-groups'

export const DEFAULT_TRACKING_OPTIONS: ScheduledExerciseTrackingOptions = {
  completionLift: false,
  bodyweight: false,
  coachCompletes: false,
  disablePrTracking: false,
  forcePrUpdate: false,
  trackBarSpeed: false,
  trackPeakPower: false,
  trackReps: true,
  trackVolume: true,
}

export function parseTrackingOptions(
  value: unknown
): ScheduledExerciseTrackingOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_TRACKING_OPTIONS }
  }

  const raw = value as Record<string, unknown>
  return {
    completionLift: Boolean(raw.completionLift),
    bodyweight: Boolean(raw.bodyweight),
    coachCompletes: Boolean(raw.coachCompletes),
    disablePrTracking: Boolean(raw.disablePrTracking),
    forcePrUpdate: Boolean(raw.forcePrUpdate),
    trackBarSpeed: Boolean(raw.trackBarSpeed),
    trackPeakPower: Boolean(raw.trackPeakPower),
    trackReps: raw.trackReps === undefined ? true : Boolean(raw.trackReps),
    trackVolume: raw.trackVolume === undefined ? true : Boolean(raw.trackVolume),
  }
}

export function formatExercisePrescriptionSummary(
  row: Pick<
    ScheduledWorkoutExercise,
    | 'sets'
    | 'reps'
    | 'prescription'
    | 'rep_mode'
    | 'each_side'
    | 'tempo'
    | 'rest_seconds'
    | 'superset_group'
    | 'exercise_block'
    | 'workout_notes'
    | 'tracking_options'
  >
): string {
  const parts: string[] = []

  if (row.sets?.trim() && row.reps?.trim()) {
    const unit = row.rep_mode === 'time' ? 'time' : 'reps'
    parts.push(`${row.sets.trim()} x ${row.reps.trim()} ${unit}`)
  } else if (row.sets?.trim()) {
    parts.push(`${row.sets.trim()} sets`)
  } else if (row.reps?.trim()) {
    parts.push(row.reps.trim())
  }

  if (row.each_side) parts.push('each side')
  if (row.exercise_block) {
    const label = getExerciseBlockLabel(row.exercise_block)
    if (label) parts.push(label)
  }
  if (row.tempo?.trim()) parts.push(`tempo ${row.tempo.trim()}`)
  if (row.rest_seconds?.trim()) parts.push(`${row.rest_seconds.trim()}s rest`)
  if (row.prescription?.trim()) parts.push(row.prescription.trim())

  const options = parseTrackingOptions(row.tracking_options)
  const flags: string[] = []
  if (options.completionLift) flags.push('completion')
  if (options.bodyweight) flags.push('bodyweight')
  if (options.coachCompletes) flags.push('coach logs')
  if (options.trackBarSpeed) flags.push('bar speed')
  if (options.trackPeakPower) flags.push('peak power')
  if (flags.length > 0) parts.push(flags.join(', '))

  return parts.join(' · ') || 'No prescription set'
}

export function getExerciseOptionBadges(
  row: Pick<
    ScheduledWorkoutExercise,
    | 'each_side'
    | 'superset_group'
    | 'exercise_block'
    | 'rep_mode'
    | 'tracking_options'
  >
): string[] {
  const badges: string[] = []
  const options = parseTrackingOptions(row.tracking_options)

  const blockLabel = getExerciseBlockLabel(row.exercise_block)
  if (blockLabel) badges.push(blockLabel)
  if (row.superset_group) badges.push(`Superset ${row.superset_group}`)
  if (row.each_side) badges.push('Each side')
  if (row.rep_mode === 'time') badges.push('Time')
  if (options.completionLift) badges.push('Completion')
  if (options.bodyweight) badges.push('Bodyweight')
  if (options.coachCompletes) badges.push('Coach logs')
  if (options.trackBarSpeed) badges.push('Bar speed')
  if (options.trackPeakPower) badges.push('Peak power')
  if (options.forcePrUpdate) badges.push('Force PR')
  if (options.disablePrTracking) badges.push('No PR track')

  return badges
}
