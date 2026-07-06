import { Suspense } from 'react'
import { Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getGymsForCoach } from '@/lib/gym-access'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import {
  ClientsListCard,
  clientsListSuspenseKey,
} from '@/components/clients/clients-list-card'
import { ClientsToolbar } from '@/components/clients/clients-toolbar'
import { ClientsScopeTabs } from '@/components/clients/clients-scope-tabs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import {
  AddClientButtonSkeleton,
  ClientsListCardSkeleton,
  ScopeTabsSkeleton,
} from '@/components/dashboard/async-fallback-skeletons'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Users — Coaching App',
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; scope?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const gymTabs = coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Users"
        description="Manage your clients, their programs, and progress in one place."
      >
        <Suspense fallback={<AddClientButtonSkeleton />}>
          <AddClientDialog
            gyms={gymTabs}
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
            <ClientsScopeTabs gyms={gymTabs} />
            <ClearPageFilters pageKey="clients" filterKeys={['scope']} />
          </div>
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <ClientsToolbar />
      </Suspense>

      <Suspense
        key={clientsListSuspenseKey(resolvedSearchParams)}
        fallback={<ClientsListCardSkeleton />}
      >
        <ClientsListCard
          searchParams={resolvedSearchParams}
          userId={user?.id}
          coachGyms={gymTabs}
        />
      </Suspense>
    </div>
  )
}
