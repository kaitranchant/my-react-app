import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { WorkoutLogSetDraft } from '@/lib/workout-log'
import {
  adjustKeypadWeight,
  appendKeypadDigit,
  backspaceKeypadValue,
  calculatePlatesPerSide,
  getCopyValuesForSet,
  getNextKeypadTarget,
  getVisibleKeypadFields,
  getWeightIncrement,
} from './workout-log-keypad'

const weightRepsFields = {
  showWeight: true,
  showReps: true,
  showDuration: false,
  showBarSpeed: false,
  showPeakPower: false,
  completionOnly: false,
}

function makeSets(count: number): WorkoutLogSetDraft[] {
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    targetLabel: null,
    weight: '',
    reps: '',
    durationSeconds: '',
    barSpeed: '',
    peakPower: '',
    completed: false,
    predicted: false,
    notes: '',
  }))
}

describe('workout-log-keypad', () => {
  it('appends digits and decimal for weight', () => {
    assert.equal(appendKeypadDigit('', '2', 'weight'), '2')
    assert.equal(appendKeypadDigit('2', '5', 'weight'), '25')
    assert.equal(appendKeypadDigit('25', '.', 'weight'), '25.')
    assert.equal(appendKeypadDigit('25.', '5', 'weight'), '25.5')
    assert.equal(appendKeypadDigit('25', '.', 'weight'), '25.')
    assert.equal(appendKeypadDigit('25', '.', 'reps'), '25')
  })

  it('backspaces values', () => {
    assert.equal(backspaceKeypadValue('225'), '22')
    assert.equal(backspaceKeypadValue(''), '')
  })

  it('adjusts weight by unit increment', () => {
    assert.equal(getWeightIncrement('lbs'), 2.5)
    assert.equal(getWeightIncrement('kg'), 1.25)
    assert.equal(adjustKeypadWeight('100', 2.5, 'lbs'), '102.5')
    assert.equal(adjustKeypadWeight('100', -2.5, 'lbs'), '97.5')
    assert.equal(adjustKeypadWeight('1', -2.5, 'lbs'), '0')
    assert.equal(adjustKeypadWeight('', 1.25, 'kg'), '1.25')
  })

  it('returns visible keypad fields from exercise flags', () => {
    assert.deepEqual(getVisibleKeypadFields(weightRepsFields), ['weight', 'reps'])
    assert.deepEqual(
      getVisibleKeypadFields({
        ...weightRepsFields,
        showReps: false,
        showDuration: true,
      }),
      ['weight', 'durationSeconds']
    )
  })

  it('navigates NEXT across fields and sets', () => {
    const sets = makeSets(3)
    sets[0]!.weight = '100'
    sets[0]!.reps = '8'

    const first = {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'weight' as const,
    }

    assert.deepEqual(getNextKeypadTarget(first, sets, weightRepsFields), {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'reps',
    })

    const afterReps = {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'reps' as const,
    }

    assert.deepEqual(getNextKeypadTarget(afterReps, sets, weightRepsFields), {
      exerciseId: 'ex-1',
      setNumber: 2,
      field: 'weight',
    })
  })

  it('copies from prior set or previous performance', () => {
    const sets = makeSets(2)
    sets[0]!.weight = '135'
    sets[0]!.reps = '5'

    assert.deepEqual(
      getCopyValuesForSet(2, sets, {}, weightRepsFields),
      { weight: '135', reps: '5' }
    )

    assert.deepEqual(
      getCopyValuesForSet(1, sets, { 1: { weight: 30, reps: 20 } }, weightRepsFields),
      { weight: '30', reps: '20' }
    )
  })

  it('calculates plates per side', () => {
    const result = calculatePlatesPerSide(225, 45, [45, 35, 25, 10, 5, 2.5])
    assert.equal(result.achievable, true)
    assert.deepEqual(result.platesPerSide, [{ weight: 45, count: 2 }])

    const barOnly = calculatePlatesPerSide(45, 45, [45, 25, 10])
    assert.equal(barOnly.achievable, true)
    assert.deepEqual(barOnly.platesPerSide, [])

    const remainder = calculatePlatesPerSide(50, 45, [45, 25, 10])
    assert.equal(remainder.achievable, false)
    assert.ok(remainder.remainderPerSide > 0)
  })
})
