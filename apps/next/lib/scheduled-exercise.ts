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
  trackTime: false,
  trackReps: true,
  trackVolume: true,
  autoProgressLoad: false,
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
    trackTime: Boolean(raw.trackTime),
    trackReps: raw.trackReps === undefined ? true : Boolean(raw.trackReps),
    trackVolume: raw.trackVolume === undefined ? true : Boolean(raw.trackVolume),
    autoProgressLoad: Boolean(raw.autoProgressLoad),
  }
}

function formatPrescriptionRepUnit(
  repMode: ScheduledWorkoutExercise['rep_mode'] | null | undefined,
  reps: string
): string | null {
  if (repMode === 'distance') {
    const trimmed = reps.trim()
    if (!trimmed) return 'meters'
    if (/[a-z]/i.test(trimmed)) return null
    return 'meters'
  }

  if (repMode !== 'time') return 'reps'

  const trimmed = reps.trim()
  if (!trimmed) return 'seconds'

  // Values like 30s, 1:00, or 300m already carry their own unit/format.
  if (/[a-z:]/i.test(trimmed)) return null

  return 'seconds'
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
    | 'weight_percent'
    | 'rpe_target'
    | 'target_weight'
    | 'superset_group'
    | 'exercise_block'
    | 'workout_notes'
    | 'tracking_options'
  >
): string {
  const parts: string[] = []

  if (row.sets?.trim() && row.reps?.trim()) {
    const unit = formatPrescriptionRepUnit(row.rep_mode, row.reps)
    parts.push(
      unit
        ? `${row.sets.trim()} x ${row.reps.trim()} ${unit}`
        : `${row.sets.trim()} x ${row.reps.trim()}`
    )
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
  if (row.weight_percent?.trim()) {
    parts.push(`${row.weight_percent.trim().replace(/%$/, '')}% 1RM`)
  }
  if (row.target_weight?.trim()) {
    parts.push(`@ ${row.target_weight.trim()}`)
  }
  if (row.rpe_target?.trim()) parts.push(`RPE ${row.rpe_target.trim()}`)
  if (row.prescription?.trim()) parts.push(row.prescription.trim())

  const options = parseTrackingOptions(row.tracking_options)
  const flags: string[] = []
  if (options.completionLift) flags.push('completion')
  if (options.bodyweight) flags.push('bodyweight')
  if (options.coachCompletes) flags.push('coach logs')
  if (options.trackBarSpeed) flags.push('bar speed')
  if (options.trackPeakPower) flags.push('peak power')
  if (options.trackTime) flags.push('time tracking')
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
  if (row.rep_mode === 'distance') badges.push('Distance')
  if (options.completionLift) badges.push('Completion')
  if (options.bodyweight) badges.push('Bodyweight')
  if (options.coachCompletes) badges.push('Coach logs')
  if (options.trackBarSpeed) badges.push('Bar speed')
  if (options.trackPeakPower) badges.push('Peak power')
  if (options.trackTime) badges.push('Time tracking')
  if (options.forcePrUpdate) badges.push('Force PR')
  if (options.disablePrTracking) badges.push('No PR track')

  return badges
}
