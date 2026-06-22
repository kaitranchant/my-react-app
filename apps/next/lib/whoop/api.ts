import { toDateKey } from '@/lib/calendar'
import { WHOOP_API_BASE_URL } from '@/lib/whoop/config'
import type {
  WhoopCycleRecord,
  WhoopDailyMetricDraft,
  WhoopPaginated,
  WhoopProfile,
  WhoopRecoveryRecord,
  WhoopSleepRecord,
} from '@/lib/whoop/types'

export function getWhoopMetricDateFromTimestamp(isoTimestamp: string): string {
  return toDateKey(new Date(isoTimestamp))
}

export function calculateWhoopSleepHours(sleep: WhoopSleepRecord): number | null {
  if (sleep.nap) return null
  if (sleep.score_state !== 'SCORED' || !sleep.score) {
    const start = new Date(sleep.start).getTime()
    const end = new Date(sleep.end).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null
    }
    return Math.round(((end - start) / 3_600_000) * 10) / 10
  }

  const summary = sleep.score.stage_summary
  if (!summary) return null

  const inBed = summary.total_in_bed_time_milli ?? 0
  const awake = summary.total_awake_time_milli ?? 0
  const noData = summary.total_no_data_time_milli ?? 0
  const asleepMs = inBed - awake - noData
  if (asleepMs <= 0) return null

  return Math.round((asleepMs / 3_600_000) * 10) / 10
}

export function kilojoulesToKcal(kilojoules: number | undefined): number | null {
  if (kilojoules == null || Number.isNaN(kilojoules)) return null
  return Math.round(kilojoules * 0.239006)
}

export function buildWhoopDailyMetrics(params: {
  recoveries: WhoopRecoveryRecord[]
  cycles: WhoopCycleRecord[]
  sleeps: WhoopSleepRecord[]
}): WhoopDailyMetricDraft[] {
  const { recoveries, cycles, sleeps } = params
  const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]))
  const sleepByCycleId = new Map<number, WhoopSleepRecord>()

  for (const sleep of sleeps) {
    if (sleep.nap) continue
    const existing = sleepByCycleId.get(sleep.cycle_id)
    if (!existing || new Date(sleep.end).getTime() > new Date(existing.end).getTime()) {
      sleepByCycleId.set(sleep.cycle_id, sleep)
    }
  }

  const drafts = new Map<number, WhoopDailyMetricDraft>()

  for (const recovery of recoveries) {
    if (recovery.score_state !== 'SCORED' || !recovery.score) continue

    const cycle = cycleById.get(recovery.cycle_id)
    const sleep = sleepByCycleId.get(recovery.cycle_id)
    const metricDate = getWhoopMetricDateFromTimestamp(
      cycle?.end ?? sleep?.end ?? recovery.updated_at
    )

    drafts.set(recovery.cycle_id, {
      metricDate,
      cycleId: recovery.cycle_id,
      sleepHours: sleep ? calculateWhoopSleepHours(sleep) : null,
      sleepScore: sleep?.score?.sleep_performance_percentage ?? null,
      hrvMs:
        recovery.score.hrv_rmssd_milli != null
          ? Math.round(recovery.score.hrv_rmssd_milli * 10) / 10
          : null,
      restingHrBpm: recovery.score.resting_heart_rate ?? null,
      recoveryScore: recovery.score.recovery_score ?? null,
      strainScore:
        cycle?.score?.strain != null
          ? Math.round(cycle.score.strain * 10) / 10
          : null,
      caloriesKcal: kilojoulesToKcal(cycle?.score?.kilojoule),
    })
  }

  for (const cycle of cycles) {
    if (drafts.has(cycle.id) || cycle.score_state !== 'SCORED') continue

    const sleep = sleepByCycleId.get(cycle.id)
    drafts.set(cycle.id, {
      metricDate: getWhoopMetricDateFromTimestamp(cycle.end),
      cycleId: cycle.id,
      sleepHours: sleep ? calculateWhoopSleepHours(sleep) : null,
      sleepScore: sleep?.score?.sleep_performance_percentage ?? null,
      hrvMs: null,
      restingHrBpm: null,
      recoveryScore: null,
      strainScore:
        cycle.score?.strain != null
          ? Math.round(cycle.score.strain * 10) / 10
          : null,
      caloriesKcal: kilojoulesToKcal(cycle?.score?.kilojoule),
    })
  }

  return Array.from(drafts.values()).sort((left, right) =>
    right.metricDate.localeCompare(left.metricDate)
  )
}

export async function whoopApiRequest<T>(
  accessToken: string,
  path: string,
  searchParams?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(`${WHOOP_API_BASE_URL}${path}`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value == null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail
        ? `Whoop API ${path} failed (${response.status}): ${detail.slice(0, 200)}`
        : `Whoop API ${path} failed (${response.status})`
    )
  }

  return (await response.json()) as T
}

export async function fetchWhoopProfile(accessToken: string): Promise<WhoopProfile> {
  return whoopApiRequest<WhoopProfile>(accessToken, '/developer/v2/user/profile/basic')
}

async function fetchWhoopCollection<T>(
  accessToken: string,
  path: string,
  start: string,
  limit = 25
): Promise<T[]> {
  const records: T[] = []
  let nextToken: string | undefined

  do {
    const page = await whoopApiRequest<WhoopPaginated<T>>(accessToken, path, {
      start,
      limit,
      nextToken,
    })

    records.push(...(page.records ?? []))
    nextToken = page.next_token ?? undefined
  } while (nextToken)

  return records
}

export async function fetchWhoopRecoveries(
  accessToken: string,
  start: string
): Promise<WhoopRecoveryRecord[]> {
  return fetchWhoopCollection<WhoopRecoveryRecord>(
    accessToken,
    '/developer/v2/recovery',
    start
  )
}

export async function fetchWhoopCycles(
  accessToken: string,
  start: string
): Promise<WhoopCycleRecord[]> {
  return fetchWhoopCollection<WhoopCycleRecord>(
    accessToken,
    '/developer/v2/cycle',
    start
  )
}

export async function fetchWhoopSleeps(
  accessToken: string,
  start: string
): Promise<WhoopSleepRecord[]> {
  return fetchWhoopCollection<WhoopSleepRecord>(
    accessToken,
    '/developer/v2/activity/sleep',
    start
  )
}

export async function revokeWhoopAccess(accessToken: string): Promise<void> {
  const response = await fetch(`${WHOOP_API_BASE_URL}/developer/v2/user/access`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail
        ? `Whoop revoke failed (${response.status}): ${detail.slice(0, 200)}`
        : `Whoop revoke failed (${response.status})`
    )
  }
}
