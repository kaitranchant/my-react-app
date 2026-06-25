'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  getGymInviteLink,
  revokeGymInvite,
} from '@/app/(dashboard)/gym/actions'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GymInvite } from 'app/types/database'

export function GymInvitesPanel({
  gymId,
  invites,
}: {
  gymId: string
  invites: GymInvite[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const inviteToRevokeRef = React.useRef<string | null>(null)

  const revokeConfirm = useConfirmDialog({
    title: 'Revoke invite?',
    description: 'The invite link will stop working immediately.',
    confirmLabel: 'Revoke invite',
    destructive: true,
    onConfirm: async () => {
      const inviteId = inviteToRevokeRef.current
      if (!inviteId) return

      setBusyId(inviteId)
      const result = await revokeGymInvite(gymId, inviteId)
      setBusyId(null)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Invite revoked.')
      inviteToRevokeRef.current = null
      router.refresh()
    },
  })

  function requestRevoke(inviteId: string) {
    inviteToRevokeRef.current = inviteId
    revokeConfirm.open()
  }

  async function copyLink(inviteId: string) {
    setBusyId(inviteId)
    const result = await getGymInviteLink(gymId, inviteId)
    setBusyId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    await navigator.clipboard.writeText(result.inviteUrl)
    toast.success('Invite link copied.')
  }

  if (invites.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No pending invites.
      </p>
    )
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Email</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell>{invite.email}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(invite.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="space-x-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === invite.id}
                onClick={() => copyLink(invite.id)}
              >
                Copy link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === invite.id}
                onClick={() => requestRevoke(invite.id)}
              >
                Revoke
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {revokeConfirm.dialog}
    </>
  )
}
