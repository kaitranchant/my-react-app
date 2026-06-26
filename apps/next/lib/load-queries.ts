import { toDateKey } from '@/lib/calendar'
import {
  getBlendedReadinessLevel,
  getDaysSinceLastSession,
  isRecentCheckIn,
  type CheckInReadinessInput,
} from '@/lib/client-metrics'
import {
  aggregateWeeklyMetric,
  aggregateWeeklyVolume,
  calcAcwr,
  calcSetVolume,
  formatAcwrLabel,
  formatVolumeDelta,
  getDateRangeBounds,
  isAcwrLoadAlert,
  type AcwrRiskLevel,
  type DailyMetricRow,
  type WeeklyMetricBucket,
} from '@/lib/load-analytics'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type { createClient } from '@/lib/supabase/server'
import type { RecentPrHighlight } from '@/lib/pr-records'
import {
  fetchRecentPrHighlightsForClients,
} from '@/lib/pr-records'
import type { ClientScheduledWorkout } from 'app/types/database'

type HistoricalLogRow = {
  weight: number | null
  reps: number | null
  duration_seconds: number | null
  completed: boolean
  scheduled_workout_exercises: {
    exercise_id: string
    tracking_options: unknown
  }
  client_scheduled_workouts: {
    id: string
    client_id: string
    scheduled_date: string
    completed_at: string | null
    status: string
  }
}

type WorkoutRow = Pick<
  ClientScheduledWorkout,
  'id' | 'scheduled_date' | 'status' | 'completed_at'
> & { client_id?: string }

type CheckInRow = CheckInReadinessInput

type CheckInQueryRow = CheckInRow & { client_id: string }

export type ClientLoadSummary = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  tonnageRows: DailyMetricRow[]
  sessionRows: DailyMetricRow[]
  timeRows: DailyMetricRow[]
  workouts: WorkoutRow[]
  weeklyTonnage: WeeklyMetricBucket[]
  weeklySessions: WeeklyMetricBucket[]
  weeklyTime: WeeklyMetricBucket[]
  acwrRatio: number | null
  acwrLabel: string
  acwrRiskLevel: AcwrRiskLevel
  daysSinceLastSession: number | null
  readinessLabel: string
  readinessVariant: 'success' | 'warning' | 'danger' | 'secondary'
  hasInjuryFlag: boolean
  recentPrs: RecentPrHighlight[]
}

function getVolumeDateKey(row: HistoricalLogRow): string {
  const completedAt = row.client_scheduled_workouts.completed_at
  if (completedAt) {
    return toDateKey(new Date(completedAt))
  }
  return String(row.client_scheduled_workouts.scheduled_date).slice(0, 10)
}

function buildDailyMetricRows(
  entries: Map<string, number>
): DailyMetricRow[] {
  return Array.from(entries.entries()).map(([dateKey, value]) => ({
    dateKey,
    value,
  }))
}

export function buildVolumeRowsFromLogData(rows: HistoricalLogRow[]): DailyMetricRow[] {
  const volumeByDate = new Map<string, number>()

  for (const row of rows) {
    if (row.client_scheduled_workouts.status !== 'completed') continue
    if (!row.completed) continue

    const options = parseTrackingOptions(
      row.scheduled_workout_exercises.tracking_options
    )
    const volume = calcSetVolume(row.weight, row.reps, options)
    if (volume <= 0) continue

    const dateKey = getVolumeDateKey(row)
    volumeByDate.set(dateKey, (volumeByDate.get(dateKey) ?? 0) + volume)
  }

  return buildDailyMetricRows(volumeByDate)
}

export function buildTimeRowsFromLogData(rows: HistoricalLogRow[]): DailyMetricRow[] {
  const timeByDate = new Map<string, number>()

  for (const row of rows) {
    if (row.client_scheduled_workouts.status !== 'completed') continue
    if (!row.completed) continue
    if (row.duration_seconds == null || row.duration_seconds <= 0) continue

    const dateKey = getVolumeDateKey(row)
    timeByDate.set(
      dateKey,
      (timeByDate.get(dateKey) ?? 0) + row.duration_seconds
    )
  }

  return buildDailyMetricRows(timeByDate)
}

