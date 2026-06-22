import { toDateKey } from '@/lib/calendar'
import { calcWorkoutCompletionRate } from '@/lib/dashboard'
import { getCheckInReadiness } from '@/lib/load-analytics'
import type { Client, ClientCheckIn, ClientScheduledWorkout } from 'app/types/database'

export const READINESS_CHECK_IN_RECENCY_DAYS = 7

export type CheckInReadinessInput = Pick<
  ClientCheckIn,
  | 'check_in_date'
  | 'sleep_hours'
  | 'sleep_quality'
  | 'energy_level'
  | 'calm_level'
  | 'soreness_level'
  | 'has_pain'
>

export type ClientWorkoutActivity = Pick<
  ClientScheduledWorkout,
  | 'id'
  | 'name'
  | 'status'
  | 'scheduled_date'
  | 'started_at'
  | 'completed_at'
  | 'updated_at'
>

export function calcClientCompletionRate(
  workouts: Pick<ClientScheduledWorkout, 'status'>[]
): number | null {
  return calcWorkoutCompletionRate(workouts)
}

export function calcWorkoutStreak(
  workouts: Pick<
    ClientScheduledWorkout,
    'status' | 'scheduled_date' | 'completed_at'
  >[]
): number {
  const completedDates = new Set(
    workouts
      .filter((w) => w.status === 'completed')
      .map((w) => w.scheduled_date)
  )

  if (completedDates.size === 0) return 0

  const today = new Date()
  let checkDate = new Date(today)
  const todayKey = toDateKey(today)

  if (!completedDates.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  let streak = 0
  while (completedDates.has(toDateKey(checkDate))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

export function getLastActiveLabel(workouts: ClientWorkoutActivity[]): string {
  const timestamps = workouts
    .filter((w) => w.status === 'completed' || w.status === 'in_progress')
    .map((w) => w.completed_at ?? w.started_at ?? w.updated_at)
    .filter(Boolean) as string[]

  if (timestamps.length === 0) return 'No activity yet'

  const last = new Date(
    timestamps.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )[0]
  )
  const diffDays = Math.floor(
    (Date.now() - last.getTime()) / 86_400_000
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDaysSinceLastSession(
  workouts: ClientWorkoutActivity[]
): number | null {
  const completed = workouts
    .filter((w) => w.status === 'completed' && w.completed_at)
    .map((w) => new Date(w.completed_at!).getTime())
    .sort((a, b) => b - a)

  if (completed.length === 0) return null
  return Math.floor((Date.now() - completed[0]) / 86_400_000)
}

type ReadinessVariant = 'success' | 'warning' | 'danger' | 'secondary'
type WorkoutReadinessLevel = 'high' | 'moderate' | 'low' | 'none'

export function getReadinessLevel(
  workouts: ClientWorkoutActivity[]
): {
  label: string
  variant: 'success' | 'warning' | 'secondary'
} {
  const daysSince = getDaysSinceLastSession(workouts)
  if (daysSince === null) {
    return { label: 'No data', variant: 'secondary' }
  }
  if (daysSince <= 2) return { label: 'High', variant: 'success' }
  if (daysSince <= 5) return { label: 'Moderate', variant: 'warning' }
  return { label: 'Low', variant: 'warning' }
}

export function isRecentCheckIn(
  checkIn: Pick<ClientCheckIn, 'check_in_date'> | null,
  recencyDays = READINESS_CHECK_IN_RECENCY_DAYS,
  referenceDate = new Date()
): boolean {
  if (!checkIn) return false
  const cutoff = new Date(referenceDate)
  cutoff.setDate(cutoff.getDate() - recencyDays)
  return checkIn.check_in_date >= toDateKey(cutoff)
}

export function getCheckInConcernFlags(checkIn: CheckInReadinessInput): string[] {
  const flags: string[] = []

  if (checkIn.has_pain) {
    flags.push('Pain flagged')
  }
  if (
    (checkIn.sleep_hours != null && checkIn.sleep_hours < 6) ||
    (checkIn.sleep_quality != null && checkIn.sleep_quality <= 2)
  ) {
    flags.push('Low sleep')
  }
  if (checkIn.soreness_level != null && checkIn.soreness_level >= 4) {
    flags.push('High soreness')
  }
  if (checkIn.energy_level != null && checkIn.energy_level <= 2) {
    flags.push('Low energy')
  }

  return flags
}

function getWorkoutReadinessLevel(
  daysSince: number | null
): WorkoutReadinessLevel {
  if (daysSince === null) return 'none'
  if (daysSince <= 2) return 'high'
  if (daysSince <= 5) return 'moderate'
  return 'low'
}

function downgradeReadinessLevel(
  level: Exclude<WorkoutReadinessLevel, 'none'>
): Exclude<WorkoutReadinessLevel, 'none' | 'high'> {
  return level === 'high' ? 'moderate' : 'low'
}

function readinessPresentation(level: Exclude<WorkoutReadinessLevel, 'none'>): {
  label: string
  variant: ReadinessVariant
} {
  switch (level) {
    case 'high':
      return { label: 'High', variant: 'success' }
    case 'moderate':
      return { label: 'Moderate', variant: 'warning' }
    case 'low':
      return { label: 'Low', variant: 'danger' }
  }
}

export function getBlendedReadinessLevel(
  workouts: ClientWorkoutActivity[],
  latestCheckIn: CheckInReadinessInput | null = null
): {
  label: string
  variant: ReadinessVariant
  flags: string[]
} {
  const daysSince = getDaysSinceLastSession(workouts)
  let level = getWorkoutReadinessLevel(daysSince)
  const flags: string[] = []

  if (level === 'none') {
    if (latestCheckIn && isRecentCheckIn(latestCheckIn)) {
      const checkInReadiness = getCheckInReadiness(latestCheckIn)
      return {
        label: checkInReadiness.label,
        variant: checkInReadiness.variant,
        flags: getCheckInConcernFlags(latestCheckIn),
      }
    }
    return { label: 'No data', variant: 'secondary', flags: [] }
  }

  if (latestCheckIn && isRecentCheckIn(latestCheckIn)) {
    const concernFlags = getCheckInConcernFlags(latestCheckIn)
    flags.push(...concernFlags)

    if (latestCheckIn.has_pain || concernFlags.length >= 2) {
      level = 'low'
    } else if (concernFlags.length === 1) {
      level = downgradeReadinessLevel(level)
    }
  }

  const presentation = readinessPresentation(level)
  return {
    label: presentation.label,
    variant: presentation.variant,
    flags,
  }
}

export function isClientSetupComplete(
  client: Client,
  hasProgram: boolean,
  hasScheduledWorkouts: boolean
): boolean {
  if (client.status !== 'active') return false
  return (
    Boolean(client.goal?.trim()) &&
    hasProgram &&
    hasScheduledWorkouts
  )
}

const FLAG_KEYWORDS =
  /\b(injur|pain|limit|surgery|recover|avoid|flag|concern|issue)\b/i

export function hasFlaggedNotes(notes: string | null): boolean {
  if (!notes?.trim()) return false
  return FLAG_KEYWORDS.test(notes)
}

export function getRecentProgressHighlights(
  workouts: ClientWorkoutActivity[],
  limit = 3
): { id: string; label: string; date: string }[] {
  return workouts
    .filter((w) => w.status === 'completed' && w.completed_at)
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() -
        new Date(a.completed_at!).getTime()
    )
    .slice(0, limit)
    .map((w) => ({
      id: w.id,
      label: w.name,
      date: new Date(w.completed_at!).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }))
}

export function buildClientActivityItems(
  workouts: ClientWorkoutActivity[]
): {
  id: string
  workoutName: string
  status: ClientScheduledWorkout['status']
  timestamp: string
}[] {
  return workouts
    .filter((w) => w.status !== 'scheduled')
    .map((w) => ({
      id: w.id,
      workoutName: w.name,
      status: w.status,
      timestamp: w.completed_at ?? w.started_at ?? w.updated_at,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5)
}
