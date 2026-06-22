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
    <div className={cn(variant === 'grid' ? 'flex min-h-0 flex-col' : 'space-y-2', className)}>
      <form onSubmit={handleSearch} className="shrink-0 space-y-2">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search catalog…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-9 shrink-0 px-3"
            disabled={loadingResults}
          >
            {loadingResults ? <Loader2 className="size-4 animate-spin" /> : 'Go'}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Select value={bodyPart} onValueChange={setBodyPart}>
            <SelectTrigger className="h-8 truncate px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
              <SelectValue placeholder="Body" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All parts</SelectItem>
              {bodyParts.map((part) => (
                <SelectItem key={part} value={part}>
                  {part}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="h-8 truncate px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
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
            <SelectTrigger className="h-8 truncate px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
              <SelectValue placeholder="Equip." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All equip.</SelectItem>
              {equipmentOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            'rounded-lg border',
            variant === 'list' &&
              'max-h-[min(420px,52vh)] overflow-y-auto sm:max-h-[min(340px,45vh)]'
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
                        'hover:bg-muted/50 flex w-full items-start gap-2 px-2 py-2 text-left transition-colors sm:gap-3 sm:px-3 sm:py-3',
                        selected && 'bg-brand/10 ring-brand ring-1 ring-inset'
                      )}
                    >
                      <div className="bg-muted size-10 shrink-0 overflow-hidden rounded-lg sm:size-12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exerciseDbImageUrl(exercise.id)}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{exercise.name}</p>
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {exercise.target} · {exercise.bodyPart}
                        </p>
                        {inLibrary && (
                          <p className="text-muted-foreground mt-0.5 text-[11px]">
                            In library
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

function useCompactLayout() {
  const [compact, setCompact] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return compact
}

export function AddExerciseDialog({
  clientId,
  workoutId,
  exercises,
  onAdded,
}: AddExerciseDialogProps) {
  const router = useRouter()
  const compactLayout = useCompactLayout()
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

  function clearSelection() {
    setCatalogSelection(null)
    setSelectedName(null)
    setLibraryExerciseId('')
    if (source === 'custom') {
      customForm.setValue('name', '')
    }
  }

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

  const showConfigureView =
    source === 'catalog'
      ? Boolean(catalogSelection)
      : source === 'library'
        ? Boolean(libraryExerciseId)
        : false

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
          <span className="hidden sm:inline">Add exercise</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(92vh,920px)] max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>Add exercise</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!showConfigureView ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-6">
              <Tabs
                value={source}
                onValueChange={(value) => switchSource(value as ExerciseSource)}
                className="flex min-h-0 flex-1 flex-col pt-3"
              >
                <TabsList className="grid h-9 w-full shrink-0 grid-cols-3">
                  <TabsTrigger value="catalog" className="px-1 text-xs sm:text-sm">
                    Catalog
                  </TabsTrigger>
                  <TabsTrigger value="library" className="px-1 text-xs sm:text-sm">
                    Library
                    {activeExercises.length > 0 ? ` (${activeExercises.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="px-1 text-xs sm:text-sm">
                    Custom
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="catalog"
                  className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                >
                  <p className="text-muted-foreground hidden shrink-0 text-sm sm:block">
                    Browse ExerciseDB and import into this workout.
                  </p>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:hidden">
                    <p className="text-muted-foreground text-xs">Browse catalog</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-auto px-1 py-0 text-xs"
                      onClick={() => switchSource('custom')}
                    >
                      Custom →
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hidden h-auto shrink-0 px-2 py-1 text-xs sm:inline-flex"
                    onClick={() => switchSource('custom')}
                  >
                    Create custom exercise →
                  </Button>
                  <ExerciseCatalogPicker
                    importedExternalIds={importedExternalIds}
                    selectedExternalId={catalogSelection?.externalId ?? null}
                    onSelect={handleCatalogSelect}
                    variant={compactLayout ? 'grid' : 'list'}
                    className={
                      compactLayout
                        ? 'flex min-h-0 flex-1 flex-col'
                        : 'min-h-[min(420px,52vh)]'
                    }
                  />
                </TabsContent>

                <TabsContent value="library" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
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
                    <div className="flex min-h-[min(360px,48vh)] flex-1 flex-col overflow-hidden rounded-lg border">
                      <ul className="divide-y overflow-y-auto">
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
                                  'hover:bg-muted/50 flex w-full px-3 py-2.5 text-left text-sm transition-colors',
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

                <TabsContent value="custom" className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
                  <CustomExerciseTab form={customForm} />
                  {source === 'custom' && canSubmit && (
                    <div className="mt-4 border-t pt-4">
                      <Form {...form}>
                        <form
                          id="add-exercise-form"
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-3"
                        >
                          <ExercisePrescriptionForm
                            form={form}
                            idPrefix="add-exercise"
                            compact={compactLayout}
                          />
                        </form>
                      </Form>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {!canSubmit ? (
                <p className="text-muted-foreground shrink-0 py-3 text-center text-sm">
                  Select an exercise to configure sets and reps.
                </p>
              ) : source === 'custom' ? (
                <div className="shrink-0 border-t py-3">
                  <Button
                    type="submit"
                    form="add-exercise-form"
                    disabled={pending}
                    className="w-full"
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Add to workout
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Selected exercise</p>
                  <p className="truncate font-semibold">{selectionLabel}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={clearSelection}
                >
                  Change
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6">
                <Form {...form}>
                  <form
                    id="add-exercise-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  >
                    <ExercisePrescriptionForm
                      form={form}
                      idPrefix="add-exercise"
                      compact={compactLayout}
                    />
                  </form>
                </Form>
              </div>

              <div className="shrink-0 border-t px-4 py-3 sm:px-6">
                <Button
                  type="submit"
                  form="add-exercise-form"
                  disabled={pending}
                  className="w-full"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Add to workout
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