export function buildSessionRowsFromWorkouts(
  workouts: WorkoutRow[]
): DailyMetricRow[] {
  const sessionsByDate = new Map<string, number>()

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue
    const dateKey = workout.completed_at
      ? toDateKey(new Date(workout.completed_at))
      : workout.scheduled_date
    sessionsByDate.set(dateKey, (sessionsByDate.get(dateKey) ?? 0) + 1)
  }

  return buildDailyMetricRows(sessionsByDate)
}

export async function fetchLogRowsForClients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds: string[],
  startDateKey: string
): Promise<HistoricalLogRow[]> {
  if (clientIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('workout_log_sets')
    .select(
      `
      weight,
      reps,
      duration_seconds,
      completed,
      scheduled_workout_exercises!inner (exercise_id, tracking_options),
      client_scheduled_workouts!inner (id, client_id, scheduled_date, completed_at, status)
    `
    )
    .in('client_scheduled_workouts.client_id', clientIds)
    .eq('client_scheduled_workouts.status', 'completed')
    .gte('client_scheduled_workouts.scheduled_date', startDateKey)

  if (error || !data) {
    return []
  }

  return data as HistoricalLogRow[]
}

export function groupLogRowsByClientId(
  rows: HistoricalLogRow[]
): Map<string, HistoricalLogRow[]> {
  const grouped = new Map<string, HistoricalLogRow[]>()

  for (const row of rows) {
    const clientId = row.client_scheduled_workouts.client_id
    const existing = grouped.get(clientId) ?? []
    existing.push(row)
    grouped.set(clientId, existing)
  }

  return grouped
}

export async function fetchClientLogRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  startDateKey: string
): Promise<HistoricalLogRow[]> {
  return fetchLogRowsForClients(supabase, [clientId], startDateKey)
}

export async function fetchWorkoutsForClients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds: string[],
  startDateKey: string
): Promise<WorkoutRow[]> {
  if (clientIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select('id, client_id, scheduled_date, status, completed_at')
    .in('client_id', clientIds)
    .gte('scheduled_date', startDateKey)
    .order('scheduled_date', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as WorkoutRow[]
}

export function groupWorkoutsByClientId(
  workouts: WorkoutRow[]
): Map<string, WorkoutRow[]> {
  const grouped = new Map<string, WorkoutRow[]>()

  for (const workout of workouts) {
    const clientId = workout.client_id
    if (!clientId) continue
    const existing = grouped.get(clientId) ?? []
    existing.push(workout)
    grouped.set(clientId, existing)
  }

  return grouped
}

export async function fetchClientWorkouts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  startDateKey: string
): Promise<WorkoutRow[]> {
  const workouts = await fetchWorkoutsForClients(
    supabase,
    [clientId],
    startDateKey
  )
  return workouts.map(({ client_id: _clientId, ...workout }) => workout)
}

export async function fetchLatestCheckInsForClients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds: string[]
): Promise<Map<string, CheckInRow>> {
  if (clientIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('client_check_ins')
    .select(
      'client_id, check_in_date, sleep_hours, sleep_quality, energy_level, calm_level, soreness_level, has_pain'
    )
    .in('client_id', clientIds)
    .order('check_in_date', { ascending: false })

  if (error || !data) {
    return new Map()
  }

  const latestByClientId = new Map<string, CheckInRow>()
  for (const row of data as CheckInQueryRow[]) {
    if (latestByClientId.has(row.client_id)) {
      continue
    }
    const { client_id: _clientId, ...checkIn } = row
    latestByClientId.set(row.client_id, checkIn)
  }

  return latestByClientId
}

export async function fetchLatestCheckIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<CheckInRow | null> {
  const latestByClientId = await fetchLatestCheckInsForClients(supabase, [
    clientId,
  ])
  return latestByClientId.get(clientId) ?? null
}

function countSessionCompliance(
  workouts: WorkoutRow[],
  start: string,
  end: string
): { completed: number; planned: number } {
  const inRange = workouts.filter(
    (workout) =>
      workout.scheduled_date >= start && workout.scheduled_date <= end
  )

  const planned = inRange.filter((workout) => workout.status !== 'skipped').length
  const completed = inRange.filter((workout) => workout.status === 'completed').length

  return { completed, planned }
}

import type { ClientDashboardAlertContext } from '@/lib/proactive-alerts'

export type CoachDashboardLoadAlerts = {
  elevatedLoadCount: number
  injuryFlagCount: number
  clientContexts: ClientDashboardAlertContext[]
}

export async function fetchCoachDashboardLoadAlerts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clients: { id: string; full_name: string }[]
): Promise<CoachDashboardLoadAlerts> {
  if (clients.length === 0) {
    return { elevatedLoadCount: 0, injuryFlagCount: 0, clientContexts: [] }
  }

  const today = new Date()
  const eightWeeksAgo = new Date(today)
  eightWeeksAgo.setDate(today.getDate() - 7 * 8)
  const startDateKey = toDateKey(eightWeeksAgo)
  const recentCheckInCutoff = toDateKey(new Date(Date.now() - 7 * 86_400_000))
  const clientIds = clients.map((client) => client.id)

  const [allLogRows, allWorkouts, latestCheckInsByClientId] = await Promise.all([
    fetchLogRowsForClients(supabase, clientIds, startDateKey),
    fetchWorkoutsForClients(supabase, clientIds, startDateKey),
    fetchLatestCheckInsForClients(supabase, clientIds),
  ])

  const logRowsByClientId = groupLogRowsByClientId(allLogRows)
  const workoutsByClientId = groupWorkoutsByClientId(allWorkouts)

  const results = clients.map((client) => {
    const logRows = logRowsByClientId.get(client.id) ?? []
    const workouts = (workoutsByClientId.get(client.id) ?? []).map(
      ({ client_id: _clientId, ...workout }) => workout
    )
    const latestCheckIn = latestCheckInsByClientId.get(client.id) ?? null

    const tonnageRows = buildVolumeRowsFromLogData(logRows)
    const volumeRowsForAcwr = tonnageRows.map((row) => ({
      dateKey: row.dateKey,
      volume: row.value,
    }))
    const acwr = calcAcwr(volumeRowsForAcwr, today)
    const hasInjuryFlag = Boolean(
      latestCheckIn?.has_pain &&
        latestCheckIn.check_in_date >= recentCheckInCutoff
    )

    return {
      clientId: client.id,
      clientName: client.full_name,
      daysSinceLastSession: getDaysSinceLastSession(
        workouts as Parameters<typeof getDaysSinceLastSession>[0]
      ),
      acwrRatio: acwr.ratio,
      acwrRiskLevel: acwr.riskLevel,
      hasInjuryFlag,
      elevatedLoad: isAcwrLoadAlert(acwr.riskLevel, acwr.ratio),
    }
  })

  return {
    elevatedLoadCount: results.filter((result) => result.elevatedLoad).length,
    injuryFlagCount: results.filter((result) => result.hasInjuryFlag).length,
    clientContexts: results.map(
      ({
        clientId,
        clientName,
        daysSinceLastSession,
        acwrRatio,
        acwrRiskLevel,
        hasInjuryFlag,
      }) => ({
        clientId,
        clientName,
        daysSinceLastSession,
        acwrRatio,
        acwrRiskLevel,
        hasInjuryFlag,
      })
    ),
  }
}

