'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { replaceScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { createExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
import { ensureCatalogExercise } from '@/app/(dashboard)/library/exercises/catalog-actions'
import {
  ExerciseCatalogPicker,
  type CatalogExerciseSelection,
} from '@/components/calendar/add-exercise-dialog'
import {
  CustomExerciseTab,
  customExerciseQuickDefaults,
  customExerciseQuickSchema,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

type ExerciseSource = 'catalog' | 'library' | 'custom'

type ReplaceExerciseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  exerciseRowId: string
  currentExerciseName: string
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onReplaced: () => void
}

export function ReplaceExerciseDialog({
  open,
  onOpenChange,
  clientId,
  exerciseRowId,
  currentExerciseName,
  exercises,
  onReplaced,
}: ReplaceExerciseDialogProps) {
  const [pending, setPending] = React.useState(false)
  const [source, setSource] = React.useState<ExerciseSource>('catalog')
  const [catalogSelection, setCatalogSelection] =
    React.useState<CatalogExerciseSelection | null>(null)
  const [libraryExerciseId, setLibraryExerciseId] = React.useState('')
  const [libraryQuery, setLibraryQuery] = React.useState('')
  const [libraryExercises, setLibraryExercises] = React.useState(exercises)

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

  const filteredLibrary = React.useMemo(() => {
    const query = libraryQuery.trim().toLowerCase()
    if (!query) return libraryExercises
    return libraryExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(query)
    )
  }, [libraryExercises, libraryQuery])

  const customName = customForm.watch('name')

  function resetDialog() {
    setCatalogSelection(null)
    setLibraryExerciseId('')
    setLibraryQuery('')
    setSource('catalog')
    customForm.reset(customExerciseQuickDefaults)
  }

  async function resolveExerciseId(): Promise<string | null> {
    if (source === 'library') {
      return libraryExerciseId || null
    }

    if (source === 'catalog' && catalogSelection) {
      const ensured = await ensureCatalogExercise(
        catalogSelection.externalId,
        clientId
      )
      if (!ensured.success) {
        toast.error(ensured.error)
        return null
      }
      return ensured.exerciseId
    }

    if (source === 'custom') {
      const parsedCustom = customExerciseQuickSchema.safeParse(
        customForm.getValues()
      )
      if (!parsedCustom.success) {
        toast.error('Enter an exercise name to continue.')
        return null
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
        toast.error(created.error)
        return null
      }

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

      return created.exerciseId
    }

    return null
  }

  async function handleReplace() {
    setPending(true)
    const exerciseId = await resolveExerciseId()
    if (!exerciseId) {
      setPending(false)
      if (source !== 'custom') {
        toast.error('Select or create an exercise first.')
      }
      return
    }

    const result = await replaceScheduledExercise(
      clientId,
      exerciseRowId,
      exerciseId
    )
    setPending(false)

    if (result.success) {
      toast.success('Exercise replaced.')
      resetDialog()
      onOpenChange(false)
      onReplaced()
      return
    }

    toast.error(result.error)
  }

  const canSubmit =
    source === 'library'
      ? Boolean(libraryExerciseId)
      : source === 'custom'
        ? Boolean(customName?.trim())
        : Boolean(catalogSelection)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetDialog()
      }}
    >
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Replace exercise</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Swap <span className="text-foreground font-medium">{currentExerciseName}</span>{' '}
            for a different exercise. Logged sets for this slot will be cleared.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs
            value={source}
            onValueChange={(value) => setSource(value as ExerciseSource)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="catalog">Catalog</TabsTrigger>
              <TabsTrigger value="library">My library</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-4">
              <ExerciseCatalogPicker
                importedExternalIds={importedExternalIds}
                selectedExternalId={catalogSelection?.externalId ?? null}
                onSelect={(exercise) => {
                  setCatalogSelection(exercise)
                  setLibraryExerciseId('')
                }}
              />
            </TabsContent>

            <TabsContent value="library" className="mt-4 space-y-3">
              <Input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Search your library…"
              />
              <div className="max-h-[min(50vh,360px)] space-y-1 overflow-y-auto">
                {filteredLibrary.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No exercises found.
                  </p>
                ) : (
                  filteredLibrary.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => {
                        setLibraryExerciseId(exercise.id)
                        setCatalogSelection(null)
                      }}
                      className={cn(
                        'hover:bg-muted/60 w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        libraryExerciseId === exercise.id &&
                          'border-brand bg-brand/5'
                      )}
                    >
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.muscle_group && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {exercise.muscle_group}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <CustomExerciseTab form={customForm} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button
            type="button"
            disabled={pending || !canSubmit}
            onClick={() => void handleReplace()}
            className="flex-1"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Replace exercise
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
