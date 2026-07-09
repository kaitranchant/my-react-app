import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatCoachNotesForExerciseLog,
  hasVisibleExerciseLogNotes,
  mergeCoachNotesForHistory,
} from './exercise-log-notes'

describe('mergeCoachNotesForHistory', () => {
  it('returns null when both are empty', () => {
    assert.equal(mergeCoachNotesForHistory(null, ''), null)
  })

  it('merges prescription and session notes', () => {
    assert.equal(
      mergeCoachNotesForHistory('Cue depth', 'Reduced load'),
      'Cue depth\n\nReduced load'
    )
  })
})

describe('formatCoachNotesForExerciseLog', () => {
  it('includes only prescription notes from the builder', () => {
    assert.equal(
      formatCoachNotesForExerciseLog({
        workout_notes: 'Brace hard',
        coach_session_notes: null,
      }),
      'Brace hard'
    )
  })

  it('includes only session notes added while logging', () => {
    assert.equal(
      formatCoachNotesForExerciseLog({
        workout_notes: null,
        coach_session_notes: 'Felt heavy today',
      }),
      'Felt heavy today'
    )
  })
})

describe('hasVisibleExerciseLogNotes', () => {
  it('is false when no notes exist', () => {
    assert.equal(
      hasVisibleExerciseLogNotes({
        workout_notes: null,
        coach_session_notes: null,
        client_notes: null,
      }),
      false
    )
  })

  it('is true when client notes exist', () => {
    assert.equal(
      hasVisibleExerciseLogNotes({
        workout_notes: null,
        coach_session_notes: null,
        client_notes: 'Knee felt fine',
      }),
      true
    )
  })
})
