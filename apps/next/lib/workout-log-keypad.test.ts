import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { WorkoutLogSetDraft } from '@/lib/workout-log'
import {
  adjustKeypadWeight,
  appendKeypadDigit,
  appendKeypadDigitReplacingPredicted,
  backspaceKeypadValue,
  calculatePlatesPerSide,
  canNavigateSet,
  getCopyValuesForSet,
  getPreviousSessionCopyValuesForSet,
  getAdjacentSetKeypadTarget,
  getNextKeypadTarget,
  getKeypadFieldLabel,
  getVisibleKeypadFields,
  getWeightIncrement,
  shouldCompleteSetOnKeypadNext,
  shouldReplacePredictedFieldValue,
} from './workout-log-keypad'
import { createSetDraftId } from './workout-log'

const weightRepsFields = {
  showWeight: true,
  showReps: true,
  showDuration: false,
  showDistance: false,
  showBarSpeed: false,
  showPeakPower: false,
  completionOnly: false,
}

function makeSets(count: number): WorkoutLogSetDraft[] {
  return Array.from({ length: count }, (_, index) => ({
    draftId: createSetDraftId(),
    setNumber: index + 1,
    targetLabel: null,
    weight: '',
    reps: '',
    durationSeconds: '',
    distanceMeters: '',
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

  it('replaces predicted autofill on the first digit instead of appending', () => {
    assert.equal(
      shouldReplacePredictedFieldValue({ predicted: true }, '135'),
      true
    )
    assert.equal(
      shouldReplacePredictedFieldValue({ predicted: false }, '135'),
      false
    )
    assert.equal(shouldReplacePredictedFieldValue({ predicted: true }, ''), false)

    assert.deepEqual(
      appendKeypadDigitReplacingPredicted('135', '2', 'weight', true),
      { value: '2', replacePredicted: false }
    )
    assert.deepEqual(
      appendKeypadDigitReplacingPredicted('135', '2', 'weight', false),
      { value: '1352', replacePredicted: false }
    )
    assert.deepEqual(
      appendKeypadDigitReplacingPredicted('8', '1', 'reps', true),
      { value: '1', replacePredicted: false }
    )
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

  it('navigates NEXT to the next set in order even when sets are unsorted', () => {
    const sets = makeSets(3)
    const shuffledSets = [sets[2]!, sets[0]!, sets[1]!]

    assert.deepEqual(
      getNextKeypadTarget(
        { exerciseId: 'ex-1', setNumber: 1, field: 'reps' },
        shuffledSets,
        weightRepsFields
      ),
      {
        exerciseId: 'ex-1',
        setNumber: 2,
        field: 'weight',
      }
    )
  })

  it('does not skip ahead to later incomplete sets', () => {
    const sets = makeSets(3)
    sets[1]!.completed = true

    assert.deepEqual(
      getNextKeypadTarget(
        { exerciseId: 'ex-1', setNumber: 1, field: 'reps' },
        sets,
        weightRepsFields
      ),
      {
        exerciseId: 'ex-1',
        setNumber: 2,
        field: 'weight',
      }
    )
  })

  it('navigates up and down between sets on the same field', () => {
    const sets = makeSets(3)
    const target = {
      exerciseId: 'ex-1',
      setNumber: 2,
      field: 'weight' as const,
    }

    assert.deepEqual(getAdjacentSetKeypadTarget(target, sets, 'up'), {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'weight',
    })
    assert.deepEqual(getAdjacentSetKeypadTarget(target, sets, 'down'), {
      exerciseId: 'ex-1',
      setNumber: 3,
      field: 'weight',
    })

    assert.equal(
      getAdjacentSetKeypadTarget(
        { exerciseId: 'ex-1', setNumber: 1, field: 'reps' },
        sets,
        'up'
      ),
      null
    )
    assert.equal(
      getAdjacentSetKeypadTarget(
        { exerciseId: 'ex-1', setNumber: 3, field: 'reps' },
        sets,
        'down'
      ),
      null
    )
    assert.equal(canNavigateSet(target, sets, 'up'), true)
    assert.equal(canNavigateSet(target, sets, 'down'), true)
    assert.equal(
      canNavigateSet(
        { exerciseId: 'ex-1', setNumber: 1, field: 'weight' },
        sets,
        'up'
      ),
      false
    )
  })

  it('marks set complete on NEXT when leaving a set with required values', () => {
    const sets = makeSets(2)
    sets[0]!.weight = '135'
    sets[0]!.reps = '5'

    const onReps = {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'reps' as const,
    }
    const nextSet = getNextKeypadTarget(onReps, sets, weightRepsFields)

    assert.deepEqual(nextSet, {
      exerciseId: 'ex-1',
      setNumber: 2,
      field: 'weight',
    })
    assert.equal(
      shouldCompleteSetOnKeypadNext(onReps, nextSet, sets[0], weightRepsFields),
      true
    )

    const onWeight = {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'weight' as const,
    }
    const nextField = getNextKeypadTarget(onWeight, sets, weightRepsFields)

    assert.deepEqual(nextField, {
      exerciseId: 'ex-1',
      setNumber: 1,
      field: 'reps',
    })
    assert.equal(
      shouldCompleteSetOnKeypadNext(
        onWeight,
        nextField,
        sets[0],
        weightRepsFields
      ),
      false
    )

    sets[0]!.reps = ''
    assert.equal(
      shouldCompleteSetOnKeypadNext(onReps, nextSet, sets[0], weightRepsFields),
      false
    )
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

  it('copies previous session values for a set', () => {
    assert.deepEqual(
      getPreviousSessionCopyValuesForSet(
        2,
        { 1: { weight: 135, reps: 5 }, 2: { weight: 140, reps: 5 } },
        weightRepsFields
      ),
      { weight: '140', reps: '5' }
    )

    assert.deepEqual(
      getPreviousSessionCopyValuesForSet(3, { 1: { weight: 135, reps: 5 } }, weightRepsFields),
      { weight: '135', reps: '5' }
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

describe('getKeypadFieldLabel', () => {
  it('returns human-readable field names', () => {
    assert.equal(getKeypadFieldLabel('weight'), 'Weight')
    assert.equal(getKeypadFieldLabel('reps'), 'Reps')
    assert.equal(getKeypadFieldLabel('durationSeconds'), 'Time')
  })
})
