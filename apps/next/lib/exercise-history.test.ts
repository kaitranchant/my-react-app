import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatDayHeader } from '@/lib/calendar'
import type { ExerciseHistorySession } from 'app/types/database'

function hasHistoryNotes(session: ExerciseHistorySession) {
  return Boolean(session.coachNotes?.trim() || session.clientNotes?.trim())
}

describe('exercise history notes', () => {
  it('detects sessions with coach or client notes', () => {
    assert.equal(
      hasHistoryNotes({
        workoutId: 'w1',
        date: '2026-07-01',
        workoutName: 'Push',
        sets: [],
        bestE1rm: null,
        coachNotes: 'Keep ribs down',
        clientNotes: null,
      }),
      true
    )

    assert.equal(
      hasHistoryNotes({
        workoutId: 'w2',
        date: '2026-07-02',
        workoutName: 'Pull',
        sets: [],
        bestE1rm: null,
        coachNotes: null,
        clientNotes: 'Felt tight in hips',
      }),
      true
    )

    assert.equal(
      hasHistoryNotes({
        workoutId: 'w3',
        date: '2026-07-03',
        workoutName: 'Legs',
        sets: [],
        bestE1rm: null,
        coachNotes: null,
        clientNotes: null,
      }),
      false
    )
  })

  it('formats history session dates for display', () => {
    const label = formatDayHeader('2026-07-08')
    assert.ok(label.length > 0)
    assert.match(label, /8/)
  })
})
