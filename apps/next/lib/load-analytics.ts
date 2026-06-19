import { parseDateKey, toDateKey } from '@/lib/calendar'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import {
  calculateE1rm,
  getBestE1rmFromDrafts,
} from '@/lib/workout-log'
import type { ScheduledExerciseTrackingOptions } from 'app/types/database'

export type LogSetLike = {
  weight: number | null
  reps: number | null
  completed?: boolean
}

export type HistoricalExerciseBest = {
  e1rm: number | null
  topSetWeight: number | null
  topSetReps: number | null
}

export type SessionPrCandidate = {
  recordType: 'e1rm' | 'top_set'
  e1rm: number | null
  weight: number | null
  reps: number | null
  sessionVolume: number
  forced: boolean
}

export type VolumeLogRow = {
  dateKey: string
  volume: number
}

export type WeeklyVolumeBucket = {
  weekStart: string
  weekEnd: string
  volume: number
}

export type AcwrResult = {
  ratio: number | null
  acute: number
  chronic: number
  label: 'optimal' | 'borderline' | 'undertraining' | 'overreaching' | 'unknown'
  riskLevel: AcwrRiskLevel
}

export type AcwrRiskLevel =
  | 'optimal'
  | 'borderline'
  | 'undertraining'
  | 'overreaching'
  | 'unknown'

export type LoadDateRange = 'this_week' | 'last_week' | 'rolling_4'
export type LoadMetric = 'tonnage' | 'sessions' | 'time'

export type DailyMetricRow = {
  dateKey: string
  value: number
}

export type WeeklyMetricBucket = {
  weekStart: string
  weekEnd: string
  value: number
}

export type LoadRangeBounds = {
  start: string
  end: string
  label: string
}

export type LoadSummaryCounts = {
  total: number
  optimal: number
  borderline: number
  undertraining: number
  overreaching: number
  unknown: number
}

export function calcSetVolume(
  weight: number | null,
  reps: number | null,
  options: ScheduledExerciseTrackingOptions
): number {
  if (options.completionLift || options.bodyweight) return 0
  if (!options.trackVolume || !options.trackReps) return 0
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return 0
  return weight * reps
}

export function calcSessionVolumeForExercise(
  sets: LogSetLike[],
  options: ScheduledExerciseTrackingOptions
): number {
  let total = 0
  for (const set of sets) {
    if (set.completed === false) continue
    total += calcSetVolume(set.weight, set.reps, options)
  }
  return total
}

export function getBestE1rmFromSets(
  sets: LogSetLike[]
): number | null {
  const drafts = sets.map((set) => ({
    weight: set.weight == null ? '' : String(set.weight),
    reps: set.reps == null ? '' : String(set.reps),
  }))
  return getBestE1rmFromDrafts(drafts)
}

export function getTopSetFromSets(
  sets: LogSetLike[]
): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null

  for (const set of sets) {
    if (set.completed === false) continue
    if (set.weight == null || set.reps == null || set.weight <= 0 || set.reps <= 0) {
      continue
    }

    if (
      !best ||
      set.weight > best.weight ||
      (set.weight === best.weight && set.reps > best.reps)
    ) {
      best = { weight: set.weight, reps: set.reps }
    }
  }

  return best
}

function isBetterE1rm(next: number | null, current: number | null): boolean {
  if (next == null) return false
  if (current == null) return true
  return next > current
}

function isBetterTopSet(
  next: { weight: number; reps: number } | null,
  current: { weight: number; reps: number } | null
): boolean {
  if (!next) return false
  if (!current) return true
  if (next.weight > current.weight) return true
  if (next.weight === current.weight && next.reps > current.reps) return true
  return false
}

