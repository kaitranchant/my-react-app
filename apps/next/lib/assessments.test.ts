import assert from 'node:assert/strict'
import test from 'node:test'

import {
  attachDeltasToAssessment,
  clientHasAssessmentRecord,
  computeResultDelta,
  formatAssessmentDelta,
  formatAssessmentScore,
  getAssessmentScoreDetails,
  getNumericScore,
  parseAssessmentRubricConfig,
} from '@/lib/assessments'
import type {
  ClientAssessmentResult,
  ClientAssessmentWithResults,
} from 'app/types/database'
import {
  defaultRubricConfig,
  parseRubricConfig,
  saveClientAssessmentSchema,
} from '@/lib/validations/assessment'
import { hasAssessmentRecord } from '@/lib/client-onboarding'

function makeResult(
  overrides: Partial<ClientAssessmentResult> &
    Pick<ClientAssessmentResult, 'item_name' | 'rubric_type'>
): ClientAssessmentResult {
  return {
    id: overrides.id ?? 'result-1',
    assessment_id: overrides.assessment_id ?? 'assessment-1',
    assessment_item_id: overrides.assessment_item_id ?? 'item-1',
    item_name: overrides.item_name,
    item_category: overrides.item_category ?? 'mobility',
    rubric_type: overrides.rubric_type,
    rubric_config: overrides.rubric_config ?? defaultRubricConfig(overrides.rubric_type),
    scale_score: overrides.scale_score ?? null,
    pass_fail: overrides.pass_fail ?? null,
    measurement_value: overrides.measurement_value ?? null,
    measurement_unit: overrides.measurement_unit ?? null,
    score_data: overrides.score_data ?? {},
    notes: overrides.notes ?? null,
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at ?? '2026-07-01T12:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-07-01T12:00:00.000Z',
  }
}

test('parses scale rubric config defaults', () => {
  const config = parseAssessmentRubricConfig('scale', {
    min: 0,
    max: 3,
    labels: ['A', 'B', 'C', 'D'],
  })
  assert.equal(config.min, 0)
  assert.equal(config.max, 3)
  assert.deepEqual(config.labels, ['A', 'B', 'C', 'D'])
})

test('formats scale, pass/fail, and measurement scores', () => {
  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'Overhead squat',
        rubric_type: 'scale',
        scale_score: 2,
        rubric_config: {
          min: 0,
          max: 3,
          labels: ['Pain', 'Major', 'Minor', 'Perfect'],
        },
      })
    ),
    '2/3 · Minor'
  )

  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'Thomas test',
        rubric_type: 'pass_fail',
        pass_fail: false,
        rubric_config: { passLabel: 'Clear', failLabel: 'Tight' },
      })
    ),
    'Tight'
  )

  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'Vertical jump',
        rubric_type: 'measurement',
        measurement_value: 22.5,
        measurement_unit: 'in',
      })
    ),
    '22.5 in'
  )
})

test('computes numeric deltas for matching items', () => {
  const current = makeResult({
    item_name: 'Push-up max reps',
    rubric_type: 'measurement',
    measurement_value: 30,
    assessment_item_id: 'pushups',
  })
  const previous = makeResult({
    id: 'result-0',
    item_name: 'Push-up max reps',
    rubric_type: 'measurement',
    measurement_value: 24,
    assessment_item_id: 'pushups',
  })

  assert.equal(computeResultDelta(current, previous), 6)
  assert.equal(getNumericScore(current), 30)

  const delta = formatAssessmentDelta(6, 'measurement', true)
  assert.equal(delta?.direction, 'up')
  assert.equal(delta?.label, '+6')
})

test('attaches deltas against the previous session', () => {
  const previous: ClientAssessmentWithResults = {
    id: 'a1',
    client_id: 'c1',
    coach_id: 'coach',
    title: 'Baseline',
    assessed_at: '2026-06-01T12:00:00.000Z',
    overall_notes: null,
    source: 'manual',
    created_at: '2026-06-01T12:00:00.000Z',
    updated_at: '2026-06-01T12:00:00.000Z',
    results: [
      {
        ...makeResult({
          id: 'r1',
          item_name: 'Overhead squat',
          rubric_type: 'scale',
          scale_score: 1,
          assessment_item_id: 'ohs',
        }),
        media: [],
      },
    ],
  }

  const current: ClientAssessmentWithResults = {
    ...previous,
    id: 'a2',
    assessed_at: '2026-07-01T12:00:00.000Z',
    results: [
      {
        ...makeResult({
          id: 'r2',
          item_name: 'Overhead squat',
          rubric_type: 'scale',
          scale_score: 3,
          assessment_item_id: 'ohs',
        }),
        media: [],
      },
    ],
  }

  const withDeltas = attachDeltasToAssessment(current, previous)
  assert.equal(withDeltas.results[0]?.delta, 2)
  assert.ok(withDeltas.results[0]?.previousScoreLabel?.includes('1/3'))
})

test('validates save payload for mixed rubrics', () => {
  const parsed = saveClientAssessmentSchema.safeParse({
    clientId: '11111111-1111-4111-8111-111111111111',
    source: 'onboarding',
    overallNotes: 'Solid session',
    results: [
      {
        clientKey: 'local-1',
        assessmentItemId: '22222222-2222-4222-8222-222222222222',
        itemName: 'Overhead squat',
        itemCategory: 'mobility',
        rubricType: 'scale',
        rubricConfig: defaultRubricConfig('scale'),
        scaleScore: 2,
        notes: 'Heels up',
      },
      {
        clientKey: 'local-2',
        itemName: 'Thomas test',
        itemCategory: 'mobility',
        rubricType: 'pass_fail',
        rubricConfig: defaultRubricConfig('pass_fail'),
        passFail: true,
      },
      {
        clientKey: 'local-3',
        itemName: 'Vertical jump',
        itemCategory: 'power',
        rubricType: 'measurement',
        rubricConfig: { unit: 'in', higherIsBetter: true },
        measurementValue: 20,
        measurementUnit: 'in',
      },
    ],
  })

  assert.equal(parsed.success, true)
})

