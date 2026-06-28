'use client'

import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'

import {
  CustomExerciseTab,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import { LibraryExerciseList } from '@/components/exercises/library-exercise-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'

export type ExerciseSource = 'library' | 'custom'

export type LibrarySelection =
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
  const [source, setSource] = React.useState<ExerciseSource>('library')
  const customName = customForm.watch('name')

  const activeExercises = exercises.filter((exercise) => exercise.id)

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <Tabs
        value={source}
        onValueChange={(value) => setSource(value as ExerciseSource)}
        className="flex h-full min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid w-full shrink-0 grid-cols-2">
          <TabsTrigger value="library" className="text-xs">
            Library
            {activeExercises.length > 0 ? ` (${activeExercises.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="library"
          className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          {activeExercises.length === 0 ? (
            <p className="text-muted-foreground px-1 py-8 text-center text-sm">
              Your library is loading. Refresh if exercises do not appear.
            </p>
          ) : (
            <LibraryExerciseList
              exercises={activeExercises}
              selectedId={
                selection?.source === 'library' ? selection.exerciseId : null
              }
              onSelect={(exerciseId, name) =>
                onSelect({ source: 'library', exerciseId, name })
              }
              variant="grid"
              className="h-full min-h-0"
            />
          )}
        </TabsContent>

        <TabsContent
          value="custom"
          className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain">
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
