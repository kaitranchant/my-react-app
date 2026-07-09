'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { leaveGym } from '@/app/(dashboard)/gym/actions'
import { DeleteGymDialog } from '@/components/gym/delete-gym-dialog'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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

  const leaveConfirm = useConfirmDialog({
    title: 'Leave this gym?',
    description:
      'You will lose access to clients who are members from other coaches.',
    confirmLabel: 'Leave gym',
    destructive: true,
    onConfirm: async () => {
      setLeavePending(true)
      const result = await leaveGym(gymId)
      setLeavePending(false)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('You left the gym.')
      router.refresh()
    },
  })

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
          <DeleteGymDialog gymId={gymId} gymName={gymName} />
        ) : (
          <Button
            variant="destructive"
            disabled={leavePending}
            onClick={leaveConfirm.open}
          >
            {leavePending ? 'Leaving…' : 'Leave gym'}
          </Button>
        )}
      </CardContent>
      {leaveConfirm.dialog}
    </Card>
  )
}
