import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appendKeyboardChar,
  resolveKeyboardMode,
} from '@/lib/mobile-keyboard/resolve-keyboard-mode'

test('number inputs with decimal input mode show the decimal keypad', () => {
  assert.equal(
    resolveKeyboardMode({ type: 'number', inputMode: 'decimal' }),
    'decimal'
  )
})

test('decimal keypad accepts one decimal point', () => {
  assert.deepEqual(appendKeyboardChar('17', '.', 'decimal'), {
    value: '17.',
    caretIndex: 3,
  })
  assert.deepEqual(appendKeyboardChar('17.5', '.', 'decimal'), {
    value: '17.5',
    caretIndex: 4,
  })
})
