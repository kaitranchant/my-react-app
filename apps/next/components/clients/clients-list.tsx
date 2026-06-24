'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, PauseCircle, PlayCircle, X } from 'lucide-react'
import { toast } from 'sonner'

import { bulkSetClientStatus } from '@/app/(dashboard)/clients/actions'
import { ClientUserTypeBadge } from '@/components/clients/client-user-type-badge'
import { ClientInviteStatusBadge } from '@/components/clients/client-invite-status-badge'
import { ClientRowActions } from '@/components/clients/client-row-actions'
import { StatusBadge } from '@/components/clients/status-badge'
import { ClientGymBadge } from '@/components/gym/client-gym-badge'
import { ClientTeamBadges } from '@/components/teams/client-team-badges'
import { Button } from '@/components/ui/button'
import { PersonRow } from '@/components/ui/person-row'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Client, ClientStatus, ClientTeamMembership } from 'app/types/database'

type ClientsListProps = {
  clients: Client[]
  teamsByClientId: Record<string, ClientTeamMembership[]>
  gymNamesById: Record<string, string>
  coachNamesById: Record<string, string>
  currentCoachId?: string
}

export function ClientsList({
  clients,
  teamsByClientId,
  gymNamesById,
  coachNamesById,
  currentCoachId,
}: ClientsListProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [pending, setPending] = React.useState(false)

  const selectedCount = selectedIds.size
  const selectableClients = clients.filter((client) => !client.is_coach_self)
  const allSelected =
    selectableClients.length > 0 && selectedCount === selectableClients.length

  function toggleOne(clientId: string, checked: boolean) {
    const client = clients.find((entry) => entry.id === clientId)
    if (client?.is_coach_self) return

    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(clientId)
      } else {
        next.delete(clientId)
      }
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked
        ? new Set(clients.filter((client) => !client.is_coach_self).map((client) => client.id))
        : new Set()
    )
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function applyStatus(status: ClientStatus) {
    if (selectedCount === 0 || pending) return

    setPending(true)
    const result = await bulkSetClientStatus(Array.from(selectedIds), status)
    setPending(false)

    if (result.success) {
      toast.success(
        `Updated ${result.count ?? selectedCount} client${(result.count ?? selectedCount) === 1 ? '' : 's'}`
      )
      clearSelection()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {clients.map((client) => {
          const isSelected = selectedIds.has(client.id)

          return (
            <Card
              key={client.id}
              className={cn('py-0', isSelected && 'border-brand/40 bg-brand/[0.03]')}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  {!client.is_coach_self ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${client.full_name}`}
                      checked={isSelected}
                      onChange={(event) =>
                        toggleOne(client.id, event.target.checked)
                      }
                      className="accent-brand mt-1 size-4 shrink-0"
                    />
                  ) : (
                    <div className="mt-1 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <PersonRow
                      name={client.full_name}
                      avatarUrl={client.avatar_url}
                      href={`/clients/${client.id}`}
                      meta={
                        client.gym_id ? (
                          <ClientGymBadge
                            gymName={gymNamesById[client.gym_id]}
                            isOwnClient={currentCoachId === client.coach_id}
                            primaryCoachName={coachNamesById[client.coach_id]}
                          />
                        ) : null
                      }
                    />
                    {client.email ? (
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {client.email}
                      </p>
                    ) : null}
                  </div>
                  <ClientRowActions client={client} />
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-7">
                  <StatusBadge status={client.status} />
                  {!client.is_coach_self ? (
                    <ClientInviteStatusBadge status={client.invite_status} />
                  ) : null}
                  <ClientUserTypeBadge client={client} />
                </div>

                {(teamsByClientId[client.id] ?? []).length > 0 ? (
                  <div className="pl-7">
                    <ClientTeamBadges
                      memberships={teamsByClientId[client.id] ?? []}
                    />
                  </div>
                ) : null}

                {client.goal ? (
                  <p className="text-muted-foreground pl-7 text-xs">
                    <span className="text-foreground font-medium">Goal:</span>{' '}
                    {client.goal}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Table className="group/table hidden md:table">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-5">
              <input
                type="checkbox"
                aria-label="Select all clients on this page"
                checked={allSelected}
                onChange={(event) => toggleAll(event.target.checked)}
                className={cn(
                  'accent-brand size-4 transition-opacity',
                  selectedCount > 0
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/table:opacity-100 focus-visible:opacity-100'
                )}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Teams</TableHead>
            <TableHead>Goal</TableHead>
            <TableHead className="w-12 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const isSelected = selectedIds.has(client.id)

            return (
              <TableRow
                key={client.id}
                className={cn('group', isSelected && 'bg-brand/[0.03]')}
              >
                <TableCell className="pl-5">
                  {!client.is_coach_self ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${client.full_name}`}
                      checked={isSelected}
                      onChange={(event) => toggleOne(client.id, event.target.checked)}
                      className={cn(
                        'accent-brand size-4 transition-opacity',
                        isSelected || selectedCount > 0
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                      )}
                    />
                  ) : null}
                </TableCell>
                <TableCell>
                  <PersonRow
                    name={client.full_name}
                    avatarUrl={client.avatar_url}
                    href={`/clients/${client.id}`}
                    meta={
                      client.gym_id ? (
                        <ClientGymBadge
                          gymName={gymNamesById[client.gym_id]}
                          isOwnClient={currentCoachId === client.coach_id}
                          primaryCoachName={coachNamesById[client.coach_id]}
                        />
                      ) : null
                    }
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.email ?? '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={client.status} />
                </TableCell>
                <TableCell>
                  {!client.is_coach_self ? (
                    <ClientInviteStatusBadge status={client.invite_status} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {client.is_coach_self || client.coaching_type ? (
                    <ClientUserTypeBadge client={client} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {(teamsByClientId[client.id] ?? []).length > 0 ? (
                    <ClientTeamBadges
                      memberships={teamsByClientId[client.id] ?? []}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate">
                  {client.goal ?? '—'}
                </TableCell>
                <TableCell className="pr-5">
                  <ClientRowActions client={client} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {selectedCount > 0 ? (
        <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_oklch(0_0_0/0.08)] backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                aria-label="Clear selection"
              >
                <X className="size-4" />
              </Button>
              <p className="text-sm font-medium">
                {selectedCount} selected
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void applyStatus('active')}
              >
                <PlayCircle className="size-4" />
                Mark active
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void applyStatus('paused')}
              >
                <PauseCircle className="size-4" />
                Mark paused
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void applyStatus('archived')}
              >
                <Archive className="size-4" />
                Archive
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void applyStatus('active')}
              >
                <ArchiveRestore className="size-4" />
                Restore
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
