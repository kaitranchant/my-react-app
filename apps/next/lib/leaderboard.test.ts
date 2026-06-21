import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyLeaderboardRankChanges,
  formatLeaderboardCompletion,
  formatLeaderboardStreak,
  formatRankChangeLabel,
  pickDefaultExerciseIdFromNames,
  pickPowerliftingExerciseIds,
  rankLeaderboardRows,
  resolvePowerliftingExerciseIds,
  type LeaderboardRowData,
} from './leaderboard'

function makeRow(
  overrides: Partial<LeaderboardRowData> & Pick<LeaderboardRowData, 'clientId' | 'clientName'>
): LeaderboardRowData {
  return {
    avatarUrl: null,
    value: null,
    displayValue: '—',
    detail: null,
    weightClass: null,
    achievedAt: null,
    trendValues: [],
    ...overrides,
  }
}

test('rankLeaderboardRows sorts by value descending and handles ties', () => {
  const ranked = rankLeaderboardRows([
    makeRow({ clientId: 'a', clientName: 'Alex', value: 200, displayValue: '200' }),
    makeRow({ clientId: 'b', clientName: 'Blake', value: 300, displayValue: '300' }),
    makeRow({ clientId: 'c', clientName: 'Casey', value: 300, displayValue: '300' }),
    makeRow({ clientId: 'd', clientName: 'Dana', value: null, displayValue: '—' }),
  ])

  assert.equal(ranked[0]?.clientName, 'Blake')
  assert.equal(ranked[0]?.rank, 1)
  assert.equal(ranked[1]?.clientName, 'Casey')
  assert.equal(ranked[1]?.rank, 1)
  assert.equal(ranked[2]?.clientName, 'Alex')
  assert.equal(ranked[2]?.rank, 3)
  assert.equal(ranked[3]?.clientName, 'Dana')
  assert.equal(ranked[3]?.rank, null)
})

test('applyLeaderboardRankChanges marks movement vs previous period', () => {
  const current = rankLeaderboardRows([
    makeRow({ clientId: 'a', clientName: 'Alex', value: 300, displayValue: '300' }),
    makeRow({ clientId: 'b', clientName: 'Blake', value: 200, displayValue: '200' }),
    makeRow({ clientId: 'c', clientName: 'Casey', value: 100, displayValue: '100' }),
  ])
  const previous = rankLeaderboardRows([
    makeRow({ clientId: 'b', clientName: 'Blake', value: 250, displayValue: '250' }),
    makeRow({ clientId: 'a', clientName: 'Alex', value: 200, displayValue: '200' }),
  ])

  const withChanges = applyLeaderboardRankChanges(current, previous)
  assert.equal(withChanges[0]?.clientId, 'a')
  assert.equal(withChanges[0]?.rankChange, 'up')
  assert.equal(withChanges[0]?.rankDelta, 1)
  assert.equal(withChanges[1]?.rankChange, 'down')
  assert.equal(withChanges[2]?.rankChange, 'new')
})

test('pickDefaultExerciseIdFromNames prefers common powerlifting lifts', () => {
  const exercises = [
    { id: '1', name: 'Cable Fly' },
    { id: '2', name: 'Barbell Back Squat' },
    { id: '3', name: 'Lat Pulldown' },
  ]

  assert.equal(pickDefaultExerciseIdFromNames(exercises), '2')
})

test('resolvePowerliftingExerciseIds prefers team overrides over auto-detect', () => {
  const exercises = [
    { id: 'squat-auto', name: 'Back Squat' },
    { id: 'bench-auto', name: 'Bench Press' },
    { id: 'deadlift-auto', name: 'Deadlift' },
    { id: 'custom-bench', name: 'Close Grip Bench' },
  ]

  const auto = pickPowerliftingExerciseIds(exercises)
  assert.equal(auto.squatId, 'squat-auto')
  assert.equal(auto.benchId, 'bench-auto')

  const resolved = resolvePowerliftingExerciseIds(exercises, {
    squatId: null,
    benchId: 'custom-bench',
    deadliftId: null,
  })

  assert.equal(resolved.squatId, 'squat-auto')
  assert.equal(resolved.benchId, 'custom-bench')
  assert.equal(resolved.deadliftId, 'deadlift-auto')
})

test('formatLeaderboardCompletion, streak, and rank change labels', () => {
  assert.equal(formatLeaderboardCompletion(82.4), '82%')
  assert.equal(formatLeaderboardStreak(1), '1 day')
  assert.equal(formatLeaderboardStreak(4), '4 days')
  assert.equal(formatRankChangeLabel('new', null), 'NEW')
  assert.equal(formatRankChangeLabel('up', 2), '↑2')
  assert.equal(formatRankChangeLabel('down', 1), '↓1')
  assert.equal(formatRankChangeLabel('same', 0), '—')
})
