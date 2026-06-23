import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseTargetWeight } from './workout-log'
import {
  buildSuggestionFromSession,
  getLastWeekBounds,
} from './progressive-overload'

describe('parseTargetWeight', () => {
  it('parses positive numeric strings', () => {
    assert.equal(parseTargetWeight('185'), 185)
    assert.equal(parseTargetWeight(' 187.5 '), 187.5)
  })

  it('returns null for empty or invalid values', () => {
    assert.equal(parseTargetWeight(null), null)
    assert.equal(parseTargetWeight(''), null)
    assert.equal(parseTargetWeight('abc'), null)
  })
})

describe('getLastWeekBounds', () => {
  it('returns the seven-day window before the current week', () => {
    const bounds = getLastWeekBounds('monday', new Date('2026-06-22T12:00:00'))
    assert.equal(bounds.start, '2026-06-15')
    assert.equal(bounds.end, '2026-06-21')
  })
})

describe('buildSuggestionFromSession', () => {
  it('creates a suggestion when auto progress targets were met', () => {
    const suggestion = buildSuggestionFromSession(
      {
        id: 'workout-1',
        name: 'Lower A',
        scheduled_date: '2026-06-12',
        client_id: 'client-1',
        exercises: null,
      },
      {
        id: 'row-1',
        exercise_id: 'exercise-1',
        sets: '3',
        reps: '5',
        prescription: null,
        weight_percent: null,
        tracking_options: { autoProgressLoad: true },
        exercise: { id: 'exercise-1', name: 'Back Squat' },
      },
      {
        1: { weight: 185, reps: 5 },
        2: { weight: 185, reps: 5 },
        3: { weight: 185, reps: 5 },
      },
      { id: 'client-1', full_name: 'Alex', avatar_url: null },
      2
    )

    assert.ok(suggestion)
    assert.equal(suggestion?.previousWeight, 185)
    assert.equal(suggestion?.suggestedWeight, 187.5)
    assert.equal(suggestion?.upcomingSessionCount, 2)
  })

  it('skips percent-based prescriptions', () => {
    const suggestion = buildSuggestionFromSession(
      {
        id: 'workout-1',
        name: 'Lower A',
        scheduled_date: '2026-06-12',
        client_id: 'client-1',
        exercises: null,
      },
      {
        id: 'row-1',
        exercise_id: 'exercise-1',
        sets: '3',
        reps: '5',
        prescription: null,
        weight_percent: '75',
        tracking_options: { autoProgressLoad: true },
        exercise: { id: 'exercise-1', name: 'Back Squat' },
      },
      {
        1: { weight: 185, reps: 5 },
        2: { weight: 185, reps: 5 },
        3: { weight: 185, reps: 5 },
      },
      { id: 'client-1', full_name: 'Alex', avatar_url: null },
      1
    )

    assert.equal(suggestion, null)
  })
})
