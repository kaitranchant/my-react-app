import type { CheckInFrequency } from 'app/types/database'

export type ClientEmailNudgeType =
  | 'workout_reminder'
  | 'check_in_due'
  | 'unread_digest'
  | 'appointment_reminder'

export function shouldSendCheckInDueNudge(
  frequency: CheckInFrequency,
  todayKey: string,
  periodEnd: string,
  hasCheckInThisPeriod: boolean
): boolean {
  if (hasCheckInThisPeriod) {
    return false
  }

  if (frequency === 'daily') {
    return true
  }

  return todayKey === periodEnd
}

export function getCheckInDueReferenceKey(
  frequency: CheckInFrequency,
  todayKey: string,
  periodStart: string,
  periodEnd: string
): string {
  if (frequency === 'daily') {
    return todayKey
  }

  return `${periodStart}:${periodEnd}`
}
