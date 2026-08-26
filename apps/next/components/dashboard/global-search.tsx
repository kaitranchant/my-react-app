'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Dumbbell,
  Loader2,
  Search,
  Users,
  UtensilsCrossed,
} from 'lucide-react'

import {
  mergeSearchResults,
  searchLoadedIndex,
  type GlobalSearchIndex,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from '@/lib/global-search'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const GROUP_LABELS: Record<GlobalSearchResultType, string> = {
  client: 'Users',
  workout: 'Workouts',
  program: 'Programs',
  exercise: 'Exercises',
  meal_plan: 'Meal plans',
}

const GROUP_ORDER: GlobalSearchResultType[] = [
  'client',
  'workout',
  'program',
  'exercise',
  'meal_plan',
]

const TYPE_ICONS: Record<
  GlobalSearchResultType,
  React.ComponentType<{ className?: string }>
> = {
  client: Users,
  workout: Dumbbell,
  program: ClipboardList,
  exercise: Dumbbell,
  meal_plan: UtensilsCrossed,
}

const INDEX_TTL_MS = 60_000
const EXERCISE_SEARCH_MIN_LENGTH = 2

let cachedIndex: { value: GlobalSearchIndex; at: number } | null = null
let indexInFlight: Promise<GlobalSearchIndex> | null = null

function getSearchShortcutLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)) {
    return '⌘ K'
  }
  return 'Ctrl K'
}

function groupResults(results: GlobalSearchResult[]) {
  const grouped = new Map<GlobalSearchResultType, GlobalSearchResult[]>()

  for (const type of GROUP_ORDER) {
    grouped.set(type, [])
  }

  for (const result of results) {
    grouped.get(result.type)?.push(result)
  }

  return GROUP_ORDER.flatMap((type) => {
    const items = grouped.get(type) ?? []
    return items.length > 0 ? [{ type, items }] : []
  })
}

async function fetchSearchIndex() {
  const response = await fetch('/api/search/index', { cache: 'no-store' })
  const payload = (await response.json()) as
    | { ok: true; index: GlobalSearchIndex }
    | { ok: false; error?: string }

  if (!response.ok || !payload.ok) {
    throw new Error(
      !payload.ok ? payload.error ?? 'Could not load search.' : 'Could not load search.'
    )
  }

  return payload.index
}

function loadSearchIndex(options?: { force?: boolean }) {
  if (
    !options?.force &&
    cachedIndex &&
    Date.now() - cachedIndex.at < INDEX_TTL_MS
  ) {
    return Promise.resolve(cachedIndex.value)
  }

  if (!options?.force && indexInFlight) return indexInFlight

  indexInFlight = fetchSearchIndex()
    .then((index) => {
      cachedIndex = { value: index, at: Date.now() }
      return index
    })
    .finally(() => {
      indexInFlight = null
    })

  if (cachedIndex && !options?.force) {
    return Promise.resolve(cachedIndex.value)
  }

  return indexInFlight
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [index, setIndex] = React.useState<GlobalSearchIndex | null>(
    cachedIndex?.value ?? null
  )
  const [exerciseResults, setExerciseResults] = React.useState<
    GlobalSearchResult[]
  >([])
  const [indexError, setIndexError] = React.useState<string | null>(null)
  const [loadingIndex, setLoadingIndex] = React.useState(!cachedIndex)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k') return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      setOpen((current) => !current)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    loadSearchIndex()
      .then((nextIndex) => {
        if (cancelled) return
        setIndex(nextIndex)
        setIndexError(null)
        setLoadingIndex(false)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setIndexError(
          error instanceof Error ? error.message : 'Could not load search.'
        )
        setLoadingIndex(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQuery('')
      setExerciseResults([])
      return
    }

    void loadSearchIndex({ force: !cachedIndex })
  }, [open])

  React.useEffect(() => {
    const trimmed = query.trim()
    if (!open || trimmed.length < EXERCISE_SEARCH_MIN_LENGTH) {
      setExerciseResults([])
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/exercises?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, cache: 'no-store' }
        )
        const payload = (await response.json()) as
          | { ok: true; results: GlobalSearchResult[] }
          | { ok: false }

        if (!response.ok || !payload.ok) return
        setExerciseResults(payload.results)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }, 100)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [open, query])

  function handleSelect(href: string) {
    setOpen(false)
    router.push(href)
  }

  const trimmedQuery = query.trim()
  const localResults = index ? searchLoadedIndex(index, trimmedQuery) : []
  const results = mergeSearchResults(localResults, exerciseResults)
  const groupedResults = groupResults(results)
  const hasQuery = trimmedQuery.length > 0
  const shortcutLabel = getSearchShortcutLabel()
  const waitingForIndex = hasQuery && loadingIndex && !index

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-muted-foreground hidden h-9 w-full max-w-sm justify-start gap-2 px-3 font-normal sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search clients, workouts, programs…</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto hidden rounded border px-1.5 py-0.5 text-[10px] font-medium lg:inline-block">
          {shortcutLabel}
        </kbd>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="sm:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search clients, workouts, programs, exercises, and meal plans"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Search clients, workouts, programs, exercises, meal plans…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {indexError && !index ? (
            <div className="text-destructive px-4 py-8 text-center text-sm">
              {indexError}
            </div>
          ) : !hasQuery ? (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              Start typing to search your library and clients.
            </div>
          ) : waitingForIndex ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : groupedResults.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            groupedResults.map((group, groupIndex) => {
              const Icon = TYPE_ICONS[group.type]

              return (
                <React.Fragment key={group.type}>
                  {groupIndex > 0 && <CommandSeparator />}
                  <CommandGroup heading={GROUP_LABELS[group.type]}>
                    {group.items.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result.href)}
                      >
                        <Icon className="text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-muted-foreground truncate text-xs">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </React.Fragment>
              )
            })
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
