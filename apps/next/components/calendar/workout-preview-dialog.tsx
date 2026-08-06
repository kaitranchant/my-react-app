'use client'

import { ClipboardList, Loader2, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDayHeader } from '@/lib/calendar'
import { formatExercisePrescriptionSummary } from '@/lib/scheduled-exercise'
import { getWorkoutToneBadgeClass } from '@/lib/status-colors'
import { cn } from '@/lib/utils'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import type { ClientScheduledWorkoutWithExercises } from 'app/types/database'

type WorkoutPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: ClientScheduledWorkoutWithExercises | null
  loading?: boolean
  selectedDate: string
  logLabel?: string
  onLog?: () => void
  onEdit?: () => void
}

export function WorkoutPreviewDialog({
  open,
  onOpenChange,
  workout,
  loading = false,
  selectedDate,
  logLabel = 'Log workout',
  onLog,
  onEdit,
}: WorkoutPreviewDialogProps) {
  const status = workout
    ? getWorkoutDisplayStatus(workout.status, workoutHasProgress(workout, []))
    : null

  const exercises = workout
    ? [...workout.exercises].sort((a, b) => a.sort_order - b.sort_order)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-4 sm:px-6">
          <DialogTitle className="pr-8">
            {workout?.name ?? 'Workout'}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span>{formatDayHeader(selectedDate)}</span>
              {status ? (
                <>
                  <span aria-hidden>·</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
                      getWorkoutToneBadgeClass(status.tone)
                    )}
                  >
                    {status.label}
                  </span>
                </>
              ) : null}
              {workout && !loading ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {exercises.length} exercise
                    {exercises.length === 1 ? '' : 's'}
                  </span>
                </>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          {loading && !workout ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading workout…
            </div>
          ) : workout ? (
            <div className="space-y-4">
              {workout.notes?.trim() ? (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                    Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
                </div>
              ) : null}

              {exercises.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
                  No exercises in this workout yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {exercises.map((row, index) => {
                    const summary = formatExercisePrescriptionSummary(row)
                    return (
                      <li
                        key={row.id}
                        className="rounded-lg border px-3 py-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-muted-foreground mt-0.5 w-5 shrink-0 text-right text-xs font-medium tabular-nums">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug font-medium">
                              {row.exercise.name}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                              {summary}
                            </p>
                            {row.workout_notes?.trim() ? (
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">
                                {row.workout_notes.trim()}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Could not load this workout.
            </p>
          )}
        </div>

        {(onLog || onEdit) && (
          <DialogFooter className="shrink-0 flex-row gap-2 border-t px-4 py-3 sm:px-6">
            {onEdit ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!workout || loading}
                onClick={() => {
                  onOpenChange(false)
                  onEdit()
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
            {onLog ? (
              <Button
                type="button"
                className="flex-1"
                disabled={!workout || loading}
                onClick={() => {
                  onOpenChange(false)
                  onLog()
                }}
              >
                <ClipboardList className="size-4" />
                {logLabel}
              </Button>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