test('formats bilateral, checklist, multi-field, and questionnaire scores', () => {
  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'Hurdle step',
        rubric_type: 'scale',
        scale_score: 1,
        rubric_config: {
          min: 0,
          max: 3,
          bilateral: true,
          labels: ['Pain', 'Cannot complete', 'Compensation', 'Perfect'],
        },
        score_data: { left: 1, right: 2 },
      })
    ),
    'L 1 · R 2'
  )

  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'Anterior view',
        rubric_type: 'pass_fail',
        pass_fail: false,
        rubric_config: {
          passLabel: 'Clear',
          failLabel: 'Deviations',
          observations: ['head_tilt', 'asymmetry'],
        },
        score_data: {
          observations: { head_tilt: true, asymmetry: false },
        },
      })
    ),
    '1 deviation'
  )

  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'Blood pressure',
        rubric_type: 'measurement',
        measurement_value: 120,
        measurement_unit: 'mmHg',
        rubric_config: {
          unit: 'mmHg',
          fields: [
            { key: 'systolic', label: 'Systolic', unit: 'mmHg' },
            { key: 'diastolic', label: 'Diastolic', unit: 'mmHg' },
          ],
        },
        score_data: { fields: { systolic: 120, diastolic: 80 } },
      })
    ),
    'Systolic 120 mmHg · Diastolic 80 mmHg'
  )

  assert.equal(
    formatAssessmentScore(
      makeResult({
        item_name: 'PAR-Q+',
        rubric_type: 'questionnaire',
        rubric_config: {
          mode: 'multi_yes_no',
          escalateOnYes: true,
          questions: [{ id: 'q1', text: 'Heart condition?' }],
        },
        score_data: { answers: { q1: false }, escalated: false },
      })
    ),
    'All clear'
  )
})

test('exposes questionnaire and injury detail lines for history', () => {
  const parq = getAssessmentScoreDetails(
    makeResult({
      item_name: 'PAR-Q+',
      rubric_type: 'questionnaire',
      rubric_config: {
        mode: 'multi_yes_no',
        questions: [
          { id: 'q1', text: 'Heart condition?' },
          { id: 'q2', text: 'Chest pain with activity?' },
        ],
      },
      score_data: { answers: { q1: false, q2: true }, escalated: true },
    })
  )
  assert.deepEqual(parq, [
    { label: 'Heart condition?', value: 'No', tone: 'muted' },
    { label: 'Chest pain with activity?', value: 'Yes', tone: 'alert' },
  ])

  const injury = getAssessmentScoreDetails(
    makeResult({
      item_name: 'Injury history',
      rubric_type: 'questionnaire',
      rubric_config: defaultRubricConfig('questionnaire'),
      score_data: { yesNo: true, text: 'Old ACL tear' },
    })
  )
  assert.equal(injury.some((row) => row.value === 'Yes'), true)
  assert.equal(
    injury.some((row) => row.label === 'Details' && row.value === 'Old ACL tear'),
    true
  )
})

test('validates bilateral and questionnaire payloads', () => {
  const bilateral = saveClientAssessmentSchema.safeParse({
    clientId: '11111111-1111-4111-8111-111111111111',
    results: [
      {
        clientKey: 'local-1',
        itemName: 'Grip strength',
        itemCategory: 'strength',
        rubricType: 'measurement',
        rubricConfig: { unit: 'kg', bilateral: true, higherIsBetter: true },
        scoreData: { left: 42, right: 40 },
      },
    ],
  })
  assert.equal(bilateral.success, true)

  const questionnaire = saveClientAssessmentSchema.safeParse({
    clientId: '11111111-1111-4111-8111-111111111111',
    results: [
      {
        clientKey: 'local-2',
        itemName: 'Injury history',
        itemCategory: 'health_intake',
        rubricType: 'questionnaire',
        rubricConfig: defaultRubricConfig('questionnaire'),
        scoreData: { yesNo: true, text: 'Old ACL' },
      },
    ],
  })
  assert.equal(questionnaire.success, true)
})

test('rejects scale scores outside rubric range', () => {
  const config = parseRubricConfig('scale', { min: 0, max: 3 })
  assert.equal(config.success, true)

  const parsed = saveClientAssessmentSchema.safeParse({
    clientId: '11111111-1111-4111-8111-111111111111',
    results: [
      {
        clientKey: 'local-1',
        itemName: 'Overhead squat',
        itemCategory: 'mobility',
        rubricType: 'scale',
        rubricConfig: { min: 0, max: 3 },
        scaleScore: 5,
      },
    ],
  })

  assert.equal(parsed.success, false)
})

test('assessment milestone helpers recognize structured sessions', () => {
  assert.equal(
    clientHasAssessmentRecord({ legacyNotes: null, assessmentCount: 1 }),
    true
  )
  assert.equal(
    hasAssessmentRecord({
      legacyNotes: 'Imported notes',
      assessmentCount: 0,
    }),
    true
  )
  assert.equal(
    hasAssessmentRecord({ legacyNotes: null, assessmentCount: 0 }),
    false
  )
})