export async function fetchCoachLoadSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clients: { id: string; full_name: string; avatar_url?: string | null }[]
): Promise<ClientLoadSummary[]> {
  if (clients.length === 0) {
    return []
  }

  const today = new Date()
  const eightWeeksAgo = new Date(today)
  eightWeeksAgo.setDate(today.getDate() - 7 * 8)
  const startDateKey = toDateKey(eightWeeksAgo)
  const thisWeek = getDateRangeBounds('this_week', today)
  const recentCheckInCutoff = toDateKey(new Date(Date.now() - 7 * 86_400_000))
  const clientIds = clients.map((client) => client.id)

  const [
    allLogRows,
    allWorkouts,
    latestCheckInsByClientId,
    recentPrsByClientId,
  ] = await Promise.all([
    fetchLogRowsForClients(supabase, clientIds, startDateKey),
    fetchWorkoutsForClients(supabase, clientIds, startDateKey),
    fetchLatestCheckInsForClients(supabase, clientIds),
    fetchRecentPrHighlightsForClients(supabase, clientIds, 3),
  ])

  const logRowsByClientId = groupLogRowsByClientId(allLogRows)
  const workoutsByClientId = groupWorkoutsByClientId(allWorkouts)

  const summaries = clients.map((client) => {
    const logRows = logRowsByClientId.get(client.id) ?? []
    const workouts = (workoutsByClientId.get(client.id) ?? []).map(
      ({ client_id: _clientId, ...workout }) => workout
    )
    const recentPrs = recentPrsByClientId.get(client.id) ?? []
    const latestCheckIn = latestCheckInsByClientId.get(client.id) ?? null

    const tonnageRows = buildVolumeRowsFromLogData(logRows)
    const sessionRows = buildSessionRowsFromWorkouts(workouts)
    const timeRows = buildTimeRowsFromLogData(logRows)
    const volumeRowsForAcwr = tonnageRows.map((row) => ({
      dateKey: row.dateKey,
      volume: row.value,
    }))
    const acwr = calcAcwr(volumeRowsForAcwr, today)
    const weeklyTonnage = aggregateWeeklyVolume(volumeRowsForAcwr, 8, today).map(
      (bucket) => ({
        weekStart: bucket.weekStart,
        weekEnd: bucket.weekEnd,
        value: bucket.volume,
      })
    )
    const weeklySessions = aggregateWeeklyMetric(sessionRows, 8, today)
    const weeklyTime = aggregateWeeklyMetric(timeRows, 8, today)
    const daysSinceLastSession = getDaysSinceLastSession(
      workouts.map((workout) => ({
        id: workout.id,
        name: '',
        status: workout.status,
        scheduled_date: workout.scheduled_date,
        started_at: null,
        completed_at: workout.completed_at,
        updated_at: workout.completed_at ?? workout.scheduled_date,
      }))
    )
    const readiness = getBlendedReadinessLevel(
      workouts.map((workout) => ({
        id: workout.id,
        name: '',
        status: workout.status,
        scheduled_date: workout.scheduled_date,
        started_at: null,
        completed_at: workout.completed_at,
        updated_at: workout.completed_at ?? workout.scheduled_date,
      })),
      latestCheckIn
    )
    const hasReadinessData =
      daysSinceLastSession !== null ||
      isRecentCheckIn(latestCheckIn, 14)

    return {
      clientId: client.id,
      clientName: client.full_name,
      avatarUrl: client.avatar_url ?? null,
      tonnageRows,
      sessionRows,
      timeRows,
      workouts,
      weeklyTonnage,
      weeklySessions,
      weeklyTime,
      acwrRatio: acwr.ratio,
      acwrLabel: formatAcwrLabel(acwr),
      acwrRiskLevel: acwr.riskLevel,
      daysSinceLastSession,
      readinessLabel: hasReadinessData ? readiness.label : 'No data',
      readinessVariant: hasReadinessData ? readiness.variant : 'secondary',
      hasInjuryFlag: Boolean(
        latestCheckIn?.has_pain &&
          latestCheckIn.check_in_date >= recentCheckInCutoff
      ),
      recentPrs,
    } satisfies ClientLoadSummary
  })

  return summaries.sort(
    (a, b) =>
      sumMetricRows(b.tonnageRows, thisWeek.start, thisWeek.end) -
      sumMetricRows(a.tonnageRows, thisWeek.start, thisWeek.end)
  )
}

