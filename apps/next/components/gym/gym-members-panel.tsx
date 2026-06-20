'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { removeGymMember } from '@/app/(dashboard)/gym/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  async function handleRemove(memberId: string, name: string) {
    if (
      !window.confirm(`Remove ${name} from the gym? They will lose access to gym member clients.`)
    ) {
      return
    }

    setRemovingId(memberId)
    const result = await removeGymMember(gymId, memberId)
    setRemovingId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Member removed.')
    router.refresh()
  }

  return (
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
            member.profile.full_name ??
            member.profile.business_name ??
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
                  {member.role === 'owner' ? 'Owner' : 'Member'}
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
                      onClick={() => handleRemove(member.id, name)}
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
  )
}
