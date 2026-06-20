'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  getGymInviteLink,
  revokeGymInvite,
} from '@/app/(dashboard)/gym/actions'
import { Button } from '@/components/ui/button'
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

  async function revoke(inviteId: string) {
    if (!window.confirm('Revoke this invite?')) return

    setBusyId(inviteId)
    const result = await revokeGymInvite(gymId, inviteId)
    setBusyId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Invite revoked.')
    router.refresh()
  }

  if (invites.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No pending invites.
      </p>
    )
  }

  return (
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
                onClick={() => revoke(invite.id)}
              >
                Revoke
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
