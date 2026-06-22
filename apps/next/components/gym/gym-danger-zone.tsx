'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  deleteGymRecord,
  leaveGym,
} from '@/app/(dashboard)/gym/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export function GymDangerZone({
  gymId,
  gymName,
  isOwner,
}: {
  gymId: string
  gymName: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [leavePending, setLeavePending] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState(false)
  const [confirmation, setConfirmation] = React.useState('')

  React.useEffect(() => {
    if (!deleteOpen) {
      setConfirmation('')
    }
  }, [deleteOpen])

  async function handleLeave() {
    if (
      !window.confirm(
        'Leave this gym? You will lose access to clients who are members from other coaches.'
      )
    ) {
      return
    }

    setLeavePending(true)
    const result = await leaveGym(gymId)
    setLeavePending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('You left the gym.')
    router.refresh()
  }

  async function handleDelete() {
    setDeletePending(true)
    const result = await deleteGymRecord(gymId)
    setDeletePending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Gym deleted.')
    setDeleteOpen(false)
    router.refresh()
  }

  const deleteConfirmed = confirmation === gymName

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          {isOwner
            ? 'Delete the gym for all members.'
            : 'Leave the gym and lose access to gym member clients.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOwner ? (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete gym</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete {gymName}?</DialogTitle>
                <DialogDescription>
                  This permanently deletes the gym for all coaches and clears
                  client memberships tied to it. This cannot be undone.
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
                  onClick={() => setDeleteOpen(false)}
                  disabled={deletePending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!deleteConfirmed || deletePending}
                  onClick={handleDelete}
                >
                  {deletePending ? 'Deleting…' : 'Delete gym'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            variant="destructive"
            disabled={leavePending}
            onClick={handleLeave}
          >
            {leavePending ? 'Leaving…' : 'Leave gym'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
