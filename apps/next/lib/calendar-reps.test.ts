import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getPrescriptionSetCount,
  hasPerSetRepsTargets,
  isCustomRepsShortcut,
  normalizeRepsInput,
  parsePerSetReps,
  resizePerSetReps,
  serializePerSetReps,
} from './validations/calendar'

describe('custom per-set reps', () => {
  it('detects the custom reps shortcut', () => {
    assert.equal(isCustomRepsShortcut('C'), true)
    assert.equal(isCustomRepsShortcut('c'), true)
    assert.equal(isCustomRepsShortcut('10'), false)
  })

  it('clears the custom shortcut during normalization', () => {
    assert.equal(normalizeRepsInput('C'), '')
    assert.equal(normalizeRepsInput('F'), 'to failure')
  })

  it('parses and serializes comma-separated per-set reps', () => {
    assert.deepEqual(parsePerSetReps('10, 8, 6, 6'), ['10', '8', '6', '6'])
    assert.equal(serializePerSetReps(['10', '8', '6', '6']), '10,8,6,6')
    assert.equal(hasPerSetRepsTargets('10,8,6,6'), true)
    assert.equal(hasPerSetRepsTargets('10-12'), false)
  })

  it('resizes per-set arrays to match set count', () => {
    assert.deepEqual(resizePerSetReps(['10', '8'], 4), ['10', '8', '', ''])
    assert.deepEqual(resizePerSetReps(['10', '8', '6', '6', '4'], 3), [
      '10',
      '8',
      '6',
    ])
  })

  it('defaults set count when sets is missing', () => {
    assert.equal(getPrescriptionSetCount('4'), 4)
    assert.equal(getPrescriptionSetCount(''), 3)
  })
})
