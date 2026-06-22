import { test, expect } from 'vitest'

import {
  buildWhoopDailyMetrics,
  calculateWhoopSleepHours,
  kilojoulesToKcal,
} from '@/lib/whoop/api'
import type {
  WhoopCycleRecord,
  WhoopRecoveryRecord,
  WhoopSleepRecord,
} from '@/lib/whoop/types'

test('calculateWhoopSleepHours uses scored stage summary when available', () => {
  const sleep: WhoopSleepRecord = {
    id: 'sleep-1',
    cycle_id: 1,
    user_id: 10,
    created_at: '2026-06-20T08:00:00.000Z',
    updated_at: '2026-06-20T08:00:00.000Z',
    start: '2026-06-20T01:00:00.000Z',
    end: '2026-06-20T08:00:00.000Z',
    timezone_offset: '-04:00',
    nap: false,
    score_state: 'SCORED',
    score: {
      stage_summary: {
        total_in_bed_time_milli: 28_800_000,
        total_awake_time_milli: 1_800_000,
        total_no_data_time_milli: 0,
      },
      sleep_performance_percentage: 84,
    },
  }

  expect(calculateWhoopSleepHours(sleep)).toBe(7.5)
})

test('buildWhoopDailyMetrics merges recovery, cycle, and sleep by cycle id', () => {
  const recovery: WhoopRecoveryRecord = {
    cycle_id: 42,
    sleep_id: 'sleep-1',
    user_id: 10,
    created_at: '2026-06-20T08:00:00.000Z',
    updated_at: '2026-06-20T08:00:00.000Z',
    score_state: 'SCORED',
    score: {
      recovery_score: 68,
      resting_heart_rate: 54,
      hrv_rmssd_milli: 72.4,
    },
  }

  const cycle: WhoopCycleRecord = {
    id: 42,
    user_id: 10,
    created_at: '2026-06-20T08:00:00.000Z',
    updated_at: '2026-06-20T08:00:00.000Z',
    start: '2026-06-19T20:00:00.000Z',
    end: '2026-06-20T08:00:00.000Z',
    timezone_offset: '-04:00',
    score_state: 'SCORED',
    score: {
      strain: 11.8,
      kilojoule: 9000,
    },
  }

  const sleep: WhoopSleepRecord = {
    id: 'sleep-1',
    cycle_id: 42,
    user_id: 10,
    created_at: '2026-06-20T08:00:00.000Z',
    updated_at: '2026-06-20T08:00:00.000Z',
    start: '2026-06-20T01:00:00.000Z',
    end: '2026-06-20T08:00:00.000Z',
    timezone_offset: '-04:00',
    nap: false,
    score_state: 'SCORED',
    score: {
      stage_summary: {
        total_in_bed_time_milli: 25_200_000,
        total_awake_time_milli: 0,
        total_no_data_time_milli: 0,
      },
      sleep_performance_percentage: 91,
    },
  }

  const [metric] = buildWhoopDailyMetrics({
    recoveries: [recovery],
    cycles: [cycle],
    sleeps: [sleep],
  })

  expect(metric.metricDate).toBe('2026-06-20')
  expect(metric.recoveryScore).toBe(68)
  expect(metric.hrvMs).toBe(72.4)
  expect(metric.restingHrBpm).toBe(54)
  expect(metric.strainScore).toBe(11.8)
  expect(metric.sleepScore).toBe(91)
  expect(metric.sleepHours).toBe(7)
  expect(metric.caloriesKcal).toBe(kilojoulesToKcal(9000))
})
