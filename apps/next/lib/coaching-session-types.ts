import type { CoachingSessionType } from 'app/types/database'

export const coachingSessionTypes = [
  'coaching',
  'nutrition',
  'class',
  'consultation',
  'other',
] as const satisfies readonly CoachingSessionType[]

export const defaultCoachingSessionType: CoachingSessionType = 'coaching'

export const coachingSessionTypeLabels: Record<CoachingSessionType, string> = {
  coaching: 'Coaching session',
  nutrition: 'Nutrition',
  class: 'Class',
  consultation: 'Consultation',
  other: 'Other',
}

export function formatCoachingSessionType(
  sessionType: CoachingSessionType | null | undefined
): string | null {
  if (!sessionType) return null
  return coachingSessionTypeLabels[sessionType] ?? sessionType
}
