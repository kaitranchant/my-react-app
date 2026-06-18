'use client'

import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'

import {
  CustomExerciseTab,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import {
  ExerciseCatalogPicker,
  type CatalogExerciseSelection,
} from '@/components/calendar/add-exercise-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'

export type ExerciseSource = 'catalog' | 'library' | 'custom'

export type LibrarySelection =
  | { source: 'catalog'; exercise: CatalogExerciseSelection }
  | { source: 'library'; exerciseId: string; name: string }
  | { source: 'custom'; name: string }

type ExerciseLibraryPanelProps = {
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  selection: LibrarySelection | null
  onSelect: (selection: LibrarySelection) => void
  customForm: UseFormReturn<CustomExerciseQuickValues>
  className?: string
}

export function ExerciseLibraryPanel({
  exercises,
  selection,
  onSelect,
  customForm,
  className,
}: ExerciseLibraryPanelProps) {
  const [source, setSource] = React.useState<ExerciseSource>('catalog')
  const customName = customForm.watch('name')

  const importedExternalIds = React.useMemo(
    () =>
      exercises
        .map((exercise) => exercise.external_id)
        .filter((id): id is string => Boolean(id)),
    [exercises]
  )

  const activeExercises = exercises.filter((exercise) => exercise.id)

  function switchSource(next: ExerciseSource) {
    setSource(next)
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <Tabs
        value={source}
        onValueChange={(value) => switchSource(value as ExerciseSource)}
        className="flex h-full min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid w-full shrink-0 grid-cols-3">
          <TabsTrigger value="catalog" className="text-xs">
            Catalog
          </TabsTrigger>
          <TabsTrigger value="library" className="text-xs">
            Library
            {activeExercises.length > 0 ? ` (${activeExercises.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="catalog"
          className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          <ExerciseCatalogPicker
            importedExternalIds={importedExternalIds}
            selectedExternalId={
              selection?.source === 'catalog'
                ? selection.exercise.externalId
                : null
            }
            onSelect={(exercise) =>
              onSelect({ source: 'catalog', exercise })
            }
            variant="grid"
            className="h-full min-h-0"
          />
        </TabsContent>

        <TabsContent
          value="library"
          className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        >
          {activeExercises.length === 0 ? (
            <p className="text-muted-foreground px-1 py-8 text-center text-sm">
              Your library is empty. Browse the catalog or create a custom exercise.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {activeExercises.map((exercise) => {
                const selected =
                  selection?.source === 'library' &&
                  selection.exerciseId === exercise.id
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelect({
                          source: 'library',
                          exerciseId: exercise.id,
                          name: exercise.name,
                        })
                      }
                      className={cn(
                        'hover:bg-muted/50 flex w-full px-3 py-2.5 text-left text-sm transition-colors',
                        selected && 'bg-brand/10 ring-brand ring-1 ring-inset'
                      )}
                    >
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.muscle_group && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          · {exercise.muscle_group}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent
          value="custom"
          className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        >
          <CustomExerciseTab form={customForm} />
          {customName?.trim() && (
            <button
              type="button"
              onClick={() =>
                onSelect({ source: 'custom', name: customName.trim() })
              }
              className={cn(
                'hover:bg-muted/50 mt-3 w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                selection?.source === 'custom' &&
                  'border-brand bg-brand/10 ring-brand ring-1'
              )}
            >
              Use <span className="font-semibold">{customName.trim()}</span>
            </button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
