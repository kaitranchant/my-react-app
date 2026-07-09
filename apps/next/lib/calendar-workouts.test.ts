import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { CalendarDaySummary } from 'app/types/database'

import {
  getSummariesForDate,
  groupSummariesByDate,
  pickSummaryForDate,
} from './calendar-workouts'

function summary(
  id: string,
  scheduledDate: string,
  name: string
): CalendarDaySummary {
  return {
    id,
    scheduled_date: scheduledDate,
    name,
    status: 'scheduled',
    started_at: null,
  }
}

describe('calendar-workouts', () => {
  const days = [
    summary('a', '2026-07-01', 'Upper'),
    summary('b', '2026-07-01', 'Lower'),
    summary('c', '2026-07-02', 'Cardio'),
  ]

  it('groups summaries by date', () => {
    const grouped = groupSummariesByDate(days)
    assert.equal(grouped.get('2026-07-01')?.length, 2)
    assert.equal(grouped.get('2026-07-02')?.length, 1)
  })

  it('filters summaries for a date', () => {
    assert.equal(getSummariesForDate(days, '2026-07-01').length, 2)
    assert.equal(getSummariesForDate(days, '2026-07-03').length, 0)
  })

  it('prefers a selected workout when available', () => {
    const summaries = getSummariesForDate(days, '2026-07-01')
    assert.equal(pickSummaryForDate(summaries, 'b')?.id, 'b')
    assert.equal(pickSummaryForDate(summaries)?.id, 'a')
  })
})
