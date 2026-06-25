'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { removeGymMember } from '@/app/(dashboard)/gym/actions'
import { Badge } from '@/components/ui/badge'
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
import type { GymMemberWithProfile } from 'app/types/database'

export function GymMembersPanel({
  gymId,
  members,
  currentUserId,
  isOwner,
}: {
  gymId: string
  members: GymMemberWithProfile[]
  currentUserId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const memberToRemoveRef = React.useRef<{ id: string; name: string } | null>(
    null
  )

  const removeConfirm = useConfirmDialog({
    title: 'Remove coach from gym?',
    description:
      'They will lose access to gym member clients.',
    confirmLabel: 'Remove coach',
    destructive: true,
    onConfirm: async () => {
      const member = memberToRemoveRef.current
      if (!member) return

      setRemovingId(member.id)
      const result = await removeGymMember(gymId, member.id)
      setRemovingId(null)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Coach removed.')
      memberToRemoveRef.current = null
      router.refresh()
    },
  })

  function requestRemove(memberId: string, name: string) {
    memberToRemoveRef.current = { id: memberId, name }
    removeConfirm.open()
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Coach</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {isOwner ? <TableHead className="w-24" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const name =
            member.profile?.full_name ??
            member.profile?.business_name ??
            'Coach'
          const isSelf = member.coach_id === currentUserId

          return (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {name}
                {isSelf ? (
                  <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                  {member.role === 'owner' ? 'Owner' : 'Coach'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(member.joined_at).toLocaleDateString()}
              </TableCell>
              {isOwner ? (
                <TableCell>
                  {member.role !== 'owner' && !isSelf ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removingId === member.id}
                      onClick={() => requestRemove(member.id, name)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
    {removeConfirm.dialog}
    </>
  )
}
