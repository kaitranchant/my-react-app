'use client'

import * as React from 'react'
import { toast } from 'sonner'

import {
  updateScheduledExerciseCoachNotes,
} from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
import { updatePortalExerciseClientNotes } from '@/app/portal/workout-log-actions'
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
import { formatCoachNotesForExerciseLog } from '@/lib/exercise-log-notes'
import { exerciseLogNotesSchema } from '@/lib/validations/workout-log'

type ExerciseLogNotesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  exerciseRowId: string
  clientId: string
  workoutId: string
  variant: 'coach' | 'client'
  coachNotes: string | null
  coachSessionNotes: string | null
  previousSessionCoachNotes?: string | null
  clientNotes: string | null
  onSaved: (notes: string) => void
}

export function ExerciseLogNotesDialog({
  open,
  onOpenChange,
  exerciseName,
  exerciseRowId,
  clientId,
  workoutId,
  variant,
  coachNotes,
  coachSessionNotes,
  previousSessionCoachNotes,
  clientNotes,
  onSaved,
}: ExerciseLogNotesDialogProps) {
  const [editableNotes, setEditableNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setEditableNotes(
      variant === 'coach'
        ? (coachSessionNotes?.trim() ?? '')
        : (clientNotes?.trim() ?? '')
    )
  }, [open, variant, coachSessionNotes, clientNotes])

  function getPreviousNotes() {
    return variant === 'coach'
      ? (coachSessionNotes?.trim() ?? '')
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

  const otherPartyCoachNotes =
    variant === 'client'
      ? formatCoachNotesForExerciseLog(
          {
            workout_notes: coachNotes,
            coach_session_notes: coachSessionNotes,
          },
          { previousSessionCoachNotes }
        )
      : null
  const otherPartyClientNotes =
    variant === 'coach' ? clientNotes?.trim() : null

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
          {otherPartyCoachNotes ? (
            <div className="space-y-2">
              <Label>Coach notes</Label>
              <p className="bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2 text-sm leading-snug whitespace-pre-wrap">
                {otherPartyCoachNotes}
              </p>
            </div>
          ) : null}

          {otherPartyClientNotes ? (
            <div className="space-y-2">
              <Label>Client notes</Label>
              <p className="bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2 text-sm leading-snug whitespace-pre-wrap">
                {otherPartyClientNotes}
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
