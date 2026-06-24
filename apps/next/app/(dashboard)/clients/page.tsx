import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Plus, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getGymsForCoach } from '@/lib/gym-access'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ClientsList } from '@/components/clients/clients-list'
import { ClientsToolbar } from '@/components/clients/clients-toolbar'
import { ClientsScopeTabs } from '@/components/clients/clients-scope-tabs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { ClientsPagination } from '@/components/clients/clients-pagination'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { AddClientButtonSkeleton, ScopeTabsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
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

  const teamsByClientIdRecord = Object.fromEntries(teamsByClientId) as Record<
    string,
    ClientTeamMembership[]
  >
  const gymNamesByIdRecord = Object.fromEntries(gymNamesById) as Record<
    string,
    string
  >
  const coachNamesByIdRecord = Object.fromEntries(coachNamesById) as Record<
    string,
    string
  >

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Clients"
        description="Manage your clients, their programs, and progress in one place."
      >
        <Suspense fallback={<AddClientButtonSkeleton />}>
          <AddClientDialog
            gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
            trigger={
              <Button variant="brand">
                <Plus className="size-4" />
                Add client
              </Button>
            }
          />
        </Suspense>
      </PageHeader>

      {coachGyms.length > 0 ? (
        <Suspense fallback={<ScopeTabsSkeleton />}>
          <PageFilterPersistence pageKey="clients" filterKeys={['scope']} />
          <div className="space-y-3">
            <ClientsScopeTabs
              gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
            />
            <ClearPageFilters pageKey="clients" filterKeys={['scope']} />
          </div>
        </Suspense>
      ) : null}

      <ClientsToolbar />

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">
            {totalCount} client{totalCount === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="text-destructive body-text p-6">
              Could not load clients: {error.message}
            </p>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="empty-state-icon">
                <Users className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="section-header">No clients found</p>
                <p className="helper-text max-w-sm">
                  {q || status || scope !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Add your first client to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <ClientsList
              clients={clients}
              teamsByClientId={teamsByClientIdRecord}
              gymNamesById={gymNamesByIdRecord}
              coachNamesById={coachNamesByIdRecord}
              currentCoachId={user?.id}
            />
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
