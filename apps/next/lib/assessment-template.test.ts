import assert from 'node:assert/strict'
import test from 'node:test'

import { assessmentTemplateFormSchema } from '@/lib/validations/assessment-template'

const ITEM_ONE = '11111111-1111-4111-8111-111111111111'
const ITEM_TWO = '22222222-2222-4222-8222-222222222222'

test('accepts an ordered assessment template test list', () => {
  const parsed = assessmentTemplateFormSchema.safeParse({
    name: 'Initial movement screen',
    description: 'Baseline movement quality tests',
    assessmentItemIds: [ITEM_ONE, ITEM_TWO],
  })

  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.deepEqual(parsed.data.assessmentItemIds, [ITEM_ONE, ITEM_TWO])
  }
})

test('requires tests and rejects duplicate items', () => {
  assert.equal(
    assessmentTemplateFormSchema.safeParse({
      name: 'Empty',
      assessmentItemIds: [],
    }).success,
    false
  )
  assert.equal(
    assessmentTemplateFormSchema.safeParse({
      name: 'Duplicate',
      assessmentItemIds: [ITEM_ONE, ITEM_ONE],
    }).success,
    false
  )
})
