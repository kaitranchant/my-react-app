'use client'

import * as React from 'react'
import { toast } from 'sonner'

import {
  getExerciseHistory,
  updateScheduledExerciseCoachNotes,
} from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
import {
  getPortalExerciseHistory,
  updatePortalExerciseClientNotes,
} from '@/app/portal/workout-log-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDayHeader } from '@/lib/calendar'
import { exerciseLogNotesSchema } from '@/lib/validations/workout-log'
import type { ExerciseHistorySession } from 'app/types/database'

type ExerciseLogNotesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  exerciseRowId: string
  libraryExerciseId: string
  clientId: string
  workoutId: string
  variant: 'coach' | 'client'
  coachNotes: string | null
  clientNotes: string | null
  onSaved: (notes: string) => void
}

function PreviousSessionNotes({
  session,
  variant,
}: {
  session: ExerciseHistorySession
  variant: 'coach' | 'client'
}) {
  const coachNotes = session.coachNotes?.trim()
  const clientNotes = session.clientNotes?.trim()
  if (!coachNotes && !clientNotes) return null

  return (
    <div className="space-y-3 rounded-lg border border-dashed px-3 py-3">
      <p className="text-muted-foreground text-xs font-medium">
        From {formatDayHeader(session.date)}
        {session.workoutName ? ` · ${session.workoutName}` : ''}
      </p>
      {coachNotes ? (
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Coach notes</Label>
          <p className="text-sm leading-snug whitespace-pre-wrap">{coachNotes}</p>
        </div>
      ) : null}
      {clientNotes ? (
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">
            {variant === 'client' ? 'Your notes' : 'Client notes'}
          </Label>
          <p className="text-sm leading-snug whitespace-pre-wrap">{clientNotes}</p>
        </div>
      ) : null}
    </div>
  )
}

export function ExerciseLogNotesDialog({
  open,
  onOpenChange,
  exerciseName,
  exerciseRowId,
  libraryExerciseId,
  clientId,
  workoutId,
  variant,
  coachNotes,
  clientNotes,
  onSaved,
}: ExerciseLogNotesDialogProps) {
  const [editableNotes, setEditableNotes] = React.useState('')
  const [previousSession, setPreviousSession] =
    React.useState<ExerciseHistorySession | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setEditableNotes(
      variant === 'coach'
        ? (coachNotes?.trim() ?? '')
        : (clientNotes?.trim() ?? '')
    )
  }, [open, variant, coachNotes, clientNotes])

  React.useEffect(() => {
    if (!open) {
      setPreviousSession(null)
      return
    }

    let cancelled = false

    async function loadPreviousSession() {
      const result =
        variant === 'client'
          ? await getPortalExerciseHistory(libraryExerciseId, {
              excludeWorkoutId: workoutId,
              limit: 1,
            })
          : await getExerciseHistory(clientId, libraryExerciseId, {
              excludeWorkoutId: workoutId,
              limit: 1,
            })

      if (cancelled || !result.success) return

      const latest = result.sessions[0] ?? null
      if (
        latest &&
        (latest.coachNotes?.trim() || latest.clientNotes?.trim())
      ) {
        setPreviousSession(latest)
      } else {
        setPreviousSession(null)
      }
    }

    void loadPreviousSession()

    return () => {
      cancelled = true
    }
  }, [open, variant, libraryExerciseId, clientId, workoutId])

  function getPreviousNotes() {
    return variant === 'coach'
      ? (coachNotes?.trim() ?? '')
      : (clientNotes?.trim() ?? '')
  }

  function closeDialog() {
    onOpenChange(false)
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }

    if (saving) return
    closeDialog()
  }

  async function handleSave() {
    const parsed = exerciseLogNotesSchema.safeParse({ notes: editableNotes })
    if (!parsed.success) {
      toast.error('Notes must be 500 characters or fewer.')
      return
    }

    const previousNotes = getPreviousNotes()
    const nextNotes = parsed.data.notes

    if (nextNotes === previousNotes) {
      closeDialog()
      return
    }

    setSaving(true)
    closeDialog()

    const result =
      variant === 'coach'
        ? await updateScheduledExerciseCoachNotes(
            clientId,
            exerciseRowId,
            nextNotes,
            { revalidate: false }
          )
        : await updatePortalExerciseClientNotes(
            workoutId,
            exerciseRowId,
            nextNotes,
            { revalidate: false }
          )

    setSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    queueMicrotask(() => {
      onSaved(nextNotes)
    })
  }

  const otherPartyNotes =
    variant === 'coach' ? clientNotes?.trim() : coachNotes?.trim()

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} modal={false}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Exercise notes</DialogTitle>
          <DialogDescription>{exerciseName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previousSession ? (
            <PreviousSessionNotes session={previousSession} variant={variant} />
          ) : null}

          {otherPartyNotes ? (
            <div className="space-y-2">
              <Label>
                {variant === 'coach' ? 'Client notes' : 'Coach notes'}
              </Label>
              <p className="bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2 text-sm leading-snug whitespace-pre-wrap">
                {otherPartyNotes}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="exercise-log-notes-input">
              {variant === 'coach' ? 'Notes for client' : 'Your notes for coach'}
            </Label>
            <Textarea
              id="exercise-log-notes-input"
              rows={4}
              maxLength={500}
              value={editableNotes}
              onChange={(event) => setEditableNotes(event.target.value)}
              placeholder={
                variant === 'coach'
                  ? 'Form cues, substitutions, or reminders for this session…'
                  : 'How it felt, questions, or anything your coach should know…'
              }
            />
            <p className="text-muted-foreground text-xs">
              {editableNotes.length}/500 characters · Saved notes appear in
              exercise history for future sessions
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