function sumMetricRows(rows: DailyMetricRow[], start: string, end: string): number {
  return rows
    .filter((row) => row.dateKey >= start && row.dateKey <= end)
    .reduce((sum, row) => sum + row.value, 0)
}

export async function fetchClientLoadMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
) {
  const [summary] = await fetchCoachLoadSummaries(supabase, [
    { id: clientId, full_name: '' },
  ])

  if (!summary) {
    throw new Error('Client not found')
  }

  const today = new Date()
  const thisWeek = getDateRangeBounds('this_week', today)
  const lastWeek = getDateRangeBounds('last_week', today)

  const thisWeekVolume = sumMetricRows(summary.tonnageRows, thisWeek.start, thisWeek.end)
  const lastWeekVolume = sumMetricRows(summary.tonnageRows, lastWeek.start, lastWeek.end)

  const acwrVariant: 'success' | 'warning' | 'secondary' =
    summary.acwrRiskLevel === 'optimal'
      ? 'success'
      : summary.acwrRiskLevel === 'unknown'
        ? 'secondary'
        : 'warning'

  return {
    thisWeekVolume,
    lastWeekVolume,
    volumeDeltaLabel: formatVolumeDelta(thisWeekVolume, lastWeekVolume),
    acwrLabel: summary.acwrLabel,
    acwrVariant,
    weeklyVolumes: summary.weeklyTonnage.map((bucket) => ({
      weekStart: bucket.weekStart,
      weekEnd: bucket.weekEnd,
      volume: bucket.value,
    })),
    recentPrs: summary.recentPrs,
  }
}

export { formatVolume } from '@/lib/load-analytics'
