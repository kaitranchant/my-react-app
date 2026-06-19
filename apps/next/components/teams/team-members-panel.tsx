'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { toast } from 'sonner'

import { AddTeamMemberDialog } from '@/components/teams/add-team-member-dialog'

import { TeamMembersBulkActions } from '@/components/teams/team-members-bulk-actions'
import { updateTeamMemberWeightClass } from '@/app/(dashboard)/teams/feature-actions'
import { RemoveTeamMemberDialog } from '@/components/teams/remove-team-member-dialog'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type {
  Client,
  Team,
  TeamEventWithMemberStatus,
  TeamMemberPerformance,
  TeamMemberWithClient,
} from 'app/types/database'

type TeamMembersPanelProps = {
  teamId: string
  team: Pick<Team, 'active_program_id' | 'program_start_date'>
  members: TeamMemberWithClient[]
  allClients: Pick<Client, 'id' | 'full_name' | 'status'>[]
  teamAssignedClientIds: string[]
  performanceByClientId: Record<string, TeamMemberPerformance>
  nextEvent: TeamEventWithMemberStatus | null
}

export function TeamMembersPanel({
  teamId,
  team,
  members,
  allClients,
  teamAssignedClientIds,
  performanceByClientId,
  nextEvent,
}: TeamMembersPanelProps) {
  const router = useRouter()
  const [removeTarget, setRemoveTarget] = React.useState<{
    clientId: string
    clientName: string
    hasTeamProgramAssignment: boolean
  } | null>(null)

  const memberClientIds = members.map((member) => member.client_id)

  async function saveWeightClass(clientId: string, value: string) {
    const result = await updateTeamMemberWeightClass(teamId, clientId, value)
    if (result.success) {
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-5 py-4">
        <CardTitle className="text-sm font-medium">
          {members.length} member{members.length === 1 ? '' : 's'}
        </CardTitle>
        <div className="flex items-center gap-2">
          <TeamMembersBulkActions teamId={teamId} nextEvent={nextEvent} />
          <AddTeamMemberDialog
          teamId={teamId}
          teamStartDate={team.program_start_date}
          activeProgramId={team.active_program_id}
          clients={allClients}
          memberClientIds={memberClientIds}
        />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="empty-state-icon">
              <Users className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No members yet</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Add clients to this team to assign them the same program.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {members.map((member) => {
              const stats = performanceByClientId[member.client.id]
              return (
                <li key={member.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link
                      href={`/clients/${member.client.id}`}
                      className="hover:text-brand flex min-w-0 flex-1 items-start gap-3 transition-colors"
                    >
                      <ClientAvatar
                        name={member.client.full_name}
                        avatarUrl={member.client.avatar_url}
                        size="sm"
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium">
                          {member.client.full_name}
                        </p>
                        <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 text-xs">
                          {stats && (
                            <>
                              <span>
                                {stats.completionRate !== null
                                  ? `${stats.completionRate}% this week`
                                  : 'No sessions this week'}
                              </span>
                              <span>· {stats.lastActiveLabel}</span>
                              <span>· ACWR {stats.acwrLabel}</span>
                            </>
                          )}
                        </div>
                        {stats && (
                          <Badge
                            variant={stats.onTrack ? 'success' : 'warning'}
                            className="mt-1"
                          >
                            {stats.onTrack ? 'On track' : 'Needs attention'}
                          </Badge>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                      <Input
                        defaultValue={member.weight_class ?? ''}
                        placeholder="Weight class"
                        className="h-8 w-28 text-xs"
                        onBlur={(event) => {
                          const next = event.target.value
                          if (next !== (member.weight_class ?? '')) {
                            void saveWeightClass(member.client.id, next)
                          }
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground shrink-0"
                        onClick={() =>
                          setRemoveTarget({
                            clientId: member.client.id,
                            clientName: member.client.full_name,
                            hasTeamProgramAssignment:
                              teamAssignedClientIds.includes(member.client.id),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      {removeTarget && (
        <RemoveTeamMemberDialog
          teamId={teamId}
          clientId={removeTarget.clientId}
          clientName={removeTarget.clientName}
          hasTeamProgramAssignment={removeTarget.hasTeamProgramAssignment}
          open={Boolean(removeTarget)}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null)
          }}
        />
      )}
    </Card>
  )
}
