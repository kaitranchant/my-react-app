import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeCompositionProgress,
  computeHabitProgress,
  computeMilestoneProgress,
  computePerformanceProgress,
  formatCompositionGoalLabel,
  formatDailyTargetLabel,
  formatGoalTargetDateLabel,
  getDailyTargetCheckInHint,
  getInbodyBaselineAndCurrent,
  resolveCompositionGoalTitle,
} from './goal-progress'
import { computeGoalPace } from './goal-progress-pace'
import { compositionGoalFormSchema, clientGoalToFormValues } from './validations/client-goal'
import type {
  ClientGoal,
  ClientCheckIn,
  ClientInbodyScan,
  ExercisePrRecord,
} from 'app/types/database'

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
    target_date: null,
    exercise_id: null,
    performance_metric: null,
    habit_source: null,
    habit_frequency: null,
    habit_period: null,
    milestone_type: null,
    milestone_target_count: null,
    program_id: null,
    progress_source: 'prefer_inbody',
    metadata: null,
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
  assert.match(progress.hint ?? '', /one measurement/i)
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
  assert.match(progress.hint ?? '', /Weight has increased 2\.0 lbs since starting/)
})

test('computeCompositionProgress explains body fat setbacks in plain language', () => {
  const goal = makeCompositionGoal({
    metric: 'percent_body_fat',
    direction: 'decrease',
    target_amount: 5,
    unit: '%',
  })
  const scans = [
    makeScan({
      id: 'baseline',
      scan_date: '2026-01-01T00:00:00.000Z',
      weight_lbs: 180,
      percent_body_fat: 20,
    }),
    makeScan({
      id: 'current',
      scan_date: '2026-02-01T00:00:00.000Z',
      weight_lbs: 181,
      percent_body_fat: 20.5,
    }),
  ]

  const progress = computeCompositionProgress(goal, scans)
  assert.equal(progress.status, 'off_track')
  assert.match(
    progress.hint ?? '',
    /Body fat has increased 0\.5% since starting/
  )
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
      targetDate: '2026-12-31',
    }).success
  )

  assert.ok(
    compositionGoalFormSchema.safeParse({
      category: 'composition',
      metric: 'percent_body_fat',
      direction: 'decrease',
      targetAmount: 5,
      title: '',
      targetDate: '2026-12-31',
    }).success
  )
})

