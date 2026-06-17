'use client'

import * as React from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Dumbbell,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  moveScheduledExercise,
  removeScheduledExercise,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { AddExerciseDialog } from '@/components/calendar/add-exercise-dialog'
import { EditScheduledExerciseDialog } from '@/components/calendar/edit-scheduled-exercise-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDayHeader } from '@/lib/calendar'
import {
  formatExercisePrescriptionSummary,
  getExerciseOptionBadges,
} from '@/lib/scheduled-exercise'
import { cn } from '@/lib/utils'
import type {
  ClientScheduledWorkoutWithExercises,
  Exercise,
} from 'app/types/database'

type ScheduledExerciseRowProps = {
  clientId: string
  row: ClientScheduledWorkoutWithExercises['exercises'][number]
  isFirst: boolean
  isLast: boolean
  onChanged: () => void
}

function ScheduledExerciseRow({
  clientId,
  row,
  isFirst,
  isLast,
  onChanged,
}: ScheduledExerciseRowProps) {
  const [pending, setPending] = React.useState(false)
  const badges = getExerciseOptionBadges(row)
  const summary = formatExercisePrescriptionSummary(row)

  async function handleRemove() {
    setPending(true)
    const result = await removeScheduledExercise(clientId, row.id)
    setPending(false)
    if (result.success) {
      toast.success('Exercise removed.')
      onChanged()
      return
    }
    toast.error(result.error)
  }

  async function handleMove(direction: 'up' | 'down') {
    setPending(true)
    const result = await moveScheduledExercise(clientId, row.id, direction)
    setPending(false)
    if (result.success) {
      onChanged()
      return
    }
    toast.error(result.error)
  }

  const groupColors: Record<string, string> = {
    A: 'bg-sky-500',
    B: 'bg-violet-500',
    C: 'bg-amber-500',
    D: 'bg-rose-500',
  }

  return (
    <div className="flex items-start gap-3 border-b py-4 last:border-b-0">
      <div className="relative shrink-0">
        <div className="bg-muted flex size-10 items-center justify-center rounded-full">
          <Dumbbell className="text-muted-foreground size-4" />
        </div>
        {row.superset_group && (
          <span
            className={cn(
              'absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
              groupColors[row.superset_group] ?? 'bg-muted-foreground'
            )}
          >
            {row.superset_group}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold">{row.exercise.name}</p>
          <EditScheduledExerciseDialog
            clientId={clientId}
            row={row}
            onChanged={onChanged}
          />
        </div>

        <p className="text-muted-foreground text-sm">{summary}</p>

        {row.workout_notes?.trim() && (
          <p className="text-sm leading-snug">{row.workout_notes.trim()}</p>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge} variant="secondary" className="text-[10px]">
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={pending || isFirst}
          onClick={() => handleMove('up')}
          aria-label="Move up"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={pending || isLast}
          onClick={() => handleMove('down')}
          aria-label="Move down"
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive size-8"
          disabled={pending}
          onClick={handleRemove}
          aria-label="Remove exercise"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

type ScheduledWorkoutViewProps = {
  clientId: string
  selectedDate: string
  workout: ClientScheduledWorkoutWithExercises | null
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onChanged: () => void
  onCopy?: () => void
}

export function ScheduledWorkoutView({
  clientId,
  selectedDate,
  workout,
  exercises,
  onChanged,
  onCopy,
}: ScheduledWorkoutViewProps) {
  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-lg font-semibold">{formatDayHeader(selectedDate)}</p>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          No workout scheduled for this day. Create one to start adding exercises.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="border-brand bg-brand/5 flex flex-wrap items-center justify-between gap-3 border-l-4 px-5 py-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {formatDayHeader(selectedDate)}
          </p>
          <h3 className="text-xl font-bold tracking-tight">{workout.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onCopy && (
            <Button type="button" variant="outline" size="sm" onClick={onCopy}>
              <Copy className="size-4" />
              Copy day
            </Button>
          )}
          <AddExerciseDialog
            clientId={clientId}
            workoutId={workout.id}
            exercises={exercises}
            onAdded={onChanged}
          />
        </div>
      </div>

      <div className="px-5 pb-5">
        {workout.exercises.length === 0 ? (
          <p className="text-muted-foreground py-8 text-sm">
            No exercises yet. Search the catalog or pick from your library to build this session.
          </p>
        ) : (
          workout.exercises.map((row, index) => (
            <ScheduledExerciseRow
              key={row.id}
              clientId={clientId}
              row={row}
              isFirst={index === 0}
              isLast={index === workout.exercises.length - 1}
              onChanged={onChanged}
            />
          ))
        )}
      </div>
    </div>
  )
}
