import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSessionsByDate,
  buildTrainingConsistencyHeatmap,
  buildWorkoutDayStats,
  isMissedWorkout,
  sessionCountToLevel,
  sliceHeatmapWeeks,
} from '@/lib/training-consistency'

test('sessionCountToLevel buckets completed sessions', () => {
  assert.equal(sessionCountToLevel(0), 0)
  assert.equal(sessionCountToLevel(1), 1)
  assert.equal(sessionCountToLevel(2), 2)
  assert.equal(sessionCountToLevel(3), 3)
  assert.equal(sessionCountToLevel(4), 4)
  assert.equal(sessionCountToLevel(9), 4)
})

test('buildSessionsByDate counts completed workouts by scheduled date', () => {
  const sessionsByDate = buildSessionsByDate([
    { status: 'completed', scheduled_date: '2026-06-20' },
    { status: 'completed', scheduled_date: '2026-06-20' },
    { status: 'skipped', scheduled_date: '2026-06-21' },
    { status: 'scheduled', scheduled_date: '2026-06-22' },
  ])

  assert.equal(sessionsByDate.get('2026-06-20'), 2)
  assert.equal(sessionsByDate.get('2026-06-21'), undefined)
})

test('isMissedWorkout marks skipped and overdue scheduled sessions', () => {
  assert.equal(
    isMissedWorkout(
      { status: 'skipped', scheduled_date: '2026-06-20' },
      '2026-06-22'
    ),
    true
  )
  assert.equal(
    isMissedWorkout(
      { status: 'scheduled', scheduled_date: '2026-06-20' },
      '2026-06-22'
    ),
    true
  )
  assert.equal(
    isMissedWorkout(
      { status: 'scheduled', scheduled_date: '2026-06-22' },
      '2026-06-22'
    ),
    false
  )
  assert.equal(
    isMissedWorkout(
      { status: 'completed', scheduled_date: '2026-06-20' },
      '2026-06-22'
    ),
    false
  )
})

test('buildWorkoutDayStats tracks completed and missed sessions', () => {
  const stats = buildWorkoutDayStats(
    [
      { status: 'completed', scheduled_date: '2026-06-20' },
      { status: 'skipped', scheduled_date: '2026-06-21' },
      { status: 'scheduled', scheduled_date: '2026-06-19' },
    ],
    { todayKey: '2026-06-22' }
  )

  assert.deepEqual(stats.get('2026-06-20'), { completed: 1, missed: 0 })
  assert.deepEqual(stats.get('2026-06-21'), { completed: 0, missed: 1 })
  assert.deepEqual(stats.get('2026-06-19'), { completed: 0, missed: 1 })
})

test('buildTrainingConsistencyHeatmap summarizes a year of activity', () => {
  const dayStats = buildWorkoutDayStats(
    [
      { status: 'completed', scheduled_date: '2026-06-18' },
      { status: 'completed', scheduled_date: '2026-06-19' },
      { status: 'completed', scheduled_date: '2026-06-20' },
      { status: 'completed', scheduled_date: '2026-06-22' },
      { status: 'completed', scheduled_date: '2026-06-22' },
      { status: 'skipped', scheduled_date: '2026-06-21' },
    ],
    { todayKey: '2026-06-22' }
  )

  const heatmap = buildTrainingConsistencyHeatmap(dayStats, {
    endDateKey: '2026-06-22',
    weekStartsOn: 'monday',
    totalDays: 7,
  })

  assert.equal(heatmap.totalSessions, 5)
  assert.equal(heatmap.activeDays, 4)
  assert.equal(heatmap.missedDays, 1)
  assert.equal(heatmap.longestStreak, 3)
  assert.equal(heatmap.days.at(-1)?.dateKey, '2026-06-22')
  assert.equal(heatmap.days.at(-1)?.level, 2)
  assert.equal(
    heatmap.days.find((day) => day.dateKey === '2026-06-21')?.missed,
    true
  )
  assert.ok(heatmap.weeks.length > 0)
})

test('sliceHeatmapWeeks keeps only the most recent columns', () => {
  const dayStats = buildWorkoutDayStats(
    [{ status: 'completed', scheduled_date: '2026-06-22' }],
    { todayKey: '2026-06-22' }
  )
  const heatmap = buildTrainingConsistencyHeatmap(dayStats, {
    endDateKey: '2026-06-22',
    weekStartsOn: 'monday',
    totalDays: 28,
  })

  const sliced = sliceHeatmapWeeks(heatmap, 2)
  assert.equal(sliced.weeks.length, 2)
  assert.ok(sliced.monthLabels.every((label) => label.weekIndex < 2))
})
