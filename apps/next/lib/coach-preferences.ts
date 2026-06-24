import {
  addDaysToDateKey,
  getCurrentWeekDateKeys,
  getWeekDayLabels,
  parseDateKey,
  toDateKey,
} from '@/lib/calendar'
import type { CoachingPreferencesValues } from '@/lib/validations/coaching-preferences'
import type { CoachTimezone } from 'app/types/database'
import type { Profile } from 'app/types/database'

export type CoachPreferences = CoachingPreferencesValues

export const defaultCoachPreferences: CoachPreferences = {
  weightUnit: 'lbs',
  weekStartsOn: 'monday',
  timezone: 'auto',
  defaultCheckInFrequency: 'weekly',
}

const LBS_TO_KG = 0.45359237

const COACH_TIMEZONE_IANA: Record<
  Exclude<CoachTimezone, 'auto'>,
  string
> = {
  america_new_york: 'America/New_York',
  america_chicago: 'America/Chicago',
  america_denver: 'America/Denver',
  america_los_angeles: 'America/Los_Angeles',
  europe_london: 'Europe/London',
}

type ProfilePreferenceRow = Pick<
  Profile,
  | 'weight_unit'
  | 'week_starts_on'
  | 'coach_timezone'
  | 'default_check_in_frequency'
>

export function resolveCoachTimezone(
  timezone: CoachPreferences['timezone']
): string | null {
  if (timezone === 'auto') {
    return null
  }

  return COACH_TIMEZONE_IANA[timezone]
}

export function getCoachDateKey(
  timezone: CoachPreferences['timezone'] = 'auto',
  referenceDate = new Date()
): string {
  const iana = resolveCoachTimezone(timezone)
  if (!iana) {
    return toDateKey(referenceDate)
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate)
}

export function parseCoachPreferences(
  row?: ProfilePreferenceRow | null
): CoachPreferences {
  return {
    weightUnit: row?.weight_unit ?? defaultCoachPreferences.weightUnit,
    weekStartsOn: row?.week_starts_on ?? defaultCoachPreferences.weekStartsOn,
    timezone:
      (row?.coach_timezone as CoachPreferences['timezone'] | null) ??
      defaultCoachPreferences.timezone,
    defaultCheckInFrequency:
      row?.default_check_in_frequency ??
      defaultCoachPreferences.defaultCheckInFrequency,
  }
}

export function coachPreferencesToRow(values: CoachPreferences) {
  return {
    weight_unit: values.weightUnit,
    week_starts_on: values.weekStartsOn,
    coach_timezone: values.timezone === 'auto' ? null : values.timezone,
    default_check_in_frequency: values.defaultCheckInFrequency,
  }
}

export function withPortalWeightUnit(
  coachPreferences: CoachPreferences,
  weightUnit: CoachPreferences['weightUnit']
): CoachPreferences {
  return { ...coachPreferences, weightUnit }
}

export function getWeekRange(
  weekStartsOn: CoachPreferences['weekStartsOn'] = 'monday',
  timezone: CoachPreferences['timezone'] = 'auto',
  referenceDate = new Date()
): { start: string; end: string } {
  const keys = getCurrentWeekDateKeys(
    weekStartsOn,
    parseDateKey(getCoachDateKey(timezone, referenceDate))
  )
  return { start: keys[0]!, end: keys[keys.length - 1]! }
}

export { getCurrentWeekDateKeys, getWeekDayLabels }

export function convertVolumeFromLbs(
  volumeLbs: number,
  unit: CoachPreferences['weightUnit']
): number {
  return unit === 'kg' ? volumeLbs * LBS_TO_KG : volumeLbs
}

export function formatVolume(
  volumeLbs: number,
  unit: CoachPreferences['weightUnit'] = 'lbs'
): string {
  if (volumeLbs <= 0) {
    return unit === 'kg' ? '0 kg' : '0 lbs'
  }

  if (unit === 'kg') {
    return `${Math.round(convertVolumeFromLbs(volumeLbs, 'kg')).toLocaleString('en-US')} kg`
  }

  return `${Math.round(volumeLbs).toLocaleString('en-US')} lbs`
}

export function formatWeight(
  weightLbs: number,
  unit: CoachPreferences['weightUnit'] = 'lbs'
): string {
  if (unit === 'kg') {
    return `${convertVolumeFromLbs(weightLbs, 'kg').toFixed(1)} kg`
  }

  return `${weightLbs.toFixed(1)} lbs`
}

export function weightUnitLabel(unit: CoachPreferences['weightUnit']): string {
  return unit === 'kg' ? 'kg' : 'lbs'
}
