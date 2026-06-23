import { toDateKey } from '@/lib/calendar'
import { formatWeight } from '@/lib/coach-preferences'
import { buildHistoricalBestFromRecords } from '@/lib/load-analytics'
import type { createClient } from '@/lib/supabase/server'
import type { WeightUnit } from 'app/types/database'

export const STRENGTH_HISTORY_MONTHS = 6

export type StrengthHistoryRecord = {
  record_type: 'e1rm' | 'top_set'
  e1rm: number | null
  weight: number | null
  reps: number | null
  achieved_at: string
}

export type StrengthHistoryPoint = {
  monthKey: string
  label: string
  e1rm: number | null
}

export type StrengthHistoryExercise = {
  id: string
  name: string
  latestAchievedAt: string
  currentE1rm: number | null
}

export type StrengthHistoryTrend = {
  points: StrengthHistoryPoint[]
  currentE1rm: number | null
  periodStartE1rm: number | null
  changeLabel: string | null
}

function monthStartDate(referenceDate: Date, monthsAgo: number): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - monthsAgo,
    1
  )
}

function monthEndDateKey(year: number, month: number): string {
  return toDateKey(new Date(year, month + 1, 0))
}

export function buildMonthlyE1rmTrend(
  records: StrengthHistoryRecord[],
  monthsBack = STRENGTH_HISTORY_MONTHS,
  referenceDate = new Date()
): StrengthHistoryPoint[] {
  const points: StrengthHistoryPoint[] = []

  for (let index = monthsBack - 1; index >= 0; index -= 1) {
    const monthDate = monthStartDate(referenceDate, index)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const endKey = monthEndDateKey(year, month)

    const recordsUpToMonth = records.filter(
      (record) => record.achieved_at.slice(0, 10) <= endKey
    )
    const best = buildHistoricalBestFromRecords(recordsUpToMonth)

    points.push({
      monthKey,
      label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      e1rm: best.e1rm,
    })
  }

  return points
}

export function buildStrengthHistoryTrend(
  records: StrengthHistoryRecord[],
  weightUnit: WeightUnit = 'lbs',
  monthsBack = STRENGTH_HISTORY_MONTHS,
  referenceDate = new Date()
): StrengthHistoryTrend {
  const points = buildMonthlyE1rmTrend(records, monthsBack, referenceDate)
  const currentE1rm = buildHistoricalBestFromRecords(records).e1rm

  const firstMonthStart = monthStartDate(referenceDate, monthsBack - 1)
  const periodStartCutoff = toDateKey(
    new Date(firstMonthStart.getFullYear(), firstMonthStart.getMonth(), 0)
  )
  const recordsBeforePeriod = records.filter(
    (record) => record.achieved_at.slice(0, 10) <= periodStartCutoff
  )
  const periodStartE1rm =
    buildHistoricalBestFromRecords(recordsBeforePeriod).e1rm

  let changeLabel: string | null = null
  if (currentE1rm != null && periodStartE1rm != null) {
    const delta = currentE1rm - periodStartE1rm
    if (delta === 0) {
      changeLabel = 'No change over 6 months'
    } else {
      const sign = delta > 0 ? '+' : ''
      changeLabel = `${sign}${formatWeight(delta, weightUnit)} over 6 months`
    }
  } else if (currentE1rm != null && periodStartE1rm == null) {
    changeLabel = `New PR: ${formatWeight(currentE1rm, weightUnit)} e1RM`
  }

  return {
    points,
    currentE1rm,
    periodStartE1rm,
    changeLabel,
  }
}

export function formatStrengthE1rm(
  value: number,
  weightUnit: WeightUnit = 'lbs'
): string {
  return `${formatWeight(value, weightUnit)} e1RM`
}

export async function fetchStrengthHistoryExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<StrengthHistoryExercise[]> {
  const { data, error } = await supabase
    .from('exercise_pr_records')
    .select(
      `
      exercise_id,
      e1rm,
      record_type,
      weight,
      reps,
      achieved_at,
      exercise:exercises(name)
    `
    )
    .eq('client_id', clientId)
    .order('achieved_at', { ascending: false })

  if (error || !data) {
    return []
  }

  const recordsByExerciseId = new Map<
    string,
    {
      name: string
      latestAchievedAt: string
      records: Array<{
        record_type: 'e1rm' | 'top_set'
        e1rm: number | null
        weight: number | null
        reps: number | null
      }>
    }
  >()

  for (const row of data) {
    const exerciseId = row.exercise_id as string
    const exercise = row.exercise as { name: string } | null
    const existing = recordsByExerciseId.get(exerciseId)

    if (!existing) {
      recordsByExerciseId.set(exerciseId, {
        name: exercise?.name ?? 'Exercise',
        latestAchievedAt: row.achieved_at as string,
        records: [
          {
            record_type: row.record_type as 'e1rm' | 'top_set',
            e1rm: row.e1rm as number | null,
            weight: row.weight as number | null,
            reps: row.reps as number | null,
          },
        ],
      })
      continue
    }

    existing.records.push({
      record_type: row.record_type as 'e1rm' | 'top_set',
      e1rm: row.e1rm as number | null,
      weight: row.weight as number | null,
      reps: row.reps as number | null,
    })
  }

  return Array.from(recordsByExerciseId.entries())
    .map(([id, entry]) => ({
      id,
      name: entry.name,
      latestAchievedAt: entry.latestAchievedAt,
      currentE1rm: buildHistoricalBestFromRecords(entry.records).e1rm,
    }))
    .sort((left, right) =>
      right.latestAchievedAt.localeCompare(left.latestAchievedAt)
    )
}

export async function fetchStrengthHistoryRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  exerciseId: string
): Promise<StrengthHistoryRecord[]> {
  const { data, error } = await supabase
    .from('exercise_pr_records')
    .select('record_type, e1rm, weight, reps, achieved_at')
    .eq('client_id', clientId)
    .eq('exercise_id', exerciseId)
    .order('achieved_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as StrengthHistoryRecord[]
}

export async function fetchStrengthHistoryForExercise(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  exerciseId: string,
  weightUnit: WeightUnit = 'lbs'
): Promise<StrengthHistoryTrend> {
  const records = await fetchStrengthHistoryRecords(supabase, clientId, exerciseId)
  return buildStrengthHistoryTrend(records, weightUnit)
}
