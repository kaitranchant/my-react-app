import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  clientsListSuspenseKey,
  fetchClientsForListPage,
  type CoachGymTab,
} from '@/lib/clients-list-query'
import { ClientsList } from '@/components/clients/clients-list'
import { ClientsPagination } from '@/components/clients/clients-pagination'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FetchErrorState } from '@/components/ui/fetch-error-state'

type ClientsListCardProps = {
  searchParams: {
    q?: string
    status?: string
    page?: string
    scope?: string
  }
  userId?: string
  coachGyms: CoachGymTab[]
  gymInvitedOnly?: boolean
}

export async function ClientsListCard({
  searchParams,
  userId,
  coachGyms,
  gymInvitedOnly = false,
}: ClientsListCardProps) {
  const supabase = await createClient()
  const { q, status, page: pageParam, scope: scopeParam } = searchParams

  const data = await fetchClientsForListPage(supabase, {
    userId,
    coachGyms,
    q,
    status,
    scopeParam,
    pageParam,
    gymInvitedOnly,
  })

  const requestedPage = Math.max(
    1,
    Number.parseInt(pageParam ?? '1', 10) || 1
  )

  if (requestedPage > data.totalPages && data.totalCount > 0) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (data.scope !== 'all') params.set('scope', String(data.scope))
    if (data.totalPages > 1) params.set('page', String(data.totalPages))
    const query = params.toString()
    redirect(query ? `/clients?${query}` : '/clients')
  }

  const {
    clients,
    teamsByClientId,
    gymNamesById,
    coachNamesById,
    pendingOnboardingDocsByClientId,
  } = data

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-4">
        <CardTitle className="text-muted-foreground">
          {data.totalCount} user{data.totalCount === 1 ? '' : 's'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.error ? (
          <FetchErrorState title="Couldn't load clients" />
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <div className="empty-state-icon">
              <Users className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="section-header">No clients found</p>
              <p className="helper-text max-w-sm">
                {q || status || data.scope !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first client to get started.'}
              </p>
            </div>
          </div>
        ) : (
          <ClientsList
            clients={clients}
            teamsByClientId={teamsByClientId}
            gymNamesById={gymNamesById}
            coachNamesById={coachNamesById}
            pendingOnboardingDocsByClientId={pendingOnboardingDocsByClientId}
            currentCoachId={userId}
          />
        )}
        {!data.error && data.totalCount > 0 && (
          <ClientsPagination
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            searchParams={{ q, status, scope: String(data.scope) }}
          />
        )}
      </CardContent>
    </Card>
  )
}

export { clientsListSuspenseKey }
