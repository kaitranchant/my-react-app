'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { addTeamMember, removeTeamMember } from '@/app/(dashboard)/teams/actions'
import { toastSuccessWithUndo } from '@/lib/toast-undo'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RemoveTeamMemberDialogProps = {
  teamId: string
  clientId: string
  clientName: string
  hasTeamProgramAssignment: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RemoveTeamMemberDialog({
  teamId,
  clientId,
  clientName,
  hasTeamProgramAssignment,
  open,
  onOpenChange,
}: RemoveTeamMemberDialogProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [programAction, setProgramAction] = React.useState<'keep' | 'unassign'>(
    'keep'
  )

  React.useEffect(() => {
    if (!open) return
    setProgramAction('keep')
  }, [open])

  async function onConfirm() {
    setPending(true)
    const result = await removeTeamMember(teamId, clientId, {
      unassignProgram: programAction === 'unassign',
    })
    setPending(false)

    if (result.success) {
      if (programAction === 'keep') {
        toastSuccessWithUndo(`${clientName} removed from team`, async () => {
          const undoResult = await addTeamMember(teamId, { clientId })
          if (undoResult.success) {
            toast.success('Team membership restored')
            router.refresh()
          } else {
            toast.error(undoResult.error)
          }
        })
      } else {
        toast.success(`${clientName} removed from team`)
      }
      onOpenChange(false)
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {clientName}?</DialogTitle>
          <DialogDescription>
            They will no longer be part of this team.
          </DialogDescription>
        </DialogHeader>

        {hasTeamProgramAssignment && (
          <div className="space-y-2">
            <Label>Program assignment</Label>
            <Select
              value={programAction}
              onValueChange={(value) =>
                setProgramAction(value as 'keep' | 'unassign')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">
                  Keep their program and calendar
                </SelectItem>
                <SelectItem value="unassign">
                  Unassign the team program (remove program workouts)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Removing…' : 'Remove from team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
