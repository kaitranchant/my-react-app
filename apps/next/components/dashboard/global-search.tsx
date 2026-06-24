'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Dumbbell,
  Loader2,
  Search,
  Users,
} from 'lucide-react'

import {
  globalSearch,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from '@/app/(dashboard)/search/actions'
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
}

const GROUP_ORDER: GlobalSearchResultType[] = [
  'client',
  'workout',
  'program',
  'exercise',
]

const TYPE_ICONS: Record<
  GlobalSearchResultType,
  React.ComponentType<{ className?: string }>
> = {
  client: Users,
  workout: Dumbbell,
  program: ClipboardList,
  exercise: Dumbbell,
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

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
    if (!open) {
      setQuery('')
      setResults([])
      setError(null)
      setLoading(false)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const handle = setTimeout(async () => {
      const response = await globalSearch(trimmed)

      if (response.success) {
        setResults(response.results)
        setError(null)
      } else {
        setResults([])
        setError(response.error)
      }

      setLoading(false)
    }, 300)

    return () => clearTimeout(handle)
  }, [open, query])

  function handleSelect(href: string) {
    setOpen(false)
    router.push(href)
  }

  const groupedResults = groupResults(results)
  const hasQuery = query.trim().length > 0

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
          Ctrl K
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
        description="Search clients, workouts, programs, and exercises"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Search clients, workouts, programs, exercises…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : error ? (
            <div className="text-destructive px-4 py-8 text-center text-sm">
              {error}
            </div>
          ) : !hasQuery ? (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              Start typing to search your library and clients.
            </div>
          ) : groupedResults.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            groupedResults.map((group, index) => {
              const Icon = TYPE_ICONS[group.type]

              return (
                <React.Fragment key={group.type}>
                  {index > 0 && <CommandSeparator />}
                  <CommandGroup heading={GROUP_LABELS[group.type]}>
                    {group.items.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type} ${result.title} ${result.subtitle ?? ''}`}
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
