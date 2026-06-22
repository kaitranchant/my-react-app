'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
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
  onSaved: () => void
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
  const [pending, setPending] = React.useState(false)
  const [editableNotes, setEditableNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setEditableNotes(
      variant === 'coach'
        ? (coachNotes?.trim() ?? '')
        : (clientNotes?.trim() ?? '')
    )
  }, [open, variant, coachNotes, clientNotes])

  async function handleSave() {
    setPending(true)
    const result =
      variant === 'coach'
        ? await updateScheduledExerciseCoachNotes(
            clientId,
            exerciseRowId,
            editableNotes
          )
        : await updatePortalExerciseClientNotes(
            workoutId,
            exerciseRowId,
            editableNotes
          )
    setPending(false)

    if (result.success) {
      toast.success('Notes saved.')
      onSaved()
      onOpenChange(false)
      return
    }

    toast.error(result.error)
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
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
