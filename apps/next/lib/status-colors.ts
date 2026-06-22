/**
 * Semantic status color system.
 *
 * Green  = good / present / on track
 * Amber  = caution / late / at risk
 * Red    = problem / absent / off track
 * Gray   = no data / neutral
 */

export type StatusLevel = 'success' | 'warning' | 'danger' | 'neutral'

export const statusDotClass: Record<StatusLevel, string> = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  neutral: 'bg-status-neutral',
}

export const statusSoftBadgeClass: Record<StatusLevel, string> = {
  success:
    'border-status-success/30 bg-status-success/10 text-status-success',
  warning:
    'border-status-warning/30 bg-status-warning/10 text-status-warning',
  danger: 'border-status-danger/30 bg-status-danger/10 text-status-danger',
  neutral:
    'border-status-neutral/30 bg-status-neutral/10 text-status-neutral',
}

export const statusSoftTriggerClass: Record<StatusLevel, string> = {
  success:
    'border-status-success/30 bg-status-success/10 text-status-success',
  warning:
    'border-status-warning/30 bg-status-warning/10 text-status-warning',
  danger: 'border-status-danger/30 bg-status-danger/10 text-status-danger',
  neutral:
    'border-status-neutral/30 bg-status-neutral/10 text-status-neutral-foreground',
}

export const statusTextClass: Record<StatusLevel, string> = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  neutral: 'text-status-neutral-foreground',
}

export const statusIconClass: Record<StatusLevel, string> = {
  success: 'text-status-success bg-status-success/10',
  warning: 'text-status-warning bg-status-warning/10',
  danger: 'text-status-danger bg-status-danger/10',
  neutral: 'text-status-neutral-foreground bg-status-neutral/10',
}

export type WorkoutActivityStatus =
  | 'completed'
  | 'in_progress'
  | 'skipped'
  | 'scheduled'

export function workoutActivityStatusLevel(
  status: WorkoutActivityStatus
): StatusLevel {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function getWorkoutActivityIconClass(status: WorkoutActivityStatus) {
  return statusIconClass[workoutActivityStatusLevel(status)]
}

export const statusSoftContainerClass: Record<
  StatusLevel,
  { default: string; selected: string }
> = {
  success: {
    default: 'border-status-success/30 bg-status-success/10',
    selected: 'border-status-success/40 bg-status-success/15',
  },
  warning: {
    default: 'border-status-warning/30 bg-status-warning/10',
    selected: 'border-status-warning/40 bg-status-warning/15',
  },
  danger: {
    default: 'border-status-danger/30 bg-status-danger/10',
    selected: 'border-status-danger/40 bg-status-danger/15',
  },
  neutral: {
    default: 'border-border bg-background',
    selected: 'border-brand/30 bg-brand/10',
  },
}

export type WorkoutDisplayTone = 'muted' | 'active' | 'success' | 'warning'

export function workoutToneToStatusLevel(
  tone: WorkoutDisplayTone
): StatusLevel {
  switch (tone) {
    case 'success':
      return 'success'
    case 'warning':
    case 'active':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function getWorkoutToneContainerClass(
  tone: WorkoutDisplayTone,
  isSelected: boolean
): string {
  const level = workoutToneToStatusLevel(tone)
  const styles = statusSoftContainerClass[level]
  const base = isSelected ? styles.selected : styles.default

  if (level === 'neutral' && !isSelected) {
    return `${base} group-hover:border-brand/20 group-hover:bg-muted/40`
  }

  return base
}

export function getWorkoutToneDotClass(
  tone: WorkoutDisplayTone,
  isSelected: boolean
): string {
  const level = workoutToneToStatusLevel(tone)
  if (level === 'neutral') {
    return isSelected ? 'bg-brand' : 'bg-status-neutral-foreground/40'
  }
  return statusDotClass[level]
}

export function getWorkoutToneBadgeClass(tone: WorkoutDisplayTone): string {
  const level = workoutToneToStatusLevel(tone)
  return statusSoftBadgeClass[level]
}

export type RankChangeDirection = 'new' | 'up' | 'down' | 'same'

export function getCompletionRateStatusLevel(
  completionRate: number | null,
  scheduledCount: number
): StatusLevel {
  if (completionRate === null || scheduledCount === 0) return 'neutral'
  if (completionRate < 50) return 'warning'
  if (completionRate >= 80) return 'success'
  return 'neutral'
}

export function getRankChangeBadgeClass(
  rankChange: RankChangeDirection
): string {
  switch (rankChange) {
    case 'up':
      return 'border-status-success/30 text-status-success'
    case 'down':
      return 'border-status-danger/30 text-status-danger'
    case 'new':
      return 'border-brand/30 text-brand'
    default:
      return 'text-status-neutral-foreground'
  }
}
