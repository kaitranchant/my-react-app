export function getBrowserTimeZone(): string | undefined {
  if (typeof Intl === 'undefined') return undefined

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}
