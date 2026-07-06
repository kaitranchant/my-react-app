import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

export function isExerciseEligibleForProgressiveLoad(
  row: Pick<
    ScheduledWorkoutExerciseWithDetails,
    'tracking_options' | 'weight_percent'
  >
): boolean {
  const options = parseTrackingOptions(row.tracking_options)
  if (options.bodyweight || options.completionLift) return false
  if (row.weight_percent?.trim()) return false
  return true
}
