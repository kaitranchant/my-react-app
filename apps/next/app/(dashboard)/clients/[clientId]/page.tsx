import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { isCoachSelfClient } from '@/lib/coach-self'
import { getGymsForCoach, isPrimaryCoach } from '@/lib/gym-access'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientAccountBanner } from '@/components/clients/client-account-banner'
import { ClientQuickActions } from '@/components/clients/client-quick-actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { resolveClientDetailMainTab } from '@/lib/client-detail-tabs'
import { ClientDetailMessagesPanel } from '@/components/clients/client-detail-messages-panel'
import { ClientDetailOverviewPanel } from '@/components/clients/client-detail-overview-panel'
import { ClientDetailProgressPanel } from '@/components/clients/client-detail-progress-panel'
import { ClientDetailTrainingPanel } from '@/components/clients/client-detail-training-panel'
import {
  clientDetailTabSkeleton,
} from '@/components/clients/client-detail-tab-skeletons'
import { ClientTeamBadges } from '@/components/teams/client-team-badges'
import {
  ClientGymMemberBadge,
  ClientGymShareMenu,
} from '@/components/gym/client-gym-share-toggle'
import { ClientSharedBanner } from '@/components/gym/client-gym-badge'
import { ClientCoachingTypeBadge } from '@/components/clients/client-coaching-type-badge'
import { StatusBadge } from '@/components/clients/status-badge'
import { ClientDetailBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'
import type { Client, ClientTeamMembership } from 'app/types/database'

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ tab?: string; section?: string; action?: string; date?: string }>
}) {
  const { clientId } = await params
  const { tab: initialTab } = await searchParams
  const activeTab = resolveClientDetailMainTab(initialTab)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []

  const [{ data }, teamMembershipsResult] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
    supabase
      .from('team_members')
      .select('team:teams(id, name)')
      .eq('client_id', clientId),
  ])

  if (!data) {
    notFound()
  }

  if (isCoachSelfClient(data as Client)) {
    redirect('/my-workouts')
  }

  const client = data as Client
  const viewerIsPrimaryCoach = user
    ? isPrimaryCoach(user.id, client)
    : false

  let primaryCoachName: string | null = null
  if (!viewerIsPrimaryCoach) {
    const { data: primaryCoach } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', client.coach_id)
      .maybeSingle()

    primaryCoachName =
      primaryCoach?.full_name ??
      primaryCoach?.business_name ??
      'Primary coach'
  }

  const teamMemberships = ((teamMembershipsResult.data ?? []) as {
    team: { id: string; name: string } | null
  }[])
    .filter((row) => row.team)
    .map((row) => ({ team: row.team! })) as ClientTeamMembership[]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Suspense fallback={null}>
        <ClientDetailBreadcrumbs
          clientId={clientId}
          clientName={client.full_name}
        />
      </Suspense>

      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ClientAvatar
              name={client.full_name}
              avatarUrl={client.avatar_url}
              size="lg"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="page-title">
                  {client.full_name}
                </h1>
                <StatusBadge status={client.status} />
              </div>
              {client.email && (
                <p className="helper-text">{client.email}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {client.coaching_type && (
                  <ClientCoachingTypeBadge coachingType={client.coaching_type} />
                )}
                <ClientTeamBadges memberships={teamMemberships} />
                {!viewerIsPrimaryCoach && coachGyms.length > 0 ? (
                  <ClientGymMemberBadge client={client} gyms={coachGyms} />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClientQuickActions clientId={client.id} />
            <ClientFormDialog
              client={client}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" />
                  Edit
                </Button>
              }
            />
            {coachGyms.length > 0 ? (
              <ClientGymShareMenu
                client={client}
                gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
                isPrimaryCoach={viewerIsPrimaryCoach}
              />
            ) : null}
          </div>
        </div>
      </section>

      {!viewerIsPrimaryCoach && primaryCoachName ? (
        <ClientSharedBanner primaryCoachName={primaryCoachName} />
      ) : null}

      <ClientAccountBanner client={client} />

      <ClientDetailTabs activeTab={activeTab}>
        <Suspense fallback={clientDetailTabSkeleton(activeTab)}>
          {activeTab === 'overview' ? (
            <ClientDetailOverviewPanel
              client={client}
              clientId={clientId}
              coachUserId={user?.id ?? null}
            />
          ) : null}
          {activeTab === 'training' ? (
            <ClientDetailTrainingPanel
              clientId={clientId}
              clientName={client.full_name}
              coachUserId={user?.id ?? null}
            />
          ) : null}
          {activeTab === 'progress' ? (
            <ClientDetailProgressPanel
              client={client}
              clientId={clientId}
              coachUserId={user?.id ?? null}
            />
          ) : null}
          {activeTab === 'messages' ? (
            <ClientDetailMessagesPanel
              clientId={clientId}
              clientName={client.full_name}
            />
          ) : null}
        </Suspense>
      </ClientDetailTabs>
    </div>
  )
}
