'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { deleteGymRecord } from '@/app/(dashboard)/gym/actions'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DeleteGymDialogProps = {
  gymId: string
  gymName: string
  trigger?: React.ReactNode
  onDeleted?: () => void
}

export function DeleteGymDialog({
  gymId,
  gymName,
  trigger,
  onDeleted,
}: DeleteGymDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [confirmation, setConfirmation] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setConfirmation('')
    }
  }, [open])

  async function handleDelete() {
    setPending(true)
    const result = await deleteGymRecord(gymId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Gym deleted.')
    setOpen(false)
    onDeleted?.()
    router.push('/gym')
    router.refresh()
  }

  const deleteConfirmed = confirmation === gymName

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="destructive">Delete gym</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {gymName}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the gym for all coaches and clears client
            memberships tied to it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-gym-confirmation">
            Type <span className="font-medium">{gymName}</span> to confirm
          </Label>
          <Input
            id="delete-gym-confirmation"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={gymName}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!deleteConfirmed || pending}
            onClick={handleDelete}
          >
            {pending ? 'Deleting…' : 'Delete gym'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
