import type { SupabaseClient } from '@supabase/supabase-js'

import { getWeekDayLabels, toDateKey } from '@/lib/calendar'
import { calcWorkoutStreak } from '@/lib/client-metrics'
import type {
  ScheduledWorkoutStatus,
  WeekStartsOn,
  WeightUnit,
} from 'app/types/database'
import type { AttendanceClientRow } from '@/lib/attendance'
import {
  buildHistoricalBestFromRecords,
  calcSetVolume,
  type HistoricalExerciseBest,
} from '@/lib/load-analytics'
import {
  applyLeaderboardRankChanges,
  formatLeaderboardCompletion,
  formatLeaderboardE1rm,
  formatLeaderboardImprovement,
  formatLeaderboardStreak,
  formatLeaderboardVolume,
  formatRelativeStrengthScore,
  getLeaderboardPeriodBounds,
  pickDefaultExerciseIdFromNames,
  resolvePowerliftingExerciseIds,
  rankLeaderboardRows,
  type LeaderboardPeriodBounds,
  type LeaderboardRow,
  type LeaderboardRowData,
  type PowerliftingExerciseIds,
} from '@/lib/leaderboard'
import {
  buildBodyweightTimeline,
  getBodyweightAtDate,
} from '@/lib/bodyweight-timeline'
import { formatWeight } from '@/lib/coach-preferences'
import {
  calculateRelativeStrengthScore,
  type BiologicalSex,
  type RelativeStrengthFormula,
} from '@/lib/strength-coefficients'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type { LeaderboardFormula, LeaderboardMetric, LeaderboardPeriod } from '@/lib/validations/leaderboard'
import { metricNeedsExercise } from '@/lib/validations/leaderboard'

export type LeaderboardExerciseOption = {
  id: string
  name: string
}

type PrRecordRow = {
  client_id: string
  record_type: 'e1rm' | 'top_set'
  e1rm: number | null
  weight: number | null
  reps: number | null
  achieved_at: string
}

type WorkoutStatusRow = {
  client_id: string
  status: ScheduledWorkoutStatus
  scheduled_date: string
  completed_at: string | null
}

type LogRow = {
  weight: number | null
  reps: number | null
  completed: boolean
  scheduled_workout_exercises: {
    exercise_id: string
    tracking_options: unknown
  }
  client_scheduled_workouts: {
    client_id: string
    scheduled_date: string
    completed_at: string | null
    status: string
  }
}

export async function fetchLeaderboardExercises(
  supabase: SupabaseClient
): Promise<LeaderboardExerciseOption[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error || !data) {
    return []
  }

  return data
}

export async function fetchTeamPowerliftingExerciseIds(
  supabase: SupabaseClient,
  teamId: string
): Promise<PowerliftingExerciseIds | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('squat_exercise_id, bench_exercise_id, deadlift_exercise_id')
    .eq('id', teamId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    squatId: data.squat_exercise_id,
    benchId: data.bench_exercise_id,
    deadliftId: data.deadlift_exercise_id,
  }
}

export async function fetchTeamWeightClassesByClientId(
  supabase: SupabaseClient,
  teamId: string
): Promise<Map<string, string | null>> {
  const { data, error } = await supabase
    .from('team_members')
    .select('client_id, weight_class')
    .eq('team_id', teamId)

  if (error || !data) {
    return new Map()
  }

  return new Map(
    data.map((row) => [row.client_id, row.weight_class as string | null])
  )
}

