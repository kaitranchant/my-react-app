'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateScheduledExerciseCoachNotes } from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
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
  clientNotes,
  onSaved,
}: ExerciseLogNotesDialogProps) {
  const [editableNotes, setEditableNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setEditableNotes(
      variant === 'coach'
        ? (coachNotes?.trim() ?? '')
        : (clientNotes?.trim() ?? '')
    )
  }, [open, variant, coachNotes, clientNotes])

  function getPreviousNotes() {
    return variant === 'coach'
      ? (coachNotes?.trim() ?? '')
      : (clientNotes?.trim() ?? '')
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
      onOpenChange(false)
      return
    }

    onSaved(nextNotes)
    onOpenChange(false)

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

    if (!result.success) {
      onSaved(previousNotes)
      toast.error(result.error)
    }
  }

  const otherPartyNotes =
    variant === 'coach' ? clientNotes?.trim() : coachNotes?.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exercise notes</DialogTitle>
          <DialogDescription>{exerciseName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {otherPartyNotes ? (
            <div className="space-y-2">
              <Label>
                {variant === 'coach' ? 'Client notes' : 'Coach notes'}
              </Label>
              <p className="bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2 text-sm leading-snug">
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
              {editableNotes.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()}>
            Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
