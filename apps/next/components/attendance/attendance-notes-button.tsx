'use client'

import * as React from 'react'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

import { updateClientDailyAttendance } from '@/app/(dashboard)/attendance/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { TeamEventAttendanceStatus } from 'app/types/database'

type AttendanceNotesButtonProps = {
  clientId: string
  date: string
  notes: string | null
  status: TeamEventAttendanceStatus | null
  disabled?: boolean
  onSaved?: () => void
}

export function AttendanceNotesButton({
  clientId,
  date,
  notes,
  status,
  disabled = false,
  onSaved,
}: AttendanceNotesButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(notes ?? '')
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setDraft(notes ?? '')
  }, [notes])

  async function handleSave() {
    if (!status) {
      toast.error('Set a status before adding notes.')
      return
    }

    setPending(true)
    const result = await updateClientDailyAttendance(clientId, date, status, {
      notes: draft.trim() || null,
    })
    setPending(false)

    if (result.success) {
      toast.success('Notes saved')
      setOpen(false)
      onSaved?.()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8 shrink-0', notes && 'text-brand')}
          disabled={disabled}
          aria-label={notes ? 'Edit attendance notes' : 'Add attendance notes'}
          title={notes ?? 'Add notes'}
        >
          <MessageSquare className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session notes</DialogTitle>
          <DialogDescription>
            Optional details for this attendance entry.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. left early, knee flaring up"
          rows={4}
          maxLength={500}
          disabled={pending}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !status}
            onClick={handleSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