export function detectSessionPrs(
  sets: LogSetLike[],
  historicalBest: HistoricalExerciseBest | null,
  options: ScheduledExerciseTrackingOptions
): SessionPrCandidate[] {
  if (options.disablePrTracking) return []

  const sessionVolume = calcSessionVolumeForExercise(sets, options)
  const sessionE1rm = getBestE1rmFromSets(sets)
  const topSet = getTopSetFromSets(sets)
  const forced = options.forcePrUpdate
  const results: SessionPrCandidate[] = []

  const historicalE1rm = historicalBest?.e1rm ?? null
  const historicalTopSet =
    historicalBest?.topSetWeight != null && historicalBest?.topSetReps != null
      ? {
          weight: historicalBest.topSetWeight,
          reps: historicalBest.topSetReps,
        }
      : null

  if (
    forced ||
    isBetterE1rm(sessionE1rm, historicalE1rm)
  ) {
    if (sessionE1rm != null) {
      results.push({
        recordType: 'e1rm',
        e1rm: sessionE1rm,
        weight: topSet?.weight ?? null,
        reps: topSet?.reps ?? null,
        sessionVolume,
        forced,
      })
    }
  }

  if (
    topSet &&
    (forced || isBetterTopSet(topSet, historicalTopSet))
  ) {
    results.push({
      recordType: 'top_set',
      e1rm: sessionE1rm,
      weight: topSet.weight,
      reps: topSet.reps,
      sessionVolume,
      forced,
    })
  }

  return results
}

export function getWeekStart(dateKey: string): string {
  const date = parseDateKey(dateKey)
  const dayIndex = date.getDay()
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  return toDateKey(monday)
}

export function aggregateWeeklyVolume(
  rows: VolumeLogRow[],
  weeks: number,
  referenceDate: Date = new Date()
): WeeklyVolumeBucket[] {
  const refKey = toDateKey(referenceDate)
  const currentWeekStart = getWeekStart(refKey)
  const buckets: WeeklyVolumeBucket[] = []

  for (let index = weeks - 1; index >= 0; index--) {
    const weekStartDate = parseDateKey(currentWeekStart)
    weekStartDate.setDate(weekStartDate.getDate() - index * 7)
    const weekStart = toDateKey(weekStartDate)

    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)
    const weekEnd = toDateKey(weekEndDate)

    const volume = rows
      .filter((row) => row.dateKey >= weekStart && row.dateKey <= weekEnd)
      .reduce((sum, row) => sum + row.volume, 0)

    buckets.push({ weekStart, weekEnd, volume })
  }

  return buckets
}

export function calcAcwr(
  rows: VolumeLogRow[],
  referenceDate: Date = new Date()
): AcwrResult {
  const refKey = toDateKey(referenceDate)
  const refDate = parseDateKey(refKey)

  const acuteStart = new Date(refDate)
  acuteStart.setDate(refDate.getDate() - 6)
  const acuteStartKey = toDateKey(acuteStart)

  const acute = rows
    .filter((row) => row.dateKey >= acuteStartKey && row.dateKey <= refKey)
    .reduce((sum, row) => sum + row.volume, 0)

  const weeklyBuckets = aggregateWeeklyVolume(rows, 4, referenceDate)
  const priorWeeks = weeklyBuckets.slice(0, 3)
  const chronic =
    priorWeeks.length > 0
      ? priorWeeks.reduce((sum, bucket) => sum + bucket.volume, 0) /
        priorWeeks.length
      : 0

  if (chronic <= 0) {
    return {
      ratio: null,
      acute,
      chronic,
      label: 'unknown',
      riskLevel: 'unknown',
    }
  }

  const ratio = acute / chronic
  const riskLevel = classifyAcwrRisk(ratio)
  let label: AcwrResult['label'] = 'optimal'
  if (riskLevel === 'borderline') label = 'borderline'
  else if (riskLevel === 'undertraining') label = 'undertraining'
  else if (riskLevel === 'overreaching') label = 'overreaching'
  else if (riskLevel === 'unknown') label = 'unknown'

  return { ratio, acute, chronic, label, riskLevel }
}

export function classifyAcwrRisk(ratio: number | null): AcwrRiskLevel {
  if (ratio == null) return 'unknown'
  if (ratio >= 0.8 && ratio <= 1.3) return 'optimal'
  if ((ratio >= 0.7 && ratio < 0.8) || (ratio > 1.3 && ratio <= 1.5)) {
    return 'borderline'
  }
  if (ratio < 0.7) return 'undertraining'
  return 'overreaching'
}

