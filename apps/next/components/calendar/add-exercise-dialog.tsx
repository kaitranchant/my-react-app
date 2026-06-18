'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { addScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { createExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
import {
  ensureCatalogExercise,
  getExerciseCatalogConfig,
  searchExerciseCatalog,
} from '@/app/(dashboard)/library/exercises/catalog-actions'
import {
  CustomExerciseTab,
  customExerciseQuickDefaults,
  customExerciseQuickSchema,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import { ExercisePrescriptionForm } from '@/components/calendar/exercise-prescription-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ExerciseDbExercise } from '@/lib/exercisedb'
import { exerciseDbImageUrl } from '@/lib/exercisedb'
import { EXERCISEDB_CATALOG_PAGE_SIZE } from '@/lib/constants'
import {
  defaultPrescriptionValues,
  scheduledExercisePrescriptionSchema,
  type ScheduledExercisePrescriptionValues,
} from '@/lib/validations/calendar'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'

const ALL = '__all__'

export type CatalogExerciseSelection = {
  externalId: string
  name: string
  target: string
  bodyPart: string
  equipment: string
}

type ExerciseCatalogPickerProps = {
  importedExternalIds: string[]
  selectedExternalId?: string | null
  onSelect: (exercise: CatalogExerciseSelection) => void
  className?: string
  variant?: 'list' | 'grid'
}

export function ExerciseCatalogPicker({
  importedExternalIds,
  selectedExternalId = null,
  onSelect,
  className,
  variant = 'list',
}: ExerciseCatalogPickerProps) {
  const importedSet = React.useMemo(
    () => new Set(importedExternalIds),
    [importedExternalIds]
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
  const [query, setQuery] = React.useState('')
  const [bodyPart, setBodyPart] = React.useState(ALL)
  const [equipment, setEquipment] = React.useState(ALL)
  const [target, setTarget] = React.useState(ALL)

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

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    await runSearch(0)
  }

  if (loadingConfig) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm',
          className
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Loading ExerciseDB catalog…
      </div>
    )
  }

  if (!configured) {
    return (
      <div className={cn('text-muted-foreground space-y-2 text-sm', className)}>
        <p>ExerciseDB is not configured on this server.</p>
        <p>
          Add{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            EXERCISEDB_RAPIDAPI_KEY
          </code>{' '}
          to your env file and restart the dev server.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(variant === 'grid' ? 'flex min-h-0 flex-col' : 'space-y-3', className)}>
      <form onSubmit={handleSearch} className="shrink-0 space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search catalog, e.g. bench press…"
            className="pl-9"
          />
        </div>
        <div
          className={cn(
            'grid gap-2',
            variant === 'grid' ? 'grid-cols-1' : 'sm:grid-cols-3'
          )}
        >
          <Select value={bodyPart} onValueChange={setBodyPart}>
            <SelectTrigger className="h-9">
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
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Target" />
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
            <SelectTrigger className="h-9">
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
        <Button type="submit" size="sm" disabled={loadingResults}>
          {loadingResults ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <div
        className={cn(
          variant === 'grid'
            ? 'min-h-0 flex-1 space-y-3 overflow-y-auto'
            : 'space-y-3'
        )}
      >
        <div
          className={cn(
            'rounded-sm border',
            variant === 'list' && 'max-h-[min(340px,45vh)] overflow-y-auto'
          )}
        >
          {loadingResults ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">
              No exercises found. Try a different search.
            </p>
          ) : variant === 'grid' ? (
            <ul className="grid grid-cols-2 gap-2 p-2">
              {results.map((exercise) => {
                const selected = selectedExternalId === exercise.id
                const inLibrary = importedSet.has(exercise.id)
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelect({
                          externalId: exercise.id,
                          name: exercise.name,
                          target: exercise.target,
                          bodyPart: exercise.bodyPart,
                          equipment: exercise.equipment,
                        })
                      }
                      className={cn(
                        'hover:bg-muted/50 flex w-full flex-col overflow-hidden rounded-md border text-left transition-colors',
                        selected && 'border-brand bg-brand/10 ring-brand ring-1'
                      )}
                    >
                      <div className="bg-muted aspect-[4/3] w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exerciseDbImageUrl(exercise.id)}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-0.5 p-2">
                        <p className="line-clamp-2 text-xs font-medium leading-snug">
                          {exercise.name}
                        </p>
                        <p className="text-muted-foreground line-clamp-1 text-[10px]">
                          {exercise.target}
                        </p>
                        {inLibrary && (
                          <p className="text-muted-foreground text-[10px]">In library</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="divide-y">
              {results.map((exercise) => {
                const selected = selectedExternalId === exercise.id
                const inLibrary = importedSet.has(exercise.id)
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelect({
                          externalId: exercise.id,
                          name: exercise.name,
                          target: exercise.target,
                          bodyPart: exercise.bodyPart,
                          equipment: exercise.equipment,
                        })
                      }
                      className={cn(
                        'hover:bg-muted/50 flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
                        selected && 'bg-brand/10 ring-brand ring-1 ring-inset'
                      )}
                    >
                      <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exerciseDbImageUrl(exercise.id)}
                          alt=""
                          className="size-12 object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{exercise.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {exercise.target} · {exercise.bodyPart} ·{' '}
                          {exercise.equipment}
                        </p>
                        {inLibrary && (
                          <p className="text-muted-foreground mt-1 text-[11px]">
                            Already in your library
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {!loadingResults && (offset > 0 || hasMore) && (
          <div
            className={cn(
              'flex items-center justify-between gap-2',
              variant === 'grid' && 'bg-background sticky bottom-0 pb-1'
            )}
          >
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
              {offset + 1}–{offset + results.length}
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
      </div>
    </div>
  )
}

type AddExerciseDialogProps = {
  clientId: string
  workoutId: string
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onAdded: () => void
}

type ExerciseSource = 'catalog' | 'library' | 'custom'

export function AddExerciseDialog({
  clientId,
  workoutId,
  exercises,
  onAdded,
}: AddExerciseDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [source, setSource] = React.useState<ExerciseSource>('catalog')
  const [catalogSelection, setCatalogSelection] =
    React.useState<CatalogExerciseSelection | null>(null)
  const [selectedName, setSelectedName] = React.useState<string | null>(null)
  const [libraryExercises, setLibraryExercises] = React.useState(exercises)

  const form = useForm<ScheduledExercisePrescriptionValues>({
    resolver: zodResolver(scheduledExercisePrescriptionSchema),
    defaultValues: defaultPrescriptionValues,
  })

  const customForm = useForm<CustomExerciseQuickValues>({
    resolver: zodResolver(customExerciseQuickSchema),
    defaultValues: customExerciseQuickDefaults,
  })

  React.useEffect(() => {
    setLibraryExercises(exercises)
  }, [exercises])

  const importedExternalIds = React.useMemo(
    () =>
      libraryExercises
        .map((exercise) => exercise.external_id)
        .filter((id): id is string => Boolean(id)),
    [libraryExercises]
  )

  const activeExercises = libraryExercises.filter((exercise) => exercise.id)
  const [libraryExerciseId, setLibraryExerciseId] = React.useState('')
  const customName = customForm.watch('name')

  function resetDialog() {
    form.reset(defaultPrescriptionValues)
    customForm.reset(customExerciseQuickDefaults)
    setCatalogSelection(null)
    setSelectedName(null)
    setLibraryExerciseId('')
    setSource('catalog')
  }

  function switchSource(next: ExerciseSource) {
    setSource(next)
    if (next === 'custom') {
      setCatalogSelection(null)
      setLibraryExerciseId('')
      setSelectedName(customForm.getValues('name').trim() || null)
    }
  }

  async function onSubmit(values: ScheduledExercisePrescriptionValues) {
    setPending(true)

    let exerciseId = libraryExerciseId

    if (source === 'catalog' && catalogSelection) {
      const ensured = await ensureCatalogExercise(
        catalogSelection.externalId,
        clientId
      )
      if (!ensured.success) {
        setPending(false)
        toast.error(ensured.error)
        return
      }
      exerciseId = ensured.exerciseId
    }

    if (source === 'custom') {
      const customValues = customForm.getValues()
      const parsedCustom = customExerciseQuickSchema.safeParse(customValues)
      if (!parsedCustom.success) {
        setPending(false)
        toast.error('Enter an exercise name to continue.')
        return
      }

      const created = await createExerciseRecord(
        {
          name: parsedCustom.data.name,
          instructions: parsedCustom.data.instructions ?? '',
          muscleGroup: parsedCustom.data.muscleGroup ?? '',
          equipment: parsedCustom.data.equipment ?? '',
          status: parsedCustom.data.saveToLibrary ? 'active' : 'archived',
        },
        { clientId }
      )

      if (!created.success) {
        setPending(false)
        toast.error(created.error)
        return
      }

      exerciseId = created.exerciseId

      if (parsedCustom.data.saveToLibrary) {
        setLibraryExercises((current) => [
          ...current,
          {
            id: created.exerciseId,
            name: parsedCustom.data.name,
            muscle_group: parsedCustom.data.muscleGroup?.trim() || null,
            external_id: null,
          },
        ])
      }
    }

    if (!exerciseId) {
      setPending(false)
      toast.error('Select or create an exercise first.')
      return
    }

    const result = await addScheduledExercise(clientId, workoutId, {
      exerciseId,
      ...values,
    })
    setPending(false)

    if (result.success) {
      toast.success('Exercise added.')
      resetDialog()
      setOpen(false)
      router.refresh()
      onAdded()
      return
    }

    toast.error(result.error)
  }

  function handleLibrarySelect(exerciseId: string, name: string) {
    setLibraryExerciseId(exerciseId)
    setSelectedName(name)
    setCatalogSelection(null)
  }

  function handleCatalogSelect(exercise: CatalogExerciseSelection) {
    setCatalogSelection(exercise)
    setSelectedName(exercise.name)
    setLibraryExerciseId('')
  }

  const canSubmit =
    source === 'library'
      ? Boolean(libraryExerciseId)
      : source === 'custom'
        ? Boolean(customName?.trim())
        : Boolean(catalogSelection)

  const selectionLabel =
    source === 'custom'
      ? customName?.trim() || null
      : selectedName

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs value={source} onValueChange={(value) => switchSource(value as ExerciseSource)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="catalog">Catalog</TabsTrigger>
              <TabsTrigger value="library">
                My library
                {activeExercises.length > 0 ? ` (${activeExercises.length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  Browse ExerciseDB and import into this workout.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-auto px-2 py-1 text-xs"
                  onClick={() => switchSource('custom')}
                >
                  Create custom exercise →
                </Button>
              </div>
              <ExerciseCatalogPicker
                importedExternalIds={importedExternalIds}
                selectedExternalId={catalogSelection?.externalId ?? null}
                onSelect={handleCatalogSelect}
              />
            </TabsContent>

            <TabsContent value="library" className="mt-4">
              {activeExercises.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Your library is empty. Browse the catalog or create a custom
                    exercise.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => switchSource('custom')}
                  >
                    Create custom exercise
                  </Button>
                </div>
              ) : (
                <div className="max-h-[min(340px,45vh)] overflow-y-auto rounded-sm border">
                  <ul className="divide-y">
                    {activeExercises.map((exercise) => {
                      const selected = libraryExerciseId === exercise.id
                      return (
                        <li key={exercise.id}>
                          <button
                            type="button"
                            onClick={() =>
                              handleLibrarySelect(exercise.id, exercise.name)
                            }
                            className={cn(
                              'hover:bg-muted/50 flex w-full px-4 py-3 text-left text-sm transition-colors',
                              selected && 'bg-brand/10 ring-brand ring-1 ring-inset'
                            )}
                          >
                            <span className="font-medium">{exercise.name}</span>
                            {exercise.muscle_group && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                · {exercise.muscle_group}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <CustomExerciseTab form={customForm} />
            </TabsContent>
          </Tabs>

          {selectionLabel && source !== 'custom' && (
            <p className="mt-4 text-sm">
              Selected: <span className="font-semibold">{selectionLabel}</span>
            </p>
          )}

          {source === 'custom' && customName?.trim() && (
            <p className="mt-4 text-sm">
              Adding: <span className="font-semibold">{customName.trim()}</span>
            </p>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-4 space-y-4 border-t pt-4"
            >
              <ExercisePrescriptionForm form={form} idPrefix="add-exercise" />
              <Button type="submit" disabled={pending || !canSubmit} className="w-full">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Add to workout
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
