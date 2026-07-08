export const MOBILE_KEYPAD_SELECTOR =
  '[data-mobile-keypad], .mobile-keypad-surface, .workout-log-keypad-surface'

export function isMobileKeyboardOpen() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute('data-mobile-keyboard-open')
  )
}

export function isDocumentFocusTarget(target: EventTarget | null) {
  if (typeof document === 'undefined') {
    return target == null
  }

  return (
    target == null ||
    target === document ||
    target === document.body ||
    target === document.documentElement
  )
}

/** Pure dismiss guard used by sheets/dialogs for keypad interactions. */
export function shouldIgnoreOutsideDismiss(options: {
  keyboardOpen: boolean
  targetIsKeypad: boolean
  targetIsDocumentFocus: boolean
}) {
  if (options.targetIsKeypad) return true
  return options.keyboardOpen && options.targetIsDocumentFocus
}

export function isMobileKeypadInteraction(target: EventTarget | null) {
  const targetIsKeypad =
    target instanceof Element && target.closest(MOBILE_KEYPAD_SELECTOR) != null

  return shouldIgnoreOutsideDismiss({
    keyboardOpen: isMobileKeyboardOpen(),
    targetIsKeypad,
    targetIsDocumentFocus: isDocumentFocusTarget(target),
  })
}