export function getAcwrBadgeClass(riskLevel: AcwrRiskLevel): string {
  switch (riskLevel) {
    case 'optimal':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
    case 'borderline':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700'
    case 'undertraining':
    case 'overreaching':
      return 'border-red-500/30 bg-red-500/10 text-red-700'
    default:
      return ''
  }
}

export function getReadinessDotClass(
  variant: 'success' | 'warning' | 'danger' | 'secondary'
): string {
  switch (variant) {
    case 'success':
      return 'bg-emerald-500'
    case 'warning':
      return 'bg-amber-500'
    case 'danger':
      return 'bg-red-500'
    default:
      return 'bg-muted-foreground/40'
  }
}

export function getCheckInReadiness(checkIn: {
  energy_level: number | null
  calm_level: number | null
  soreness_level: number | null
} | null): {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'secondary'
} {
  if (!checkIn) {
    return { label: 'No data', variant: 'secondary' }
  }

  const energy = checkIn.energy_level ?? 0
  const calm = checkIn.calm_level ?? 0
  const soreness = checkIn.soreness_level ?? 0

  if (energy >= 4 && calm >= 3 && soreness <= 2) {
    return { label: 'High', variant: 'success' }
  }
  if (energy >= 2 && soreness <= 3) {
    return { label: 'Moderate', variant: 'warning' }
  }
  return { label: 'Low', variant: 'danger' }
}

export function getDateRangeBounds(
  range: LoadDateRange,
  referenceDate: Date = new Date()
): LoadRangeBounds {
  const refKey = toDateKey(referenceDate)
  const currentWeekStart = getWeekStart(refKey)

  if (range === 'this_week') {
    const weekEndDate = parseDateKey(currentWeekStart)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    return {
      start: currentWeekStart,
      end: toDateKey(weekEndDate),
      label: 'This week',
    }
  }

  if (range === 'last_week') {
    const lastWeekStartDate = parseDateKey(currentWeekStart)
    lastWeekStartDate.setDate(lastWeekStartDate.getDate() - 7)
    const lastWeekEndDate = new Date(lastWeekStartDate)
    lastWeekEndDate.setDate(lastWeekStartDate.getDate() + 6)
    return {
      start: toDateKey(lastWeekStartDate),
      end: toDateKey(lastWeekEndDate),
      label: 'Last week',
    }
  }

  const rollingStart = parseDateKey(refKey)
  rollingStart.setDate(rollingStart.getDate() - 27)
  return {
    start: toDateKey(rollingStart),
    end: refKey,
    label: 'Last 4 weeks',
  }
}

export function sumMetricInRange(
  rows: DailyMetricRow[],
  start: string,
  end: string
): number {
  return rows
    .filter((row) => row.dateKey >= start && row.dateKey <= end)
    .reduce((sum, row) => sum + row.value, 0)
}

export function aggregateWeeklyMetric(
  rows: DailyMetricRow[],
  weeks: number,
  referenceDate: Date = new Date()
): WeeklyMetricBucket[] {
  const refKey = toDateKey(referenceDate)
  const currentWeekStart = getWeekStart(refKey)
  const buckets: WeeklyMetricBucket[] = []

  for (let index = weeks - 1; index >= 0; index--) {
    const weekStartDate = parseDateKey(currentWeekStart)
    weekStartDate.setDate(weekStartDate.getDate() - index * 7)
    const weekStart = toDateKey(weekStartDate)

    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)
    const weekEnd = toDateKey(weekEndDate)

    const value = sumMetricInRange(rows, weekStart, weekEnd)
    buckets.push({ weekStart, weekEnd, value })
  }

  return buckets
}

