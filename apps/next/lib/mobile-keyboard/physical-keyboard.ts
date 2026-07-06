const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Tab',
  'ContextMenu',
  'OS',
])

export function isLikelyPhysicalKey(event: Pick<KeyboardEvent, 'key' | 'isComposing'>) {
  if (event.isComposing) {
    return false
  }

  const key = event.key
  if (!key || key === 'Unidentified') {
    return false
  }

  if (MODIFIER_KEYS.has(key)) {
    return false
  }

  return true
}

export function hasAnyFinePointer() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(any-pointer: fine)').matches
}
