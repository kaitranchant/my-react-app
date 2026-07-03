export type MobileKeyboardMode = 'text' | 'numeric' | 'decimal' | 'email' | 'tel'

const NATIVE_ONLY_TYPES = new Set([
  'password',
  'file',
  'date',
  'time',
  'checkbox',
  'radio',
  'hidden',
  'color',
  'range',
  'submit',
  'button',
  'reset',
])

export function shouldUseNativeKeyboardType(type?: string) {
  if (!type) return false
  return NATIVE_ONLY_TYPES.has(type)
}

export function resolveKeyboardMode({
  type,
  inputMode,
  autoComplete,
  multiline = false,
  name,
  id,
}: {
  type?: string
  inputMode?: string
  autoComplete?: string
  multiline?: boolean
  name?: string
  id?: string
}): MobileKeyboardMode {
  if (type === 'email' || autoComplete === 'email') {
    return 'email'
  }

  if (isPhoneField({ type, inputMode, autoComplete, name, id })) {
    return 'tel'
  }

  if (type === 'number' || inputMode === 'numeric') {
    return 'numeric'
  }

  if (inputMode === 'decimal') {
    return 'decimal'
  }

  if (multiline) {
    return 'text'
  }

  return 'text'
}

function isPhoneField({
  type,
  inputMode,
  autoComplete,
  name,
  id,
}: {
  type?: string
  inputMode?: string
  autoComplete?: string
  name?: string
  id?: string
}) {
  if (type === 'tel' || inputMode === 'tel') return true
  if (autoComplete?.startsWith('tel')) return true

  const hint = `${name ?? ''} ${id ?? ''}`.toLowerCase()
  return /\b(phone|tel|mobile|fax)\b/.test(hint)
}

const TEL_CHARS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '(', ')', '-', ' '])

export function appendKeyboardChar(
  current: string,
  char: string,
  mode: MobileKeyboardMode
) {
  if (mode === 'tel' && !TEL_CHARS.has(char)) {
    return current
  }

  if (char === '.' && mode === 'decimal') {
    if (current.includes('.')) return current
    return current ? `${current}.` : '0.'
  }

  if (mode === 'numeric' || mode === 'decimal') {
    if (char === '.' && mode === 'numeric') return current
    if (char === '0' && current === '0' && !current.includes('.')) {
      return current
    }
  }

  return `${current}${char}`
}

export function backspaceKeyboardValue(current: string) {
  return current.slice(0, -1)
}
