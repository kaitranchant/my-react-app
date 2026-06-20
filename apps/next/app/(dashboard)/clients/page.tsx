import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getGymsForCoach } from '@/lib/gym-access'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientsToolbar } from '@/components/clients/clients-toolbar'
import { ClientsScopeTabs } from '@/components/clients/clients-scope-tabs'
import { ClientsPagination } from '@/components/clients/clients-pagination'
import { ClientRowActions } from '@/components/clients/client-row-actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { ClientInviteStatusBadge } from '@/components/clients/client-invite-status-badge'
import { ClientTeamBadges } from '@/components/teams/client-team-badges'
import { ClientGymBadge } from '@/components/gym/client-gym-badge'
import { ClientCoachingTypeBadge } from '@/components/clients/client-coaching-type-badge'
import { StatusBadge } from '@/components/clients/status-badge'
import { PageHeader } from '@/components/dashboard/page-header'
import { CLIENTS_PAGE_SIZE } from '@/lib/constants'
import { clientStatuses } from '@/lib/validations/client'
import type { Client, ClientStatus, ClientTeamMembership } from 'app/types/database'

export const metadata = {
  title: 'Clients — Coaching App',
}

function isStatus(value: string): value is ClientStatus {
  return (clientStatuses as readonly string[]).includes(value)
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; scope?: string }>
}) {
  const { q, status, page: pageParam, scope: scopeParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const rawScope = scopeParam ?? 'all'
  const scope =
    rawScope === 'personal'
      ? 'personal'
      : rawScope === 'gym' && coachGyms.length === 1
        ? coachGyms[0].id
        : coachGymIds.has(rawScope)
          ? rawScope
          : 'all'

  let queryBuilder = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('is_coach_self', false)
    .order('created_at', { ascending: false })

  if (user && scope === 'personal') {
    queryBuilder = queryBuilder.is('gym_id', null)
  } else if (user && coachGymIds.has(scope)) {
    queryBuilder = queryBuilder.eq('gym_id', scope)
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    queryBuilder = queryBuilder.or(
      `full_name.ilike.${term},email.ilike.${term}`
    )
  }

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  const requestedPage = Math.max(
    1,
    Number.parseInt(pageParam ?? '1', 10) || 1
  )
  const from = (requestedPage - 1) * CLIENTS_PAGE_SIZE
  const to = from + CLIENTS_PAGE_SIZE - 1

  const { data, error, count } = await queryBuilder.range(from, to)
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE))

  if (requestedPage > totalPages && totalCount > 0) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (scope !== 'all') params.set('scope', scope)
    if (totalPages > 1) params.set('page', String(totalPages))
    const query = params.toString()
    redirect(query ? `/clients?${query}` : '/clients')
  }

  const page = Math.min(requestedPage, totalPages)
  const clients = (data ?? []) as Client[]

  const coachNamesById = new Map<string, string>()
  const gymNamesById = new Map(coachGyms.map((gym) => [gym.id, gym.name]))
  const otherCoachIds = Array.from(
    new Set(
      clients
        .filter((client) => user && client.coach_id !== user.id)
        .map((client) => client.coach_id)
    )
  )

  if (otherCoachIds.length > 0) {
    const { data: coachRows } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', otherCoachIds)

    for (const coach of coachRows ?? []) {
      coachNamesById.set(
        coach.id,
        coach.full_name ?? coach.business_name ?? 'Coach'
      )
    }
  }

  const missingGymIds = Array.from(
    new Set(
      clients
        .map((client) => client.gym_id)
        .filter((gymId): gymId is string => gymId !== null && !gymNamesById.has(gymId))
    )
  )

  if (missingGymIds.length > 0) {
    const { data: gymRows } = await supabase
      .from('gyms')
      .select('id, name')
      .in('id', missingGymIds)

    for (const gym of gymRows ?? []) {
      gymNamesById.set(gym.id, gym.name)
    }
  }

  const teamsByClientId = new Map<string, ClientTeamMembership[]>()

  if (clients.length > 0) {
    const clientIds = clients.map((client) => client.id)
    const { data: memberRows } = await supabase
      .from('team_members')
      .select('client_id, team:teams(id, name)')
      .in('client_id', clientIds)

    for (const row of memberRows ?? []) {
      const team = row.team as { id: string; name: string } | null
      if (!team) continue
      const existing = teamsByClientId.get(row.client_id) ?? []
      existing.push({ team })
      teamsByClientId.set(row.client_id, existing)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Clients"
        description="Manage your clients, their programs, and progress in one place."
      />

      {coachGyms.length > 0 ? (
        <Suspense fallback={null}>
          <ClientsScopeTabs
            gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
          />
        </Suspense>
      ) : null}

      <ClientsToolbar
        gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
      />

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {totalCount} client{totalCount === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="text-destructive p-6 text-sm">
              Could not load clients: {error.message}
            </p>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="empty-state-icon">
                <Users className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No clients found</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {q || status || scope !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Add your first client to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
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
                {clients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="pl-5 font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-foreground hover:text-brand flex items-center gap-3 font-medium transition-colors"
                      >
                        <ClientAvatar
                          name={client.full_name}
                          avatarUrl={client.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="block truncate">{client.full_name}</span>
                          {client.gym_id ? (
                            <ClientGymBadge
                              gymName={gymNamesById.get(client.gym_id)}
                              isOwnClient={user?.id === client.coach_id}
                              primaryCoachName={coachNamesById.get(client.coach_id)}
                            />
                          ) : null}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.status} />
                    </TableCell>
                    <TableCell>
                      <ClientInviteStatusBadge status={client.invite_status} />
                    </TableCell>
                    <TableCell>
                      {client.coaching_type ? (
                        <ClientCoachingTypeBadge coachingType={client.coaching_type} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(teamsByClientId.get(client.id) ?? []).length > 0 ? (
                        <ClientTeamBadges
                          memberships={teamsByClientId.get(client.id) ?? []}
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
                ))}
              </TableBody>
            </Table>
          )}
          {!error && totalCount > 0 && (
            <ClientsPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              searchParams={{ q, status, scope }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