export async function fetchLeaderboardOptOutClientIds(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<Set<string>> {
  if (clientIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('clients')
    .select('id, leaderboard_opt_out')
    .in('id', clientIds)

  if (error || !data) {
    return new Set()
  }

  return new Set(
    data
      .filter((row) => row.leaderboard_opt_out === true)
      .map((row) => row.id)
  )
}

type ClientLeaderboardProfile = {
  biologicalSex: BiologicalSex | null
}

export async function fetchClientLeaderboardProfilesById(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<Map<string, ClientLeaderboardProfile>> {
  if (clientIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('clients')
    .select('id, biological_sex')
    .in('id', clientIds)

  if (error || !data) {
    return new Map()
  }

  return new Map(
    data.map((row) => [
      row.id,
      {
        biologicalSex: (row.biological_sex as BiologicalSex | null) ?? null,
      },
    ])
  )
}

async function fetchBodyweightTimelinesByClientId(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<Map<string, ReturnType<typeof buildBodyweightTimeline>>> {
  if (clientIds.length === 0) return new Map()

  const [scansResult, checkInsResult] = await Promise.all([
    supabase
      .from('client_inbody_scans')
      .select('client_id, scan_date, weight_lbs')
      .in('client_id', clientIds)
      .order('scan_date', { ascending: true }),
    supabase
      .from('client_check_ins')
      .select('client_id, check_in_date, weight')
      .in('client_id', clientIds)
      .not('weight', 'is', null)
      .order('check_in_date', { ascending: true }),
  ])

  const scansByClientId = new Map<
    string,
    { scan_date: string; weight_lbs: number }[]
  >()
  for (const row of scansResult.data ?? []) {
    const existing = scansByClientId.get(row.client_id) ?? []
    existing.push({
      scan_date: row.scan_date,
      weight_lbs: row.weight_lbs,
    })
    scansByClientId.set(row.client_id, existing)
  }

  const checkInsByClientId = new Map<
    string,
    { check_in_date: string; weight: number | null }[]
  >()
  for (const row of checkInsResult.data ?? []) {
    const existing = checkInsByClientId.get(row.client_id) ?? []
    existing.push({
      check_in_date: row.check_in_date,
      weight: row.weight,
    })
    checkInsByClientId.set(row.client_id, existing)
  }

  const timelines = new Map<string, ReturnType<typeof buildBodyweightTimeline>>()
  for (const clientId of clientIds) {
    timelines.set(
      clientId,
      buildBodyweightTimeline(
        scansByClientId.get(clientId) ?? [],
        checkInsByClientId.get(clientId) ?? []
      )
    )
  }

  return timelines
}

export function filterLeaderboardClients(
  clients: AttendanceClientRow[],
  options: {
    optOutClientIds: Set<string>
    weightClass: string | null
    weightClassesByClientId: Map<string, string | null>
  }
): AttendanceClientRow[] {
  return clients.filter((client) => {
    if (options.optOutClientIds.has(client.id)) {
      return false
    }
    if (!options.weightClass) {
      return true
    }
    return options.weightClassesByClientId.get(client.id) === options.weightClass
  })
}

export async function fetchMostLoggedExerciseId(
  supabase: SupabaseClient,
  clientIds: string[],
  exercises: LeaderboardExerciseOption[],
  startDateKey: string
): Promise<string | null> {
  if (clientIds.length === 0) {
    return pickDefaultExerciseIdFromNames(exercises)
  }

  const logRows = await fetchLogRowsForClients(supabase, clientIds, startDateKey)
  const countsByExerciseId = new Map<string, number>()

  for (const row of logRows) {
    if (!row.completed) continue
    const exerciseId = row.scheduled_workout_exercises.exercise_id
    countsByExerciseId.set(
      exerciseId,
      (countsByExerciseId.get(exerciseId) ?? 0) + 1
    )
  }

  let topExerciseId: string | null = null
  let topCount = 0

  for (const [exerciseId, count] of Array.from(countsByExerciseId.entries())) {
    if (count > topCount) {
      topExerciseId = exerciseId
      topCount = count
    }
  }

  if (topExerciseId) {
    return topExerciseId
  }

  return pickDefaultExerciseIdFromNames(exercises)
}

async function fetchLogRowsForClients(
  supabase: SupabaseClient,
  clientIds: string[],
  startDateKey: string | null
): Promise<LogRow[]> {
  if (clientIds.length === 0) return []

  let query = supabase
    .from('workout_log_sets')
    .select(
      `
      weight,
      reps,
      completed,
      scheduled_workout_exercises!inner (exercise_id, tracking_options),
      client_scheduled_workouts!inner (client_id, scheduled_date, completed_at, status)
    `
    )
    .in('client_scheduled_workouts.client_id', clientIds)
    .eq('client_scheduled_workouts.status', 'completed')

  if (startDateKey) {
    query = query.gte('client_scheduled_workouts.scheduled_date', startDateKey)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as unknown as LogRow[]
}

function formatAchievedDate(achievedAt: string | null): string | null {
  if (!achievedAt) return null
  return new Date(achievedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildBaseRows(
  clients: AttendanceClientRow[],
  weightClassesByClientId: Map<string, string | null>
): LeaderboardRowData[] {
  return clients.map((client) => ({
    clientId: client.id,
    clientName: client.full_name,
    avatarUrl: client.avatar_url,
    value: null,
    displayValue: '—',
    detail: null,
    weightClass: weightClassesByClientId.get(client.id) ?? null,
    achievedAt: null,
    trendValues: [],
  }))
}

function filterRecordsByBounds(
  records: PrRecordRow[],
  bounds: LeaderboardPeriodBounds,
  mode: 'within' | 'before'
): PrRecordRow[] {
  return records.filter((record) => {
    const dateKey = record.achieved_at.slice(0, 10)
    if (mode === 'before') {
      if (bounds.start) {
        return dateKey < bounds.start
      }
      return dateKey <= bounds.end
    }

    if (bounds.start && dateKey < bounds.start) return false
    return dateKey <= bounds.end
  })
}

function getBestE1rmFromRecords(records: PrRecordRow[]): {
  value: number | null
  achievedAt: string | null
  weight: number | null
  reps: number | null
} {
  const best = buildHistoricalBestFromRecords(records)
  if (best.e1rm == null) {
    return { value: null, achievedAt: null, weight: null, reps: null }
  }

  const matching = records
    .filter((record) => record.record_type === 'e1rm' && record.e1rm === best.e1rm)
    .sort(
      (left, right) =>
        new Date(right.achieved_at).getTime() -
        new Date(left.achieved_at).getTime()
    )[0]

  return {
    value: best.e1rm,
    achievedAt: matching?.achieved_at ?? null,
    weight: matching?.weight ?? best.e1rm,
    reps: matching?.reps ?? null,
  }
}

function buildWeeklyE1rmTrend(
  records: PrRecordRow[],
  weekStartsOn: WeekStartsOn
): number[] {
  const today = new Date()
  const weekStarts: string[] = []

  for (let index = 3; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - index * 7)
    const weekDays = getWeekDayLabels(weekStartsOn, date)
    weekStarts.push(weekDays[0]?.dateKey ?? toDateKey(date))
  }

  return weekStarts.map((weekStart) => {
    const weekEnd = shiftDateKey(weekStart, 6)
    const weekRecords = records.filter((record) => {
      const dateKey = record.achieved_at.slice(0, 10)
      return dateKey >= weekStart && dateKey <= weekEnd
    })
    return getBestE1rmFromRecords(weekRecords).value ?? 0
  })
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

async function fetchStrengthRows(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[],
  exerciseId: string,
  bounds: LeaderboardPeriodBounds,
  weightUnit: WeightUnit,
  weightClassesByClientId: Map<string, string | null>,
  weekStartsOn: WeekStartsOn
): Promise<LeaderboardRowData[]> {
  const clientIds = clients.map((client) => client.id)
  const baseRows = buildBaseRows(clients, weightClassesByClientId)

  if (clientIds.length === 0) return baseRows

  const { data, error } = await supabase
    .from('exercise_pr_records')
    .select('client_id, record_type, e1rm, weight, reps, achieved_at')
    .in('client_id', clientIds)
    .eq('exercise_id', exerciseId)
    .order('achieved_at', { ascending: false })

  if (error || !data) return baseRows

  const recordsByClientId = new Map<string, PrRecordRow[]>()
  for (const row of data as PrRecordRow[]) {
    const existing = recordsByClientId.get(row.client_id) ?? []
    existing.push(row)
    recordsByClientId.set(row.client_id, existing)
  }

  return baseRows.map((row) => {
    const allRecords = recordsByClientId.get(row.clientId) ?? []
    const periodRecords =
      bounds.start == null
        ? allRecords.filter((record) => record.achieved_at.slice(0, 10) <= bounds.end)
        : filterRecordsByBounds(allRecords, bounds, 'within')

    const best = getBestE1rmFromRecords(periodRecords)
    if (best.value == null) return row

    const achievedLabel = formatAchievedDate(best.achievedAt)
    const trendValues = buildWeeklyE1rmTrend(allRecords, weekStartsOn)

    return {
      ...row,
      value: best.value,
      displayValue: formatLeaderboardE1rm(best.value, weightUnit),
      detail: achievedLabel ? `Set on ${achievedLabel}` : null,
      achievedAt: best.achievedAt,
      trendValues,
    }
  })
}

async function fetchMostImprovedRows(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[],
  exerciseId: string,
  bounds: LeaderboardPeriodBounds,
  weightClassesByClientId: Map<string, string | null>
): Promise<LeaderboardRowData[]> {
  const clientIds = clients.map((client) => client.id)
  const baseRows = buildBaseRows(clients, weightClassesByClientId)
  if (clientIds.length === 0) return baseRows

  const { data, error } = await supabase
    .from('exercise_pr_records')
    .select('client_id, record_type, e1rm, weight, reps, achieved_at')
    .in('client_id', clientIds)
    .eq('exercise_id', exerciseId)
    .eq('record_type', 'e1rm')
    .order('achieved_at', { ascending: true })

  if (error || !data) return baseRows

  const recordsByClientId = new Map<string, PrRecordRow[]>()
  for (const row of data as PrRecordRow[]) {
    const existing = recordsByClientId.get(row.client_id) ?? []
    existing.push(row)
    recordsByClientId.set(row.client_id, existing)
  }

  return baseRows.map((row) => {
    const records = recordsByClientId.get(row.clientId) ?? []
    const beforeRecords = filterRecordsByBounds(records, bounds, 'before')
    const duringRecords = filterRecordsByBounds(records, bounds, 'within')

    const priorBest = getBestE1rmFromRecords(beforeRecords).value
    const periodBest = getBestE1rmFromRecords(
      priorBest == null ? duringRecords : [...beforeRecords, ...duringRecords]
    ).value

    if (periodBest == null || priorBest == null || priorBest <= 0) {
      if (periodBest != null && priorBest == null) {
        return {
          ...row,
          value: 100,
          displayValue: 'NEW',
          detail: 'First recorded PR in this period',
        }
      }
      return row
    }

    if (periodBest <= priorBest) {
      return {
        ...row,
        value: 0,
        displayValue: '—',
        detail: `Prior best ${priorBest} unchanged`,
      }
    }

    const improvement = ((periodBest - priorBest) / priorBest) * 100

    return {
      ...row,
      value: improvement,
      displayValue: formatLeaderboardImprovement(improvement),
      detail: `${priorBest} → ${periodBest}`,
    }
  })
}

type RelativeStrengthLiftResult = {
  totalLbs: number
  achievedAt: string | null
  detail: string
}

function filterPeriodRecords(
  records: PrRecordRow[],
  bounds: LeaderboardPeriodBounds
): PrRecordRow[] {
  if (bounds.start == null) {
    return records.filter((record) => record.achieved_at.slice(0, 10) <= bounds.end)
  }
  return filterRecordsByBounds(records, bounds, 'within')
}

function getRelativeStrengthLiftResult(
  recordsByExerciseId: Map<string, PrRecordRow[]>,
  exerciseId: string | null,
  bounds: LeaderboardPeriodBounds
): RelativeStrengthLiftResult | null {
  if (!exerciseId) return null

  const best = getBestE1rmFromRecords(
    filterPeriodRecords(recordsByExerciseId.get(exerciseId) ?? [], bounds)
  )
  if (best.value == null) return null

  return {
    totalLbs: best.value,
    achievedAt: best.achievedAt,
    detail: 'Single lift',
  }
}

function getPowerliftingTotalResult(
  recordsByExerciseId: Map<string, PrRecordRow[]>,
  powerliftingExerciseIds: PowerliftingExerciseIds,
  bounds: LeaderboardPeriodBounds
): RelativeStrengthLiftResult | null {
  const { squatId, benchId, deadliftId } = powerliftingExerciseIds
  if (!squatId || !benchId || !deadliftId) return null

  const squat = getBestE1rmFromRecords(
    filterPeriodRecords(recordsByExerciseId.get(squatId) ?? [], bounds)
  )
  const bench = getBestE1rmFromRecords(
    filterPeriodRecords(recordsByExerciseId.get(benchId) ?? [], bounds)
  )
  const deadlift = getBestE1rmFromRecords(
    filterPeriodRecords(recordsByExerciseId.get(deadliftId) ?? [], bounds)
  )

  if (squat.value == null || bench.value == null || deadlift.value == null) {
    return null
  }

  const achievedAt = [squat.achievedAt, bench.achievedAt, deadlift.achievedAt]
    .filter((value): value is string => Boolean(value))
    .sort(
      (left, right) =>
        new Date(right).getTime() - new Date(left).getTime()
    )[0] ?? null

  return {
    totalLbs: squat.value + bench.value + deadlift.value,
    achievedAt,
    detail: `SBD total (${squat.value} + ${bench.value} + ${deadlift.value})`,
  }
}

function buildWeeklyRelativeStrengthTrend(
  recordsByExerciseId: Map<string, PrRecordRow[]>,
  exerciseId: string | null,
  powerliftingExerciseIds: PowerliftingExerciseIds,
  profilesByClientId: Map<string, ClientLeaderboardProfile>,
  bodyweightTimelinesByClientId: Map<string, ReturnType<typeof buildBodyweightTimeline>>,
  clientId: string,
  formula: RelativeStrengthFormula,
  weekStartsOn: WeekStartsOn
): number[] {
  const profile = profilesByClientId.get(clientId)
  const biologicalSex = profile?.biologicalSex
  if (!biologicalSex) return []

  const timeline = bodyweightTimelinesByClientId.get(clientId) ?? []
  const today = new Date()
  const weekStarts: string[] = []

  for (let index = 3; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - index * 7)
    const weekDays = getWeekDayLabels(weekStartsOn, date)
    weekStarts.push(weekDays[0]?.dateKey ?? toDateKey(date))
  }

  return weekStarts.map((weekStart) => {
    const weekEnd = shiftDateKey(weekStart, 6)
    const bounds: LeaderboardPeriodBounds = {
      start: weekStart,
      end: weekEnd,
      previousStart: null,
      previousEnd: null,
      label: 'Week',
    }

    const liftResult = exerciseId
      ? getRelativeStrengthLiftResult(recordsByExerciseId, exerciseId, bounds)
      : getPowerliftingTotalResult(
          recordsByExerciseId,
          powerliftingExerciseIds,
          bounds
        )

    if (!liftResult) return 0

    const achievedDateKey = liftResult.achievedAt?.slice(0, 10) ?? weekEnd
    const bodyweight = getBodyweightAtDate(timeline, achievedDateKey)
    if (!bodyweight) return 0

    return (
      calculateRelativeStrengthScore(
        liftResult.totalLbs,
        bodyweight.weightLbs,
        biologicalSex,
        formula
      ) ?? 0
    )
  })
}

async function fetchRelativeStrengthRows(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[],
  options: {
    exerciseId: string | null
    powerliftingExerciseIds: PowerliftingExerciseIds
    bounds: LeaderboardPeriodBounds
    formula: RelativeStrengthFormula
    weightUnit: WeightUnit
    weightClassesByClientId: Map<string, string | null>
    weekStartsOn: WeekStartsOn
  }
): Promise<LeaderboardRowData[]> {
  const clientIds = clients.map((client) => client.id)
  const baseRows = buildBaseRows(clients, options.weightClassesByClientId)
  if (clientIds.length === 0) return baseRows

  const exerciseIds = options.exerciseId
    ? [options.exerciseId]
    : [
        options.powerliftingExerciseIds.squatId,
        options.powerliftingExerciseIds.benchId,
        options.powerliftingExerciseIds.deadliftId,
      ].filter((value): value is string => Boolean(value))

  if (exerciseIds.length === 0) return baseRows

  const [recordsResult, profilesByClientId, bodyweightTimelinesByClientId] =
    await Promise.all([
      supabase
        .from('exercise_pr_records')
        .select('client_id, exercise_id, record_type, e1rm, weight, reps, achieved_at')
        .in('client_id', clientIds)
        .in('exercise_id', exerciseIds)
        .order('achieved_at', { ascending: false }),
      fetchClientLeaderboardProfilesById(supabase, clientIds),
      fetchBodyweightTimelinesByClientId(supabase, clientIds),
    ])

  if (recordsResult.error || !recordsResult.data) return baseRows

  type ExtendedPrRecordRow = PrRecordRow & { exercise_id: string }

  const recordsByClientId = new Map<string, Map<string, PrRecordRow[]>>()
  for (const row of recordsResult.data as ExtendedPrRecordRow[]) {
    const clientRecords = recordsByClientId.get(row.client_id) ?? new Map()
    const exerciseRecords = clientRecords.get(row.exercise_id) ?? []
    exerciseRecords.push(row)
    clientRecords.set(row.exercise_id, exerciseRecords)
    recordsByClientId.set(row.client_id, clientRecords)
  }

  const formulaLabel = options.formula === 'dots' ? 'DOTS' : 'Wilks'

  return baseRows.map((row) => {
    const profile = profilesByClientId.get(row.clientId)
    if (!profile?.biologicalSex) {
      return {
        ...row,
        detail: 'Set biological sex on athlete profile',
      }
    }

    const recordsByExerciseId = recordsByClientId.get(row.clientId) ?? new Map()
    const liftResult = options.exerciseId
      ? getRelativeStrengthLiftResult(
          recordsByExerciseId,
          options.exerciseId,
          options.bounds
        )
      : getPowerliftingTotalResult(
          recordsByExerciseId,
          options.powerliftingExerciseIds,
          options.bounds
        )

    if (!liftResult) {
      return {
        ...row,
        detail: options.exerciseId
          ? 'No PR logged for this lift in the period'
          : 'Need squat, bench, and deadlift PRs in the period',
      }
    }

    const achievedDateKey = liftResult.achievedAt?.slice(0, 10) ?? options.bounds.end
    const bodyweight = getBodyweightAtDate(
      bodyweightTimelinesByClientId.get(row.clientId) ?? [],
      achievedDateKey
    )

    if (!bodyweight) {
      return {
        ...row,
        detail: 'Add an InBody scan or check-in with bodyweight',
      }
    }

    const score = calculateRelativeStrengthScore(
      liftResult.totalLbs,
      bodyweight.weightLbs,
      profile.biologicalSex,
      options.formula
    )

    if (score == null) {
      return row
    }

    const achievedLabel = formatAchievedDate(liftResult.achievedAt)
    const totalLabel = formatLeaderboardE1rm(liftResult.totalLbs, options.weightUnit)
    const bodyweightLabel = formatWeight(bodyweight.weightLbs, options.weightUnit)
    const trendValues = buildWeeklyRelativeStrengthTrend(
      recordsByExerciseId,
      options.exerciseId,
      options.powerliftingExerciseIds,
      profilesByClientId,
      bodyweightTimelinesByClientId,
      row.clientId,
      options.formula,
      options.weekStartsOn
    )

    return {
      ...row,
      value: score,
      displayValue: formatRelativeStrengthScore(score),
      detail: `${formulaLabel} · ${totalLabel} at ${bodyweightLabel}${
        achievedLabel ? ` · ${achievedLabel}` : ''
      }`,
      achievedAt: liftResult.achievedAt,
      trendValues,
    }
  })
}

async function fetchConsistencyRows(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[],
  bounds: LeaderboardPeriodBounds,
  weightClassesByClientId: Map<string, string | null>
): Promise<LeaderboardRowData[]> {
  const clientIds = clients.map((client) => client.id)
  const baseRows = buildBaseRows(clients, weightClassesByClientId)
  if (clientIds.length === 0) return baseRows

  const start = bounds.start ?? shiftDateKey(bounds.end, -6)
  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select('client_id, status')
    .in('client_id', clientIds)
    .gte('scheduled_date', start)
    .lte('scheduled_date', bounds.end)

  if (error || !data) return baseRows

  const workoutsByClientId = new Map<string, WorkoutStatusRow[]>()
  for (const row of data as WorkoutStatusRow[]) {
    const existing = workoutsByClientId.get(row.client_id) ?? []
    existing.push(row)
    workoutsByClientId.set(row.client_id, existing)
  }

  return baseRows.map((row) => {
    const workouts = workoutsByClientId.get(row.clientId) ?? []
    const completed = workouts.filter((workout) => workout.status === 'completed').length
    const planned = workouts.filter((workout) => workout.status !== 'skipped').length

    if (planned === 0) {
      return { ...row, detail: 'No sessions scheduled in this period' }
    }

    const completionRate = Math.round((completed / planned) * 100)
    return {
      ...row,
      value: completionRate,
      displayValue: formatLeaderboardCompletion(completionRate),
      detail: `${completed} of ${planned} sessions completed`,
    }
  })
}

async function fetchVolumeRows(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[],
  bounds: LeaderboardPeriodBounds,
  weightUnit: WeightUnit,
  weightClassesByClientId: Map<string, string | null>
): Promise<LeaderboardRowData[]> {
  const clientIds = clients.map((client) => client.id)
  const baseRows = buildBaseRows(clients, weightClassesByClientId)
  if (clientIds.length === 0) return baseRows

  const logRows = await fetchLogRowsForClients(
    supabase,
    clientIds,
    bounds.start ?? shiftDateKey(bounds.end, -365)
  )

  const volumeByClientId = new Map<string, number>()
  for (const row of logRows) {
    if (!row.completed) continue
    const dateKey = row.client_scheduled_workouts.completed_at
      ? toDateKey(new Date(row.client_scheduled_workouts.completed_at))
      : row.client_scheduled_workouts.scheduled_date.slice(0, 10)

    if (bounds.start && dateKey < bounds.start) continue
    if (dateKey > bounds.end) continue

    const options = parseTrackingOptions(
      row.scheduled_workout_exercises.tracking_options
    )
    const volume = calcSetVolume(row.weight, row.reps, options)
    if (volume <= 0) continue

    const clientId = row.client_scheduled_workouts.client_id
    volumeByClientId.set(clientId, (volumeByClientId.get(clientId) ?? 0) + volume)
  }

  return baseRows.map((row) => {
    const volume = volumeByClientId.get(row.clientId)
    if (volume == null || volume <= 0) return row

    return {
      ...row,
      value: volume,
      displayValue: formatLeaderboardVolume(volume, weightUnit),
      detail: `${bounds.label.toLowerCase()} tonnage`,
    }
  })
}

async function fetchStreakRows(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[],
  weightClassesByClientId: Map<string, string | null>
): Promise<LeaderboardRowData[]> {
  const clientIds = clients.map((client) => client.id)
  const baseRows = buildBaseRows(clients, weightClassesByClientId)
  if (clientIds.length === 0) return baseRows

  const streakStart = new Date()
  streakStart.setDate(streakStart.getDate() - 120)
  const streakStartKey = toDateKey(streakStart)

  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select('client_id, status, scheduled_date, completed_at')
    .in('client_id', clientIds)
    .eq('status', 'completed')
    .gte('scheduled_date', streakStartKey)

  if (error || !data) return baseRows

  const workoutsByClientId = new Map<string, WorkoutStatusRow[]>()
  for (const row of data as WorkoutStatusRow[]) {
    const existing = workoutsByClientId.get(row.client_id) ?? []
    existing.push(row)
    workoutsByClientId.set(row.client_id, existing)
  }

  return baseRows.map((row) => {
    const streak = calcWorkoutStreak(workoutsByClientId.get(row.clientId) ?? [])
    return {
      ...row,
      value: streak,
      displayValue: formatLeaderboardStreak(streak),
      detail: streak === 0 ? 'No active streak' : `${streak} days in a row`,
    }
  })
}

async function fetchRowsForMetric(
  supabase: SupabaseClient,
  options: {
    clients: AttendanceClientRow[]
    metric: LeaderboardMetric
    exerciseId: string | null
    powerliftingExerciseIds: PowerliftingExerciseIds
    formula: LeaderboardFormula
    bounds: LeaderboardPeriodBounds
    weekStartsOn: WeekStartsOn
    weightUnit: WeightUnit
    weightClassesByClientId: Map<string, string | null>
  }
): Promise<LeaderboardRowData[]> {
  switch (options.metric) {
    case 'strength':
      if (!options.exerciseId) {
        return buildBaseRows(options.clients, options.weightClassesByClientId)
      }
      return fetchStrengthRows(
        supabase,
        options.clients,
        options.exerciseId,
        options.bounds,
        options.weightUnit,
        options.weightClassesByClientId,
        options.weekStartsOn
      )
    case 'relative_strength':
      return fetchRelativeStrengthRows(supabase, options.clients, {
        exerciseId: options.exerciseId,
        powerliftingExerciseIds: options.powerliftingExerciseIds,
        bounds: options.bounds,
        formula: options.formula,
        weightUnit: options.weightUnit,
        weightClassesByClientId: options.weightClassesByClientId,
        weekStartsOn: options.weekStartsOn,
      })
    case 'most_improved':
      if (!options.exerciseId) {
        return buildBaseRows(options.clients, options.weightClassesByClientId)
      }
      return fetchMostImprovedRows(
        supabase,
        options.clients,
        options.exerciseId,
        options.bounds,
        options.weightClassesByClientId
      )
    case 'consistency':
      return fetchConsistencyRows(
        supabase,
        options.clients,
        options.bounds,
        options.weightClassesByClientId
      )
    case 'volume':
      return fetchVolumeRows(
        supabase,
        options.clients,
        options.bounds,
        options.weightUnit,
        options.weightClassesByClientId
      )
    default:
      return fetchStreakRows(
        supabase,
        options.clients,
        options.weightClassesByClientId
      )
  }
}

export async function fetchLeaderboardRows(
  supabase: SupabaseClient,
  options: {
    clients: AttendanceClientRow[]
    metric: LeaderboardMetric
    period: LeaderboardPeriod
    exerciseId: string | null
    formula?: LeaderboardFormula
    weekStartsOn: WeekStartsOn
    weightUnit: WeightUnit
    teamId?: string
    exercises: LeaderboardExerciseOption[]
    weightClass: string | null
  }
): Promise<{
  rows: LeaderboardRow[]
  resolvedExerciseId: string | null
  resolvedExerciseName: string | null
  availableWeightClasses: string[]
  periodLabel: string
}> {
  const weightClassesByClientId = options.teamId
    ? await fetchTeamWeightClassesByClientId(supabase, options.teamId)
    : new Map<string, string | null>()

  const availableWeightClasses = Array.from(
    new Set(
      Array.from(weightClassesByClientId.values()).filter(
        (value): value is string => Boolean(value?.trim())
      )
    )
  ).sort((left, right) => left.localeCompare(right))

  const optOutClientIds = await fetchLeaderboardOptOutClientIds(
    supabase,
    options.clients.map((client) => client.id)
  )

  const scopedClients = filterLeaderboardClients(options.clients, {
    optOutClientIds,
    weightClass: options.weightClass,
    weightClassesByClientId,
  })

  const periodBounds = getLeaderboardPeriodBounds(options.period, options.weekStartsOn)
  const teamPowerliftingOverrides = options.teamId
    ? await fetchTeamPowerliftingExerciseIds(supabase, options.teamId)
    : null
  const powerliftingExerciseIds = resolvePowerliftingExerciseIds(
    options.exercises,
    teamPowerliftingOverrides
  )
  const formula = options.formula ?? 'dots'

  let resolvedExerciseId = options.exerciseId
  if (metricNeedsExercise(options.metric) && !resolvedExerciseId) {
    const lookbackStart = shiftDateKey(periodBounds.end, -180)
    resolvedExerciseId = await fetchMostLoggedExerciseId(
      supabase,
      scopedClients.map((client) => client.id),
      options.exercises,
      lookbackStart
    )
  }

  const resolvedExerciseName =
    options.metric === 'relative_strength' && resolvedExerciseId == null
      ? 'Powerlifting total (SBD)'
      : resolvedExerciseId != null
        ? (options.exercises.find((exercise) => exercise.id === resolvedExerciseId)
            ?.name ?? null)
        : null

  const sharedOptions = {
    clients: scopedClients,
    metric: options.metric,
    exerciseId: resolvedExerciseId,
    powerliftingExerciseIds,
    formula,
    weekStartsOn: options.weekStartsOn,
    weightUnit: options.weightUnit,
    weightClassesByClientId,
  }

  const [currentRowData, previousRowData] = await Promise.all([
    fetchRowsForMetric(supabase, { ...sharedOptions, bounds: periodBounds }),
    options.metric === 'streak'
      ? Promise.resolve([] as LeaderboardRowData[])
      : fetchRowsForMetric(supabase, {
          ...sharedOptions,
          bounds: {
            start: periodBounds.previousStart,
            end: periodBounds.previousEnd ?? periodBounds.end,
            previousStart: null,
            previousEnd: periodBounds.previousEnd ?? periodBounds.end,
            label: 'Previous period',
          },
        }),
  ])

  const rankedRows = rankLeaderboardRows(currentRowData)
  const previousRankedRows = rankLeaderboardRows(previousRowData)

  return {
    rows:
      options.metric === 'streak'
        ? rankedRows
        : applyLeaderboardRankChanges(rankedRows, previousRankedRows),
    resolvedExerciseId,
    resolvedExerciseName,
    availableWeightClasses,
    periodLabel: periodBounds.label,
  }
}

export { pickDefaultExerciseIdFromNames as pickDefaultExerciseId }
