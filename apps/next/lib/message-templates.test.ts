import assert from 'node:assert/strict'
import test from 'node:test'

import { applyMessageTemplateVariables } from '@/lib/message-templates'

test('applyMessageTemplateVariables replaces clientName placeholder', () => {
  const result = applyMessageTemplateVariables(
    'Hey {{clientName}}, great work this week!',
    { clientName: 'Alex' }
  )

  assert.equal(result, 'Hey Alex, great work this week!')
})

test('applyMessageTemplateVariables leaves body unchanged without placeholders', () => {
  const body = 'Thanks for checking in.'
  const result = applyMessageTemplateVariables(body, { clientName: 'Alex' })

  assert.equal(result, body)
})
