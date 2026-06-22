'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, ClipboardList, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'

import {
  markAllTeamEventPresent,
  restoreTeamEventAttendanceBatch,
} from '@/app/(dashboard)/teams/feature-actions'
import { toastSuccessWithUndo } from '@/lib/toast-undo'
import { buildTeamEventAttendanceSnapshot } from '@/lib/team-event-attendance-snapshot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TeamEventWithMemberStatus } from 'app/types/database'

type TeamMembersBulkActionsProps = {
  teamId: string
  nextEvent: TeamEventWithMemberStatus | null
  memberClientIds: string[]
}

export function TeamMembersBulkActions({
  teamId,
  nextEvent,
  memberClientIds,
}: TeamMembersBulkActionsProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleMarkAllPresent() {
    if (!nextEvent) return

    const snapshot = buildTeamEventAttendanceSnapshot(
      memberClientIds,
      nextEvent.memberStatuses
    )

    setPending(true)
    const result = await markAllTeamEventPresent(teamId, nextEvent.id)
    setPending(false)
    if (result.success) {
      toastSuccessWithUndo('All members marked present', async () => {
        const undoResult = await restoreTeamEventAttendanceBatch(
          teamId,
          nextEvent.id,
          snapshot
        )
        if (undoResult.success) {
          toast.success('Attendance restored')
          router.refresh()
        } else {
          toast.error(undoResult.error)
        }
      })
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={pending}>
          Bulk actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            router.push(`/teams/${teamId}?tab=schedule`, { scroll: false })
          }
        >
          <CalendarCheck className="size-4" />
          Open team schedule
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            router.push(`/teams/${teamId}?tab=program`, { scroll: false })
          }
        >
          <ClipboardList className="size-4" />
          Assign / change program
        </DropdownMenuItem>
        {nextEvent && (
          <DropdownMenuItem onSelect={handleMarkAllPresent}>
            <Dumbbell className="size-4" />
            Mark all present — {nextEvent.title}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
