import { coerceDateKey } from '@/lib/calendar'

type CoachWorkoutLogContext = {
  variant: 'coach'
  clientId: string
}

type PortalWorkoutLogContext = {
  variant: 'client'
}

export type WorkoutLogContext =
  | CoachWorkoutLogContext
  | PortalWorkoutLogContext

export function getWorkoutLogHref(
  workoutId: string,
  selectedDate: string,
  context: WorkoutLogContext
): string {
  const date = coerceDateKey(selectedDate)
  const dateQuery = date ? `?date=${encodeURIComponent(date)}` : ''

  if (context.variant === 'client') {
    return `/portal/workouts/${workoutId}/log${dateQuery}`
  }

  return `/clients/${context.clientId}/workouts/${workoutId}/log${dateQuery}`
}

export function getWorkoutLogReturnHref(
  selectedDate: string,
  context: WorkoutLogContext
): string {
  const date = coerceDateKey(selectedDate)
  const dateQuery = date ? `?date=${encodeURIComponent(date)}` : ''

  if (context.variant === 'client') {
    return `/portal/workouts${dateQuery}`
  }

  return `/clients/${context.clientId}?tab=training${date ? `&date=${encodeURIComponent(date)}` : ''}`
}
