import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatFormReviewTimestamp,
  hasFormReviewCoachReply,
  parseCoachAnnotations,
  sortFormReviewAnnotations,
} from './form-reviews'
import { formReviewFeedbackSchema } from './validations/form-review'

test('parseCoachAnnotations returns an empty array for invalid values', () => {
  assert.deepEqual(parseCoachAnnotations(null), [])
  assert.deepEqual(parseCoachAnnotations('note'), [])
})

test('parseCoachAnnotations parses and sorts valid annotations', () => {
  assert.deepEqual(
    parseCoachAnnotations([
      { id: 'b', timestampSeconds: 42, text: 'Depth looks good' },
      { id: 'a', timestampSeconds: 12, text: '  Brace harder  ' },
      { id: 'c', timestampSeconds: 12, text: '' },
    ]),
    [
      { id: 'a', timestampSeconds: 12, text: 'Brace harder' },
      { id: 'b', timestampSeconds: 42, text: 'Depth looks good' },
    ]
  )
})

test('formatFormReviewTimestamp formats seconds as m:ss', () => {
  assert.equal(formatFormReviewTimestamp(0), '0:00')
  assert.equal(formatFormReviewTimestamp(65), '1:05')
  assert.equal(formatFormReviewTimestamp(605), '10:05')
})

test('hasFormReviewCoachReply detects text feedback or annotations', () => {
  assert.equal(
    hasFormReviewCoachReply({
      coach_feedback: 'Nice work',
      coach_annotations: [],
    }),
    true
  )

  assert.equal(
    hasFormReviewCoachReply({
      coach_feedback: null,
      coach_annotations: [{ id: 'a', timestampSeconds: 1, text: 'Keep chest up' }],
    }),
    true
  )

  assert.equal(
    hasFormReviewCoachReply({
      coach_feedback: '   ',
      coach_annotations: [],
    }),
    false
  )
})

test('formReviewFeedbackSchema accepts feedback with timestamped annotations', () => {
  const parsed = formReviewFeedbackSchema.parse({
    coachFeedback: 'Overall solid set.',
    coachAnnotations: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        timestampSeconds: 15.2,
        text: 'Sit back a little more',
      },
    ],
  })

  assert.equal(parsed.coachAnnotations.length, 1)
  assert.equal(
    sortFormReviewAnnotations(parsed.coachAnnotations)[0]?.text,
    'Sit back a little more'
  )
})
