'use client'

import * as React from 'react'
import { Check, Circle } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  getSupersetColor,
  isExerciseFullyLogged,
  type WorkoutLogSection,
  type WorkoutLogSetDraft,
} from '@/lib/workout-log'
import { getSupersetPosition } from '@/lib/superset-groups'
import { cn } from '@/lib/utils'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

type GuidedWorkoutExerciseNavSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: WorkoutLogSection[]
  orderedExercises: ScheduledWorkoutExerciseWithDetails[]
  exerciseState: Record<string, WorkoutLogSetDraft[]>
  activeExerciseIndex: number
  onSelectExercise: (index: number) => void
}

function ExerciseNavRow({
  exercise,
  index,
  orderedExercises,
  exerciseState,
  isActive,
  onSelect,
}: {
  exercise: ScheduledWorkoutExerciseWithDetails
  index: number
  orderedExercises: ScheduledWorkoutExerciseWithDetails[]
  exerciseState: Record<string, WorkoutLogSetDraft[]>
  isActive: boolean
  onSelect: () => void
}) {
  const sets = exerciseState[exercise.id] ?? []
  const complete = isExerciseFullyLogged(sets)
  const supersetPosition = getSupersetPosition(exercise, orderedExercises)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        isActive
          ? 'bg-brand/10 text-foreground'
          : 'hover:bg-muted/60 text-foreground'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
          complete
            ? 'bg-status-success/15 text-status-success'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {complete ? (
          <Check className="size-3" strokeWidth={3} />
        ) : (
          <Circle className="size-2.5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs font-medium">
          {index + 1}
          {supersetPosition
            ? ` · Superset ${supersetPosition.group}`
            : ''}
        </span>
        <span className="block truncate text-sm font-medium">
          {exercise.exercise.name}
        </span>
        {supersetPosition && supersetPosition.total > 1 ? (
          <span
            className={cn(
              'mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase',
              getSupersetColor(supersetPosition.group)
            )}
          >
            {supersetPosition.index} of {supersetPosition.total}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export function GuidedWorkoutExerciseNavSheet({
  open,
  onOpenChange,
  sections,
  orderedExercises,
  exerciseState,
  activeExerciseIndex,
  onSelectExercise,
}: GuidedWorkoutExerciseNavSheetProps) {
  const exerciseIndexById = React.useMemo(
    () => new Map(orderedExercises.map((exercise, index) => [exercise.id, index])),
    [orderedExercises]
  )

  function handleSelect(index: number) {
    onSelectExercise(index)
    onOpenChange(false)
  }

  const showSectionHeaders = sections.length > 1

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex h-full w-[min(88vw,20rem)] flex-col gap-0 p-0 sm:max-w-xs"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left">
          <SheetTitle>Exercises</SheetTitle>
          <p className="text-muted-foreground text-sm">
            {orderedExercises.length} in this workout
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
          {showSectionHeaders ? (
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div key={`${section.label}-${sectionIndex}`}>
                  <p className="text-muted-foreground px-3 pb-1 text-xs font-semibold tracking-wide uppercase">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.exercises.map((exercise) => {
                      const index = exerciseIndexById.get(exercise.id)
                      if (index == null) return null

                      return (
                        <ExerciseNavRow
                          key={exercise.id}
                          exercise={exercise}
                          index={index}
                          orderedExercises={orderedExercises}
                          exerciseState={exerciseState}
                          isActive={index === activeExerciseIndex}
                          onSelect={() => handleSelect(index)}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {orderedExercises.map((exercise, index) => (
                <ExerciseNavRow
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  orderedExercises={orderedExercises}
                  exerciseState={exerciseState}
                  isActive={index === activeExerciseIndex}
                  onSelect={() => handleSelect(index)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