export function formatMetricValue(metric: LoadMetric, value: number): string {
  switch (metric) {
    case 'sessions':
      return value === 1 ? '1 session' : `${Math.round(value)} sessions`
    case 'time': {
      if (value <= 0) return '0 min'
      const minutes = Math.round(value / 60)
      if (minutes < 60) return `${minutes} min`
      const hours = Math.floor(minutes / 60)
      const remainder = minutes % 60
      return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`
    }
    default:
      return formatVolume(value)
  }
}

export function formatMetricDelta(
  metric: LoadMetric,
  current: number,
  previous: number
): string {
  if (metric === 'sessions') {
    if (previous <= 0) return current > 0 ? 'New activity' : 'No change'
    const delta = current - previous
    if (delta === 0) return 'No change'
    return `${delta > 0 ? '+' : ''}${delta} vs prior period`
  }

  if (metric === 'time') {
    if (previous <= 0) return current > 0 ? 'New activity' : 'No change'
    const delta = Math.round(((current - previous) / previous) * 100)
    if (delta === 0) return 'No change'
    return `${delta > 0 ? '+' : ''}${delta}% vs prior period`
  }

  return formatVolumeDelta(current, previous)
}

export function buildLoadSummaryCounts(
  riskLevels: AcwrRiskLevel[]
): LoadSummaryCounts {
  const counts: LoadSummaryCounts = {
    total: riskLevels.length,
    optimal: 0,
    borderline: 0,
    undertraining: 0,
    overreaching: 0,
    unknown: 0,
  }

  for (const level of riskLevels) {
    counts[level]++
  }

  return counts
}

export function buildAcwrAlerts(
  clients: { clientName: string; acwrRatio: number | null; riskLevel: AcwrRiskLevel }[]
): string[] {
  return clients
    .filter(
      (client) =>
        client.riskLevel === 'overreaching' ||
        (client.riskLevel === 'borderline' &&
          client.acwrRatio != null &&
          client.acwrRatio > 1.3)
    )
    .map((client) => {
      const ratio = client.acwrRatio!.toFixed(2)
      if (client.riskLevel === 'overreaching') {
        return `${client.clientName} ACWR hit ${ratio} — consider reducing load this week.`
      }
      return `${client.clientName} ACWR at ${ratio} — monitor load closely.`
    })
}

export function formatVolume(volume: number): string {
  if (volume <= 0) return '0 lbs'
  return `${Math.round(volume).toLocaleString('en-US')} lbs`
}

export function formatVolumeDelta(current: number, previous: number): string {
  if (previous <= 0) {
    return current > 0 ? 'New activity' : 'No change'
  }
  const delta = Math.round(((current - previous) / previous) * 100)
  if (delta === 0) return 'No change'
  return `${delta > 0 ? '+' : ''}${delta}% vs last week`
}

export function formatAcwrLabel(result: AcwrResult): string {
  if (result.ratio == null) return '—'
  return result.ratio.toFixed(2)
}

export function formatPrLabel(
  recordType: 'e1rm' | 'top_set',
  e1rm: number | null,
  weight: number | null,
  reps: number | null
): string {
  if (recordType === 'e1rm' && e1rm != null) {
    return `${e1rm} lb e1RM`
  }
  if (weight != null && reps != null) {
    return `${weight} × ${reps}`
  }
  return 'PR'
}

export function buildHistoricalBestFromRecords(
  records: {
    record_type: 'e1rm' | 'top_set'
    e1rm: number | null
    weight: number | null
    reps: number | null
  }[]
): HistoricalExerciseBest {
  let e1rm: number | null = null
  let topSetWeight: number | null = null
  let topSetReps: number | null = null

  for (const record of records) {
    if (record.record_type === 'e1rm' && record.e1rm != null) {
      if (e1rm == null || record.e1rm > e1rm) {
        e1rm = record.e1rm
      }
    }
    if (record.record_type === 'top_set' && record.weight != null && record.reps != null) {
      const currentTop =
        topSetWeight != null && topSetReps != null
          ? { weight: topSetWeight, reps: topSetReps }
          : null
      const nextTop = { weight: record.weight, reps: record.reps }
      if (isBetterTopSet(nextTop, currentTop)) {
        topSetWeight = record.weight
        topSetReps = record.reps
      }
    }
  }

  if (e1rm == null) {
    for (const record of records) {
      if (record.weight != null && record.reps != null) {
        const estimate = calculateE1rm(record.weight, record.reps)
        if (isBetterE1rm(estimate, e1rm)) {
          e1rm = estimate
        }
      }
    }
  }

  return { e1rm, topSetWeight, topSetReps }
}
