import { toDateKey } from '@/lib/calendar'
import type { CheckInFormValues } from '@/lib/validations/check-in'
import type {
  CheckInSubmittedBy,
  ClientCheckIn,
  ClientCheckInInsert,
} from 'app/types/database'

export function createEmptyCheckInValues(
  checkInDate = toDateKey(new Date())
): CheckInFormValues {
  return {
    checkInDate,
    weight: null,
    sleepHours: null,
    calmLevel: null,
    sleepQuality: null,
    energyLevel: null,
    motivationLevel: null,
    nutritionAdherence: null,
    sorenessLevel: null,
    sorenessNotes: null,
    hasPain: false,
    painNotes: null,
    clientNotes: null,
    coachNotes: null,
  }
}

export function checkInValuesToRow(
  values: CheckInFormValues,
  clientId: string,
  coachId: string,
  submittedBy: CheckInSubmittedBy
): ClientCheckInInsert {
  return {
    client_id: clientId,
    coach_id: coachId,
    check_in_date: values.checkInDate,
    ...checkInMetricValues(values),
    client_notes: values.clientNotes,
    coach_notes: values.coachNotes ?? null,
    submitted_by: submittedBy,
  }
}

export function checkInMetricValues(values: CheckInFormValues) {
  return {
    weight: values.weight,
    sleep_hours: values.sleepHours,
    calm_level: values.calmLevel,
    sleep_quality: values.sleepQuality,
    energy_level: values.energyLevel,
    motivation_level: values.motivationLevel,
    nutrition_adherence: values.nutritionAdherence,
    soreness_level: values.sorenessLevel,
    soreness_notes: values.sorenessNotes,
    has_pain: values.hasPain,
    pain_notes: values.painNotes,
  }
}

export function checkInValuesToUpdate(values: CheckInFormValues) {
  return {
    check_in_date: values.checkInDate,
    ...checkInMetricValues(values),
    client_notes: values.clientNotes,
    coach_notes: values.coachNotes,
  }
}

export function checkInToFormValues(checkIn: ClientCheckIn): CheckInFormValues {
  return {
    checkInDate: checkIn.check_in_date,
    weight: checkIn.weight,
    sleepHours: checkIn.sleep_hours,
    calmLevel: checkIn.calm_level,
    sleepQuality: checkIn.sleep_quality,
    energyLevel: checkIn.energy_level,
    motivationLevel: checkIn.motivation_level,
    nutritionAdherence: checkIn.nutrition_adherence,
    sorenessLevel: checkIn.soreness_level,
    sorenessNotes: checkIn.soreness_notes,
    hasPain: checkIn.has_pain,
    painNotes: checkIn.pain_notes,
    clientNotes: checkIn.client_notes,
    coachNotes: checkIn.coach_notes,
  }
}

export function formatCheckInDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatLevel(value: number | null, suffix = '/5'): string {
  if (value == null) return '—'
  return `${value}${suffix}`
}

export function formatCheckInSummary(checkIn: ClientCheckIn): string {
  const parts: string[] = []
  if (checkIn.weight != null) {
    parts.push(`${checkIn.weight} lbs`)
  }
  if (checkIn.sleep_hours != null) {
    parts.push(`${checkIn.sleep_hours}h sleep`)
  }
  if (checkIn.sleep_quality != null) {
    parts.push(`sleep quality ${checkIn.sleep_quality}/5`)
  }
  if (checkIn.calm_level != null) {
    parts.push(`calm ${checkIn.calm_level}/5`)
  }
  if (checkIn.energy_level != null) {
    parts.push(`energy ${checkIn.energy_level}/5`)
  }
  if (checkIn.motivation_level != null) {
    parts.push(`motivation ${checkIn.motivation_level}/5`)
  }
  if (checkIn.nutrition_adherence != null) {
    parts.push(`nutrition ${checkIn.nutrition_adherence}/5`)
  }
  if (checkIn.soreness_level != null) {
    parts.push(`soreness ${checkIn.soreness_level}/5`)
  }
  if (checkIn.has_pain) {
    parts.push('pain flagged')
  }
  return parts.length > 0 ? parts.join(' · ') : 'No metrics logged'
}

export function formatCheckInHistoryLine(checkIn: ClientCheckIn): string {
  const parts: string[] = []
  if (checkIn.weight != null) parts.push(`Weight ${checkIn.weight} lbs`)
  if (checkIn.sleep_hours != null) parts.push(`Sleep ${checkIn.sleep_hours}h`)
  if (checkIn.energy_level != null) parts.push(`Energy ${checkIn.energy_level}/5`)
  if (checkIn.calm_level != null) parts.push(`Calm ${checkIn.calm_level}/5`)
  if (checkIn.motivation_level != null) {
    parts.push(`Motivation ${checkIn.motivation_level}/5`)
  }
  return parts.length > 0 ? parts.join(', ') : 'No metrics logged'
}

export function isCheckInPendingReview(checkIn: ClientCheckIn): boolean {
  return checkIn.reviewed_at == null && checkIn.submitted_by === 'client'
}

export type GradedScaleTone = 'positive' | 'negative' | 'neutral'

export type GradedScaleConfig = {
  tone: GradedScaleTone
  labels: [string, string, string, string, string]
}

export const CHECK_IN_SCALES = {
  calm: {
    tone: 'positive',
    labels: ['Very stressed', 'Stressed', 'Okay', 'Calm', 'Very calm'],
  },
  energy: {
    tone: 'positive',
    labels: ['Exhausted', 'Low', 'Moderate', 'Good', 'High'],
  },
  sleepQuality: {
    tone: 'positive',
    labels: ['Poor', 'Restless', 'Fair', 'Good', 'Excellent'],
  },
  motivation: {
    tone: 'positive',
    labels: ['None', 'Low', 'Moderate', 'Strong', 'Very high'],
  },
  nutrition: {
    tone: 'positive',
    labels: ['Off plan', 'Mostly off', 'Mixed', 'Mostly on', 'On plan'],
  },
  soreness: {
    tone: 'negative',
    labels: ['None', 'Mild', 'Moderate', 'Sore', 'Severe'],
  },
} satisfies Record<string, GradedScaleConfig>

export function gradedScaleButtonClass(
  level: number,
  selected: boolean,
  tone: GradedScaleTone
): string {
  if (!selected) {
    return 'border-border bg-background text-muted-foreground hover:bg-muted'
  }

  if (tone === 'negative') {
    if (level <= 2) return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800'
    if (level === 3) return 'border-amber-500/40 bg-amber-500/15 text-amber-800'
    return 'border-red-500/40 bg-red-500/15 text-red-800'
  }

  if (level <= 2) return 'border-red-500/40 bg-red-500/15 text-red-800'
  if (level === 3) return 'border-amber-500/40 bg-amber-500/15 text-amber-800'
  return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800'
}
