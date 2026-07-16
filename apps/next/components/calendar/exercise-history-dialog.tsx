'use client'

import * as React from 'react'
import { History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { getExerciseHistory } from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
import { getPortalExerciseHistory } from '@/app/portal/workout-log-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDayHeader } from '@/lib/calendar'
import { formatPreviousPerformance } from '@/lib/workout-log'
import { cn } from '@/lib/utils'
import type { ExerciseHistorySession } from 'app/types/database'

type ExerciseHistoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  libraryExerciseId: string
  clientId: string
  excludeWorkoutId?: string
  variant?: 'coach' | 'client'
}

export function ExerciseHistoryDialog({
  open,
  onOpenChange,
  exerciseName,
  libraryExerciseId,
  clientId,
  excludeWorkoutId,
  variant = 'coach',
}: ExerciseHistoryDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [sessions, setSessions] = React.useState<ExerciseHistorySession[]>([])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false

    async function load() {
      setLoading(true)
      const result =
        variant === 'client'
          ? await getPortalExerciseHistory(libraryExerciseId, {
              excludeWorkoutId,
              limit: 16,
            })
          : await getExerciseHistory(clientId, libraryExerciseId, {
              excludeWorkoutId,
              limit: 16,
            })

      if (cancelled) return
      setLoading(false)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setSessions(result.sessions)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [
    open,
    libraryExerciseId,
    clientId,
    excludeWorkoutId,
    variant,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-left">
            <History className="text-brand size-5" />
            {exerciseName}
          </DialogTitle>
          <DialogDescription className="text-left">
            Past sessions for this movement
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center">
              <History className="text-muted-foreground/40 mx-auto mb-3 size-10" />
              <p className="font-medium">No history yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Completed workouts with this exercise will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <HistorySessionCard
                  key={session.workoutId}
                  session={session}
                  variant={variant}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HistorySessionCard({
  session,
  variant,
}: {
  session: ExerciseHistorySession
  variant: 'coach' | 'client'
}) {
  const bestE1rm = session.bestE1rm
  const coachNotes = session.coachNotes?.trim()
  const clientNotes = session.clientNotes?.trim()
  const hasNotes = Boolean(coachNotes || clientNotes)

  return (
    <div className="bg-muted/30 overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold">
            {formatDayHeader(session.date)}
          </p>
          {session.workoutName && (
            <p className="text-muted-foreground text-xs">{session.workoutName}</p>
          )}
        </div>
        {bestE1rm != null && (
          <span className="text-brand text-xs font-semibold">
            Best {bestE1rm} lb e1RM
          </span>
        )}
      </div>

      {hasNotes ? (
        <div className="space-y-2 border-b px-4 py-3">
          {coachNotes ? (
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                Coach notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-snug">
                {coachNotes}
              </p>
            </div>
          ) : null}
          {clientNotes ? (
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                {variant === 'client' ? 'Your notes' : 'Client notes'}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-snug">
                {clientNotes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {session.sets.length > 0 ? (
        <div className="px-4 py-2">
          <div className="text-muted-foreground grid grid-cols-[2rem_1fr_4rem] gap-2 text-xs font-medium">
            <span>Set</span>
            <span>Weight × reps</span>
            <span className="text-right">e1RM</span>
          </div>

          {session.sets.map((set) => {
            const isBest = set.e1rm != null && set.e1rm === bestE1rm
            const performance =
              set.weight != null && set.reps != null
                ? formatPreviousPerformance(set.weight, set.reps)
                : set.distanceMeters != null
                  ? formatPreviousPerformance(
                      set.weight,
                      null,
                      set.durationSeconds,
                      set.distanceMeters
                    )
                  : set.durationSeconds != null
                    ? `${set.durationSeconds}s`
                    : '—'

            return (
              <div
                key={set.setNumber}
                className="grid grid-cols-[2rem_1fr_4rem] items-center gap-2 border-t py-2 text-sm first:border-t-0"
              >
                <span className="text-muted-foreground text-xs font-semibold">
                  {set.setNumber}
                </span>
                <span>{performance}</span>
                <span
                  className={cn(
                    'text-right text-xs font-medium tabular-nums',
                    isBest ? 'text-brand' : 'text-muted-foreground'
                  )}
                >
                  {set.e1rm != null ? `${set.e1rm}` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground px-4 py-3 text-sm">
          Notes only — no logged sets for this session.
        </p>
      )}
    </div>
  )
}

export function ExerciseHistoryButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('text-muted-foreground hover:text-brand size-8', className)}
      onClick={onClick}
      aria-label="View exercise history"
    >
      <History className="size-4" />
    </Button>
  )
}
