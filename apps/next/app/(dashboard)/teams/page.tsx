import { Suspense } from 'react'
import { Plus } from 'lucide-react'

import { ScopeTabsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionGate } from '@/lib/subscription-server'
import { getCoachGymAccessMode, getGymsForCoach, isGymInvitedOnlyCoach } from '@/lib/gym-access'
import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { ClientsScopeTabs } from '@/components/clients/clients-scope-tabs'
import { TeamFormDialog } from '@/components/teams/team-form-dialog'
import { TeamsToolbar } from '@/components/teams/teams-toolbar'
import {
  TeamsListCard,
  teamsListSuspenseKey,
} from '@/components/teams/teams-list-card'
import {
  TeamsListCardSkeleton,
} from '@/components/dashboard/async-fallback-skeletons'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Teams — Coaching App',
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>
}) {
  const gate = await getSubscriptionGate('teams')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Teams"
          description="Group clients who share the same workout program and calendar."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const gymTabs = coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))
  const accessMode = user ? await getCoachGymAccessMode(user.id) : 'independent'
  const gymInvitedOnly = isGymInvitedOnlyCoach(accessMode)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Teams"
        description={
          gymInvitedOnly
            ? 'Manage teams shared with your gym rosters.'
            : 'Group clients who share the same workout program and calendar.'
        }
      >
        <TeamFormDialog
          gyms={gymTabs}
          requireGymMembership={gymInvitedOnly}
          trigger={
            <Button variant="brand">
              <Plus className="size-4" />
              Create team
            </Button>
          }
        />
      </PageHeader>

      <TeamsToolbar />

      {coachGyms.length > 0 ? (
        <Suspense fallback={<ScopeTabsSkeleton />}>
          <ClientsScopeTabs gyms={gymTabs} gymInvitedOnly={gymInvitedOnly} />
        </Suspense>
      ) : null}

      <Suspense
        key={teamsListSuspenseKey(resolvedSearchParams)}
        fallback={<TeamsListCardSkeleton />}
      >
        <TeamsListCard
          searchParams={resolvedSearchParams}
          userId={user?.id}
          coachGyms={gymTabs}
          gymInvitedOnly={gymInvitedOnly}
        />
      </Suspense>
    </div>
  )
}
