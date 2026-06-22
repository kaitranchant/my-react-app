const STORAGE_PREFIX = 'coaching-app:filters:'

export function readPersistedFilters(
  pageKey: string
): Record<string, string> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${pageKey}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  } catch {
    return null
  }
}

export function writePersistedFilters(
  pageKey: string,
  filters: Record<string, string>
) {
  if (typeof window === 'undefined') return

  try {
    if (Object.keys(filters).length === 0) {
      localStorage.removeItem(`${STORAGE_PREFIX}${pageKey}`)
      return
    }
    localStorage.setItem(`${STORAGE_PREFIX}${pageKey}`, JSON.stringify(filters))
  } catch {
    // Ignore quota or privacy-mode errors.
  }
}

export function clearPersistedFilters(pageKey: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${STORAGE_PREFIX}${pageKey}`)
}

export function filtersFromSearchParams(
  searchParams: URLSearchParams,
  filterKeys: readonly string[],
  defaultValues: Record<string, string> = {}
): Record<string, string> {
  const filters: Record<string, string> = {}

  for (const key of filterKeys) {
    const value = searchParams.get(key)
    if (!value) continue
    if (value === defaultValues[key]) continue
    filters[key] = value
  }

  return filters
}
