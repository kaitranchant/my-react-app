'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import {
  getExerciseCatalogConfig,
  importExerciseFromCatalog,
  searchExerciseCatalog,
} from '@/app/(dashboard)/library/exercises/catalog-actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExerciseDbExercise } from '@/lib/exercisedb'
import { exerciseDbImageUrl } from '@/lib/exercisedb'
import { EXERCISEDB_CATALOG_PAGE_SIZE } from '@/lib/constants'

type ExerciseCatalogBrowserProps = {
  importedIds: string[]
}

const ALL = '__all__'

export function ExerciseCatalogBrowser({
  importedIds: initialImportedIds,
}: ExerciseCatalogBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [importedIds, setImportedIds] = React.useState(
    () => new Set(initialImportedIds)
  )
  const [configured, setConfigured] = React.useState<boolean | null>(null)
  const [bodyParts, setBodyParts] = React.useState<string[]>([])
  const [equipmentOptions, setEquipmentOptions] = React.useState<string[]>([])
  const [targets, setTargets] = React.useState<string[]>([])
  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [loadingResults, setLoadingResults] = React.useState(false)
  const [results, setResults] = React.useState<ExerciseDbExercise[]>([])
  const [offset, setOffset] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
  const [bodyPart, setBodyPart] = React.useState(
    searchParams.get('bodyPart') ?? ALL
  )
  const [equipment, setEquipment] = React.useState(
    searchParams.get('equipment') ?? ALL
  )
  const [target, setTarget] = React.useState(
    searchParams.get('target') ?? ALL
  )

  React.useEffect(() => {
    setImportedIds(new Set(initialImportedIds))
  }, [initialImportedIds])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingConfig(true)
      const result = await getExerciseCatalogConfig()
      if (cancelled) return
      setLoadingConfig(false)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setConfigured(result.data.configured)
      setBodyParts(result.data.bodyParts)
      setEquipmentOptions(result.data.equipment)
      setTargets(result.data.targets)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const runSearch = React.useCallback(
    async (nextOffset: number) => {
      setLoadingResults(true)
      const result = await searchExerciseCatalog({
        query: query.trim() || undefined,
        bodyPart: bodyPart === ALL ? undefined : bodyPart,
        equipment: equipment === ALL ? undefined : equipment,
        target: target === ALL ? undefined : target,
        offset: nextOffset,
      })
      setLoadingResults(false)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setResults(result.data.exercises)
      setOffset(result.data.offset)
      setHasMore(result.data.hasMore)
    },
    [query, bodyPart, equipment, target]
  )

  React.useEffect(() => {
    if (!configured) return
    void runSearch(0)
  }, [configured, runSearch])

  function updateUrl() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'catalog')
    if (query.trim()) params.set('q', query.trim())
    else params.delete('q')
    if (bodyPart !== ALL) params.set('bodyPart', bodyPart)
    else params.delete('bodyPart')
    if (equipment !== ALL) params.set('equipment', equipment)
    else params.delete('equipment')
    if (target !== ALL) params.set('target', target)
    else params.delete('target')
    router.replace(`/library/exercises?${params.toString()}`)
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    updateUrl()
    await runSearch(0)
  }

  async function handleImport(externalId: string) {
    setPendingId(externalId)
    const result = await importExerciseFromCatalog(externalId)
    setPendingId(null)

    if (result.success) {
      setImportedIds((prev) => new Set(prev).add(externalId))
      toast.success('Exercise added to your library')
      router.refresh()
      return
    }

    if (result.alreadyImported) {
      setImportedIds((prev) => new Set(prev).add(externalId))
    }
    toast.error(result.error)
  }

  if (loadingConfig) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading ExerciseDB catalog…
        </CardContent>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Connect ExerciseDB</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          <p>
            Browse and import exercises from ExerciseDB v1 (free RapidAPI tier).
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Subscribe to{' '}
              <a
                href="https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium underline underline-offset-2"
              >
                ExerciseDB on RapidAPI
              </a>{' '}
              (free plan is fine)
            </li>
            <li>Copy your RapidAPI key from the app dashboard</li>
            <li>
              Add to{' '}
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-xs">
                apps/next/.env.local
              </code>
              :
              <pre className="bg-muted text-foreground mt-2 overflow-x-auto rounded-lg p-3 text-xs">
                EXERCISEDB_RAPIDAPI_KEY=your_key_here
              </pre>
            </li>
            <li>Restart the dev server and refresh this page</li>
          </ol>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            Search ExerciseDB
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <form onSubmit={handleSearch} className="grid gap-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, e.g. squat, bench press…"
                className="pl-9"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select value={bodyPart} onValueChange={setBodyPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Body part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All body parts</SelectItem>
                  {bodyParts.map((part) => (
                    <SelectItem key={part} value={part}>
                      {part}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Target muscle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All targets</SelectItem>
                  {targets.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All equipment</SelectItem>
                  {equipmentOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loadingResults}>
                {loadingResults ? 'Searching…' : 'Search'}
              </Button>
              <p className="text-muted-foreground self-center text-xs">
                {EXERCISEDB_CATALOG_PAGE_SIZE} results per page.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {loadingResults ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingResults ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading exercises…
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-6 py-16 text-center text-sm">
              No exercises found. Try a different search or filter.
            </p>
          ) : (
            <ul className="divide-y">
              {results.map((exercise) => {
                const imported = importedIds.has(exercise.id)
                return (
                  <li
                    key={exercise.id}
                    className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="bg-muted size-16 shrink-0 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exerciseDbImageUrl(exercise.id)}
                          alt=""
                          className="size-16 object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{exercise.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {exercise.target} · {exercise.bodyPart} ·{' '}
                          {exercise.equipment}
                        </p>
                        {exercise.description && (
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                            {exercise.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={imported ? 'secondary' : 'default'}
                      disabled={imported || pendingId === exercise.id}
                      onClick={() => handleImport(exercise.id)}
                    >
                      {pendingId === exercise.id ? (
                        'Adding…'
                      ) : imported ? (
                        'In library'
                      ) : (
                        <>
                          <Plus className="size-4" />
                          Add to library
                        </>
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
          {!loadingResults && (offset > 0 || hasMore) && (
            <div className="flex items-center justify-between border-t px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={offset === 0 || loadingResults}
                onClick={() =>
                  runSearch(Math.max(0, offset - EXERCISEDB_CATALOG_PAGE_SIZE))
                }
              >
                Previous
              </Button>
              <span className="text-muted-foreground text-xs">
                Showing {offset + 1}–{offset + results.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasMore || loadingResults}
                onClick={() => runSearch(offset + EXERCISEDB_CATALOG_PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
