export function lastNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/).filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

export function compareFullNamesByLastName(a: string, b: string): number {
  const lastCompare = lastNameFromFullName(a).localeCompare(
    lastNameFromFullName(b),
    undefined,
    { sensitivity: 'base' }
  )

  if (lastCompare !== 0) return lastCompare

  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortByLastName<T>(
  items: T[],
  getName: (item: T) => string
): T[] {
  return [...items].sort((a, b) =>
    compareFullNamesByLastName(getName(a), getName(b))
  )
}
