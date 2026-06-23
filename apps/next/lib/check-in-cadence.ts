import { addDaysToDateKey, getCurrentWeekDateKeys, parseDateKey } from '@/lib/calendar'
import {
  defaultCoachPreferences,
  getCoachDateKey,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import type { CheckInFrequency } from 'app/types/database'

export function diffDateKeys(startKey: string, endKey: string): number {
  const start = parseDateKey(startKey)
  const end = parseDateKey(endKey)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export function getCheckInPeriodBounds(
  frequency: CheckInFrequency = defaultCoachPreferences.defaultCheckInFrequency,
  weekStartsOn: CoachPreferences['weekStartsOn'] = defaultCoachPreferences.weekStartsOn,
  timezone: CoachPreferences['timezone'] = defaultCoachPreferences.timezone,
  referenceDate = new Date()
): { start: string; end: string } {
  const todayKey = getCoachDateKey(timezone, referenceDate)

  if (frequency === 'daily') {
    return { start: todayKey, end: todayKey }
  }

  const weekKeys = getCurrentWeekDateKeys(weekStartsOn, parseDateKey(todayKey))
  const weekStart = weekKeys[0]!
  const weekEnd = weekKeys[weekKeys.length - 1]!

  if (frequency === 'weekly') {
    return { start: weekStart, end: weekEnd }
  }

  const year = parseDateKey(todayKey).getFullYear()
  const anchorWeekKeys = getCurrentWeekDateKeys(
    weekStartsOn,
    parseDateKey(`${year}-01-01`)
  )
  const anchorStart = anchorWeekKeys[0]!
  const daysSinceAnchor = diffDateKeys(anchorStart, weekStart)
  const periodIndex =
    daysSinceAnchor >= 0
      ? Math.floor(daysSinceAnchor / 14)
      : Math.ceil(daysSinceAnchor / 14) - 1
  const periodStart = addDaysToDateKey(anchorStart, periodIndex * 14)

  return {
    start: periodStart,
    end: addDaysToDateKey(periodStart, 13),
  }
}

export function getCheckInPeriodLabel(
  frequency: CheckInFrequency = defaultCoachPreferences.defaultCheckInFrequency
): string {
  switch (frequency) {
    case 'daily':
      return 'today'
    case 'weekly':
      return 'this week'
    case 'biweekly':
      return 'this period'
  }
}

export function getCheckInCadenceTitle(
  frequency: CheckInFrequency = defaultCoachPreferences.defaultCheckInFrequency
): string {
  switch (frequency) {
    case 'daily':
      return 'Daily check-in'
    case 'weekly':
      return 'Weekly check-in'
    case 'biweekly':
      return 'Bi-weekly check-in'
  }
}

export function getPortalCheckInDueLabel(
  frequency: CheckInFrequency = defaultCoachPreferences.defaultCheckInFrequency,
  options?: { hasWorkoutToday?: boolean }
): string {
  if (options?.hasWorkoutToday) {
    return 'Check in before today\u2019s session'
  }

  switch (frequency) {
    case 'daily':
      return 'Check in today'
    case 'weekly':
      return 'Check in this week'
    case 'biweekly':
      return 'Check in this period'
  }
}
