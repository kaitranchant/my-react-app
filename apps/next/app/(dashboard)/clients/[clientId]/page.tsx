import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Pencil } from 'lucide-react'

import { BreadcrumbSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { createClient } from '@/lib/supabase/server'
import { isCoachSelfClient } from '@/lib/coach-self'
import { getGymsForCoach, isPrimaryCoach } from '@/lib/gym-access'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientAccountBanner } from '@/components/clients/client-account-banner'
import { ClientQuickActions } from '@/components/clients/client-quick-actions'
import { ClientDetailOverflowMenu } from '@/components/clients/client-detail-overflow-menu'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { resolveClientDetailMainTab } from '@/lib/client-detail-tabs'
import { ClientDetailNutritionPanel } from '@/components/clients/client-detail-nutrition-panel'
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
} from '@/components/gym/client-gym-share-toggle'
import { ClientSharedBanner } from '@/components/gym/client-gym-badge'
import { ClientUserTypeBadge } from '@/components/clients/client-user-type-badge'
import { StatusBadge } from '@/components/clients/status-badge'
import { ClientDetailBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'
import { fetchClientOnboardingDocumentsSummary } from '@/lib/onboarding-data'
import type { Client, ClientTeamMembership } from 'app/types/database'

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ tab?: string; section?: string; action?: string; date?: string }>
}) {
  const { clientId } = await params
  const { tab: initialTab, section: initialSection } = await searchParams
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

  const client = data as Client
  const coachSelf = isCoachSelfClient(client)
  const activeTab =
    coachSelf && resolveClientDetailMainTab(initialTab, initialSection) === 'messages'
      ? 'overview'
      : resolveClientDetailMainTab(initialTab, initialSection)
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

  const onboardingDocuments =
    user && !coachSelf
      ? await fetchClientOnboardingDocumentsSummary(supabase, clientId, user.id)
      : null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Suspense fallback={<BreadcrumbSkeleton />}>
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
                <ClientUserTypeBadge client={client} />
                <ClientTeamBadges memberships={teamMemberships} />
                {!viewerIsPrimaryCoach && coachGyms.length > 0 ? (
                  <ClientGymMemberBadge client={client} gyms={coachGyms} />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClientQuickActions clientId={client.id} />
            {!coachSelf ? (
              <ClientFormDialog
                client={client}
                trigger={
                  <Button variant="outline">
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                }
              />
            ) : null}
            {!coachSelf && onboardingDocuments ? (
              <ClientDetailOverflowMenu
                client={client}
                clientName={client.full_name}
                initialAssessmentNotes={client.onboarding_assessment_notes}
                onboardingDocuments={onboardingDocuments}
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

      {!coachSelf ? <ClientAccountBanner client={client} /> : null}

      <ClientDetailTabs activeTab={activeTab} hideMessagesTab={coachSelf}>
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
              isCoachSelf={coachSelf}
            />
          ) : null}
          {activeTab === 'nutrition' ? (
            <ClientDetailNutritionPanel client={client} clientId={clientId} />
          ) : null}
          {activeTab === 'progress' ? (
            <ClientDetailProgressPanel
              client={client}
              clientId={clientId}
              coachUserId={user?.id ?? null}
            />
          ) : null}
          {activeTab === 'messages' && !coachSelf ? (
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
