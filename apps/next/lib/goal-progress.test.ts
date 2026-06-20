import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeCompositionProgress,
  formatCompositionGoalLabel,
  formatDailyTargetLabel,
  getInbodyBaselineAndCurrent,
  resolveCompositionGoalTitle,
} from './goal-progress'
import { compositionGoalFormSchema, clientGoalToFormValues } from './validations/client-goal'
import type { ClientGoal, ClientInbodyScan } from 'app/types/database'

function makeScan(
  overrides: Partial<ClientInbodyScan> & Pick<ClientInbodyScan, 'scan_date' | 'weight_lbs'>
): ClientInbodyScan {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    client_id: 'client-1',
    coach_id: 'coach-1',
    skeletal_muscle_mass_lbs: 80,
    percent_body_fat: 20,
    total_body_water_lbs: null,
    dry_lean_mass_lbs: null,
    body_fat_mass_lbs: null,
    bmi: null,
    lean_body_mass_lbs: null,
    basal_metabolic_rate_kcal: null,
    skeletal_muscle_index: null,
    notes: null,
    submitted_by: 'coach',
    created_at: overrides.scan_date,
    updated_at: overrides.scan_date,
    ...overrides,
  }
}

function makeCompositionGoal(
  overrides: Partial<ClientGoal> = {}
): ClientGoal {
  return {
    id: 'goal-1',
    client_id: 'client-1',
    coach_id: 'coach-1',
    category: 'composition',
    metric: 'weight_lbs',
    direction: 'decrease',
    target_amount: 20,
    title: null,
    target_value: null,
    comparison: null,
    unit: 'lbs',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

test('getInbodyBaselineAndCurrent uses earliest and latest scan dates', () => {
  const scans = [
    makeScan({ id: 'b', scan_date: '2026-02-01T00:00:00.000Z', weight_lbs: 175 }),
    makeScan({ id: 'a', scan_date: '2026-01-01T00:00:00.000Z', weight_lbs: 180 }),
    makeScan({ id: 'c', scan_date: '2026-03-01T00:00:00.000Z', weight_lbs: 170 }),
  ]

  const pair = getInbodyBaselineAndCurrent(scans)
  assert.ok(pair)
  assert.equal(pair.baseline.id, 'a')
  assert.equal(pair.current.id, 'c')
})

test('computeCompositionProgress calculates decrease goal percentage', () => {
  const goal = makeCompositionGoal()
  const scans = [
    makeScan({ id: 'baseline', scan_date: '2026-01-01T00:00:00.000Z', weight_lbs: 180 }),
    makeScan({ id: 'current', scan_date: '2026-02-01T00:00:00.000Z', weight_lbs: 175 }),
  ]

  const progress = computeCompositionProgress(goal, scans)
  assert.equal(progress.percent, 25)
  assert.equal(progress.change, 5)
  assert.equal(progress.status, 'on_track')
})

test('computeCompositionProgress returns awaiting_scan with no scans', () => {
  const progress = computeCompositionProgress(makeCompositionGoal(), [])
  assert.equal(progress.status, 'awaiting_scan')
  assert.equal(progress.percent, 0)
})

test('computeCompositionProgress returns no_change with one scan', () => {
  const scans = [
    makeScan({ id: 'only', scan_date: '2026-01-01T00:00:00.000Z', weight_lbs: 180 }),
  ]
  const progress = computeCompositionProgress(makeCompositionGoal(), scans)
  assert.equal(progress.percent, 0)
  assert.equal(progress.status, 'no_change')
  assert.match(progress.hint ?? '', /one scan/i)
})

test('computeCompositionProgress clamps over-100% progress', () => {
  const scans = [
    makeScan({ id: 'baseline', scan_date: '2026-01-01T00:00:00.000Z', weight_lbs: 180 }),
    makeScan({ id: 'current', scan_date: '2026-02-01T00:00:00.000Z', weight_lbs: 150 }),
  ]
  const progress = computeCompositionProgress(makeCompositionGoal(), scans)
  assert.equal(progress.percent, 100)
  assert.match(progress.hint ?? '', /reached/i)
})

test('computeCompositionProgress handles wrong-direction movement', () => {
  const scans = [
    makeScan({ id: 'baseline', scan_date: '2026-01-01T00:00:00.000Z', weight_lbs: 180 }),
    makeScan({ id: 'current', scan_date: '2026-02-01T00:00:00.000Z', weight_lbs: 182 }),
  ]
  const progress = computeCompositionProgress(makeCompositionGoal(), scans)
  assert.equal(progress.percent, 0)
  assert.equal(progress.status, 'off_track')
})

test('computeCompositionProgress calculates increase goal percentage', () => {
  const goal = makeCompositionGoal({
    metric: 'skeletal_muscle_mass_lbs',
    direction: 'increase',
    target_amount: 10,
    unit: 'lbs',
  })
  const scans = [
    makeScan({
      id: 'baseline',
      scan_date: '2026-01-01T00:00:00.000Z',
      weight_lbs: 180,
      skeletal_muscle_mass_lbs: 80,
    }),
    makeScan({
      id: 'current',
      scan_date: '2026-02-01T00:00:00.000Z',
      weight_lbs: 182,
      skeletal_muscle_mass_lbs: 83,
    }),
  ]

  const progress = computeCompositionProgress(goal, scans)
  assert.equal(progress.percent, 30)
  assert.equal(progress.change, 3)
})

test('formatCompositionGoalLabel auto-generates weight loss label', () => {
  assert.equal(
    formatCompositionGoalLabel(makeCompositionGoal()),
    'Lose 20.0 lbs'
  )
})

test('formatDailyTargetLabel formats at least and at most targets', () => {
  assert.equal(
    formatDailyTargetLabel({
      ...makeCompositionGoal(),
      category: 'daily',
      title: 'Steps',
      target_value: 10000,
      comparison: 'at_least',
      unit: 'steps',
      metric: null,
      direction: null,
      target_amount: null,
    }),
    'Steps: at least 10000 steps'
  )

  assert.equal(
    formatDailyTargetLabel({
      ...makeCompositionGoal(),
      category: 'daily',
      title: 'Calories',
      target_value: 2000,
      comparison: 'at_most',
      unit: 'kcal',
      metric: null,
      direction: null,
      target_amount: null,
    }),
    'Calories: under 2000 calories'
  )
})

test('compositionGoalFormSchema accepts null or empty title', () => {
  assert.ok(
    compositionGoalFormSchema.safeParse({
      category: 'composition',
      metric: 'percent_body_fat',
      direction: 'decrease',
      targetAmount: 5,
      title: null,
    }).success
  )

  assert.ok(
    compositionGoalFormSchema.safeParse({
      category: 'composition',
      metric: 'percent_body_fat',
      direction: 'decrease',
      targetAmount: 5,
      title: '',
    }).success
  )
})

test('clientGoalToFormValues round-trips composition and daily goals', () => {
  const composition = clientGoalToFormValues(
    makeCompositionGoal({
      metric: 'weight_lbs',
      direction: 'decrease',
      target_amount: 15,
      title: 'Cut phase',
    })
  )
  assert.equal(composition.category, 'composition')
  if (composition.category === 'composition') {
    assert.equal(composition.metric, 'weight_lbs')
    assert.equal(composition.targetAmount, 15)
    assert.equal(composition.title, 'Cut phase')
  }

  const daily = clientGoalToFormValues({
    ...makeCompositionGoal(),
    id: 'daily-1',
    category: 'daily',
    metric: null,
    direction: null,
    target_amount: null,
    title: 'Water',
    target_value: 64,
    comparison: 'at_least',
    unit: 'oz',
  })
  assert.equal(daily.category, 'daily')
  if (daily.category === 'daily') {
    assert.equal(daily.title, 'Water')
    assert.equal(daily.targetValue, 64)
    assert.equal(daily.unit, 'oz')
  }
})

test('resolveCompositionGoalTitle falls back to metric label', () => {
  assert.equal(
    resolveCompositionGoalTitle('percent_body_fat', null),
    'Body fat'
  )
  assert.equal(
    resolveCompositionGoalTitle('percent_body_fat', '  '),
    'Body fat'
  )
  assert.equal(
    resolveCompositionGoalTitle('percent_body_fat', 'Custom goal'),
    'Custom goal'
  )
})
