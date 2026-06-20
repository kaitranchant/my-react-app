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

export function GymDangerZone({
  gymId,
  isOwner,
}: {
  gymId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleLeave() {
    if (
      !window.confirm(
        'Leave this gym? You will lose access to clients who are members from other coaches.'
      )
    ) {
      return
    }

    setPending(true)
    const result = await leaveGym(gymId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('You left the gym.')
    router.refresh()
  }

  async function handleDelete() {
    if (
      !window.confirm(
        'Delete this gym permanently? All coach members will be removed and client memberships will be cleared.'
      )
    ) {
      return
    }

    setPending(true)
    const result = await deleteGymRecord(gymId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Gym deleted.')
    router.refresh()
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base">Danger zone</CardTitle>
        <CardDescription>
          {isOwner
            ? 'Delete the gym for all members.'
            : 'Leave the gym and lose access to gym member clients.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOwner ? (
          <Button variant="destructive" disabled={pending} onClick={handleDelete}>
            {pending ? 'Deleting…' : 'Delete gym'}
          </Button>
        ) : (
          <Button variant="destructive" disabled={pending} onClick={handleLeave}>
            {pending ? 'Leaving…' : 'Leave gym'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