test('compositionGoalFormSchema requires targetDate', () => {
  const result = compositionGoalFormSchema.safeParse({
    category: 'composition',
    metric: 'percent_body_fat',
    direction: 'decrease',
    targetAmount: 5,
    title: null,
  })

  assert.equal(result.success, false)
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

test('computePerformanceProgress calculates percent from PR weight', () => {
  const goal = makeCompositionGoal({
    category: 'performance',
    metric: null,
    direction: null,
    target_amount: null,
    performance_metric: 'weight',
    exercise_id: 'exercise-1',
    target_value: 225,
    comparison: 'at_least',
    unit: 'lbs',
  })

  const prRecords: ExercisePrRecord[] = [
    {
      id: 'pr-1',
      client_id: 'client-1',
      coach_id: 'coach-1',
      exercise_id: 'exercise-1',
      record_type: 'top_set',
      e1rm: null,
      weight: 200,
      reps: 5,
      session_volume: null,
      scheduled_workout_id: 'workout-1',
      scheduled_exercise_id: 'scheduled-1',
      forced: false,
      achieved_at: '2026-02-01T00:00:00.000Z',
      created_at: '2026-02-01T00:00:00.000Z',
    },
  ]

  const progress = computePerformanceProgress(goal, prRecords)
  assert.equal(progress.percent, 89)
  assert.equal(progress.currentValue, 200)
  assert.equal(progress.status, 'on_track')
})

test('computeHabitProgress counts workouts in week', () => {
  const goal = makeCompositionGoal({
    category: 'habit',
    metric: null,
    direction: null,
    target_amount: null,
    habit_source: 'workouts_per_week',
    habit_frequency: 4,
    habit_period: 'week',
  })

  const workouts = [
    {
      id: '1',
      status: 'completed' as const,
      scheduled_date: new Date().toISOString().slice(0, 10),
      completed_at: new Date().toISOString(),
    },
  ]

  const progress = computeHabitProgress(goal, workouts, [])
  assert.ok(progress.percent >= 0)
  assert.match(progress.detailLine, /workouts this week/i)
})

test('computeMilestoneProgress counts completed sessions since goal created', () => {
  const goal = makeCompositionGoal({
    category: 'milestone',
    metric: null,
    direction: null,
    target_amount: null,
    milestone_type: 'session_count',
    milestone_target_count: 20,
    created_at: '2026-01-01T00:00:00.000Z',
  })

  const workouts = Array.from({ length: 5 }, (_, index) => ({
    id: String(index),
    status: 'completed' as const,
    scheduled_date: '2026-02-01',
    completed_at: '2026-02-01T00:00:00.000Z',
  }))

  const progress = computeMilestoneProgress(goal, workouts)
  assert.equal(progress.currentCount, 5)
  assert.equal(progress.percent, 25)
})

test('computeCompositionProgress uses check-in weight fallback', () => {
  const goal = makeCompositionGoal({
    progress_source: 'check_in',
  })
  const checkIns: ClientCheckIn[] = [
    {
      id: 'ci-1',
      client_id: 'client-1',
      coach_id: 'coach-1',
      check_in_date: '2026-01-01',
      weight: 180,
      sleep_hours: null,
      calm_level: null,
      sleep_quality: null,
      energy_level: null,
      motivation_level: null,
      nutrition_adherence: null,
      soreness_level: null,
      soreness_notes: null,
      has_pain: false,
      pain_notes: null,
      client_notes: null,
      coach_notes: null,
      submitted_by: 'client',
      reviewed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ci-2',
      client_id: 'client-1',
      coach_id: 'coach-1',
      check_in_date: '2026-02-01',
      weight: 175,
      sleep_hours: null,
      calm_level: null,
      sleep_quality: null,
      energy_level: null,
      motivation_level: null,
      nutrition_adherence: null,
      soreness_level: null,
      soreness_notes: null,
      has_pain: false,
      pain_notes: null,
      client_notes: null,
      coach_notes: null,
      submitted_by: 'client',
      reviewed_at: null,
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
    },
  ]

  const progress = computeCompositionProgress(goal, [], checkIns)
  assert.equal(progress.percent, 25)
  assert.equal(progress.status, 'on_track')
})

function daysFromToday(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

test('computeGoalPace estimates completion for decrease-type goals', () => {
  const result = computeGoalPace(
    25,
    daysFromToday(-30),
    daysFromToday(60),
    175,
    160
  )

  assert.ok(result.estimatedCompletionLabel)
  assert.match(result.estimatedCompletionLabel, /At this pace you'll hit your goal by/)
})

test('formatGoalTargetDateLabel formats deadline copy', () => {
  assert.equal(
    formatGoalTargetDateLabel('2026-12-31'),
    new Date('2026-12-31T12:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  )
})

test('getDailyTargetCheckInHint shows latest sleep from check-ins', () => {
  const goal = {
    ...makeCompositionGoal(),
    category: 'daily' as const,
    title: 'Sleep',
    target_value: 8,
    comparison: 'at_least' as const,
    unit: 'hours',
    metric: null,
    direction: null,
    target_amount: null,
  }

  const checkIns: ClientCheckIn[] = [
    {
      id: 'ci-1',
      client_id: 'client-1',
      coach_id: 'coach-1',
      check_in_date: '2026-02-01',
      weight: null,
      sleep_hours: 7.5,
      calm_level: null,
      sleep_quality: null,
      energy_level: null,
      motivation_level: null,
      nutrition_adherence: null,
      soreness_level: null,
      soreness_notes: null,
      has_pain: false,
      pain_notes: null,
      client_notes: null,
      coach_notes: null,
      submitted_by: 'client',
      reviewed_at: null,
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
    },
  ]

  const hint = getDailyTargetCheckInHint(goal, checkIns)
  assert.ok(hint)
  assert.match(hint, /Last logged: 7\.5 hrs/)
  assert.match(hint, /Below target/)
})

test('computePerformanceProgress uses best duration for time goals', () => {
  const goal = makeCompositionGoal({
    category: 'performance',
    metric: null,
    direction: null,
    target_amount: null,
    performance_metric: 'time_seconds',
    exercise_id: 'exercise-1',
    target_value: 300,
    comparison: 'at_most',
    unit: 'sec',
  })

  const progress = computePerformanceProgress(goal, [], {
    'exercise-1': 320,
  })

  assert.equal(progress.currentValue, 320)
  assert.equal(progress.percent, 94)
  assert.equal(progress.status, 'on_track')
})
