import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
  type QueryStatisticsResponse,
} from '@kingstinct/react-native-healthkit'

const SYNC_LOOKBACK_DAYS = 14

const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as const
const RESTING_HEART_RATE = 'HKQuantityTypeIdentifierRestingHeartRate' as const
const HRV_SDNN = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' as const
const SLEEP_ANALYSIS = 'HKCategoryTypeIdentifierSleepAnalysis' as const

const ASLEEP_SLEEP_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleep,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
  CategoryValueSleepAnalysis.asleepUnspecified,
])

export type AppleHealthMetricDraft = {
  metricDate: string
  steps: number | null
  sleepHours: number | null
  restingHrBpm: number | null
  hrvMs: number | null
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getSyncWindow(): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (SYNC_LOOKBACK_DAYS - 1))
  return { start, end }
}

function getMetricDateFromStatistics(response: QueryStatisticsResponse): string | null {
  const anchor = response.startDate ?? response.endDate
  if (!anchor) return null
  return toDateKey(anchor)
}

function upsertMetricDraft(
  map: Map<string, AppleHealthMetricDraft>,
  metricDate: string,
  patch: Partial<Omit<AppleHealthMetricDraft, 'metricDate'>>
) {
  const existing = map.get(metricDate)
  map.set(metricDate, {
    metricDate,
    steps: patch.steps ?? existing?.steps ?? null,
    sleepHours: patch.sleepHours ?? existing?.sleepHours ?? null,
    restingHrBpm: patch.restingHrBpm ?? existing?.restingHrBpm ?? null,
    hrvMs: patch.hrvMs ?? existing?.hrvMs ?? null,
  })
}

export async function ensureAppleHealthAuthorization(): Promise<void> {
  const available = await isHealthDataAvailableAsync()
  if (!available) {
    throw new Error('Apple Health is not available on this device.')
  }

  await requestAuthorization({
    toRead: [STEP_COUNT, RESTING_HEART_RATE, HRV_SDNN, SLEEP_ANALYSIS],
  })
}

export async function readAppleHealthMetrics(): Promise<AppleHealthMetricDraft[]> {
  const { start, end } = getSyncWindow()
  const metricsByDate = new Map<string, AppleHealthMetricDraft>()

  const [stepStats, restingHrStats, hrvStats, sleepSamples] = await Promise.all([
    queryStatisticsCollectionForQuantity(
      STEP_COUNT,
      ['cumulativeSum'],
      start,
      { day: 1 },
      { filter: { startDate: start, endDate: end } }
    ),
    queryStatisticsCollectionForQuantity(
      RESTING_HEART_RATE,
      ['discreteAverage'],
      start,
      { day: 1 },
      { filter: { startDate: start, endDate: end } }
    ),
    queryStatisticsCollectionForQuantity(
      HRV_SDNN,
      ['discreteAverage'],
      start,
      { day: 1 },
      { filter: { startDate: start, endDate: end } }
    ),
    queryCategorySamples(SLEEP_ANALYSIS, {
      filter: { startDate: start, endDate: end },
      ascending: true,
    }),
  ])

  for (const stat of stepStats) {
    const metricDate = getMetricDateFromStatistics(stat)
    if (!metricDate) continue
    upsertMetricDraft(metricsByDate, metricDate, {
      steps:
        stat.sumQuantity?.quantity != null
          ? Math.round(stat.sumQuantity.quantity)
          : null,
    })
  }

  for (const stat of restingHrStats) {
    const metricDate = getMetricDateFromStatistics(stat)
    if (!metricDate) continue
    upsertMetricDraft(metricsByDate, metricDate, {
      restingHrBpm:
        stat.averageQuantity?.quantity != null
          ? Math.round(stat.averageQuantity.quantity)
          : null,
    })
  }

  for (const stat of hrvStats) {
    const metricDate = getMetricDateFromStatistics(stat)
    if (!metricDate) continue
    upsertMetricDraft(metricsByDate, metricDate, {
      hrvMs:
        stat.averageQuantity?.quantity != null
          ? Math.round(stat.averageQuantity.quantity * 10) / 10
          : null,
    })
  }

  for (const sample of sleepSamples) {
    if (!ASLEEP_SLEEP_VALUES.has(sample.value)) continue

    const durationMs = sample.endDate.getTime() - sample.startDate.getTime()
    if (!Number.isFinite(durationMs) || durationMs <= 0) continue

    const metricDate = toDateKey(sample.endDate)
    const existing = metricsByDate.get(metricDate)
    const sleepHours =
      Math.round(((existing?.sleepHours ?? 0) + durationMs / 3_600_000) * 10) /
      10

    upsertMetricDraft(metricsByDate, metricDate, { sleepHours })
  }

  return Array.from(metricsByDate.values())
    .filter(
      (metric) =>
        metric.steps != null ||
        metric.sleepHours != null ||
        metric.restingHrBpm != null ||
        metric.hrvMs != null
    )
    .sort((a, b) => a.metricDate.localeCompare(b.metricDate))
}
