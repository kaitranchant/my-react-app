'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteTeamRecord } from '@/app/(dashboard)/teams/actions'
import { TeamFormDialog } from '@/components/teams/team-form-dialog'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Team } from 'app/types/database'

export function TeamRowActions({
  team,
  isPrimaryCoach = true,
  gyms = [],
}: {
  team: Team
  isPrimaryCoach?: boolean
  gyms?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const deleteConfirm = useConfirmDialog({
    title: `Delete ${team.name}?`,
    description:
      'Members will be removed from the team but their calendars are unchanged.',
    confirmLabel: 'Delete team',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await deleteTeamRecord(team.id)
      setPending(false)
      if (result.success) {
        toast.success('Team deleted')
        router.refresh()
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  if (!isPrimaryCoach) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={deleteConfirm.open}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TeamFormDialog
        team={team}
        gyms={gyms}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      {deleteConfirm.dialog}
    </>
  )
}
