import { rankBySearch } from '@/lib/text-search'

export type GlobalSearchResultType =
  | 'client'
  | 'workout'
  | 'program'
  | 'exercise'
  | 'meal_plan'

export type GlobalSearchResult = {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle?: string
  href: string
}

export type SearchIndexClient = {
  id: string
  full_name: string
  email: string | null
}

export type SearchIndexNamedItem = {
  id: string
  name: string
  description: string | null
}

export type GlobalSearchIndex = {
  clients: SearchIndexClient[]
  workouts: SearchIndexNamedItem[]
  programs: SearchIndexNamedItem[]
  mealPlans: SearchIndexNamedItem[]
}

const RESULT_LIMIT = 8

function namedItemResults(
  type: Extract<GlobalSearchResultType, 'workout' | 'program' | 'meal_plan'>,
  items: readonly SearchIndexNamedItem[],
  query: string,
  hrefFor: (item: SearchIndexNamedItem) => string
): GlobalSearchResult[] {
  return rankBySearch(
    items,
    query,
    (item) => [item.name, item.description ?? ''],
    RESULT_LIMIT
  ).map((item) => ({
    id: item.id,
    type,
    title: item.name,
    subtitle: item.description ?? undefined,
    href: hrefFor(item),
  }))
}

export function searchLoadedIndex(
  index: GlobalSearchIndex,
  query: string
): GlobalSearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  return [
    ...rankBySearch(
      index.clients,
      trimmed,
      (client) => [client.full_name, client.email ?? ''],
      RESULT_LIMIT
    ).map((client) => ({
      id: client.id,
      type: 'client' as const,
      title: client.full_name,
      subtitle: client.email ?? undefined,
      href: `/clients/${client.id}`,
    })),
    ...namedItemResults('workout', index.workouts, trimmed, (workout) =>
      `/library/workouts?q=${encodeURIComponent(workout.name)}`
    ),
    ...namedItemResults(
      'program',
      index.programs,
      trimmed,
      (program) => `/library/programs/${program.id}`
    ),
    ...namedItemResults(
      'meal_plan',
      index.mealPlans,
      trimmed,
      (mealPlan) => `/library/meal-plans/${mealPlan.id}`
    ),
  ]
}

export function mergeSearchResults(
  primary: GlobalSearchResult[],
  extra: GlobalSearchResult[]
) {
  const seen = new Set(primary.map((result) => `${result.type}-${result.id}`))
  const merged = [...primary]

  for (const result of extra) {
    const key = `${result.type}-${result.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(result)
  }

  return merged
}
