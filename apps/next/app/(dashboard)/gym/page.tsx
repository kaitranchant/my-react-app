import { Suspense } from 'react'
import { Building2 } from 'lucide-react'

import {
  FilterPillsSkeleton,
  ScopeTabsSkeleton,
} from '@/components/dashboard/async-fallback-skeletons'

import { createClient } from '@/lib/supabase/server'
import { getGymContextForCoach, getGymsForCoach, getCoachGymAccessMode, isGymInvitedOnlyCoach } from '@/lib/gym-access'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchGymOwnerDashboard } from '@/lib/gym-metrics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { CreateGymButton, GymFormDialog } from '@/components/gym/gym-form-dialog'
import { InviteCoachDialog } from '@/components/gym/invite-coach-dialog'
import { GymManagePanel } from '@/components/gym/gym-manage-panel'
import { GymScopeTabs } from '@/components/gym/gym-scope-tabs'
import { GymPageTabs } from '@/components/gym/gym-page-tabs'
import { GymScopeBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { Button } from '@/components/ui/button'
import type { GymMemberWithProfile } from 'app/types/database'

export const metadata = {
  title: 'Gyms — Coaching App',
}

function GymManageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-muted/40 h-48 animate-pulse rounded-xl border" />
      <div className="bg-muted/40 h-40 animate-pulse rounded-xl border" />
      <div className="bg-muted/40 h-32 animate-pulse rounded-xl border" />
    </div>
  )
}

export default async function GymPage({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string }>
}) {
  const { gym: gymParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const coachGyms = await getGymsForCoach(user.id)

  if (coachGyms.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <PageHeader
          title="Gyms"
          description="Create a gym to invite other coaches and add clients as members."
        />
        <Card>
          <CardHeader className="text-center">
            <div className="empty-state-icon mx-auto mb-2">
              <Building2 className="size-7" />
            </div>
            <CardTitle>No gym yet</CardTitle>
            <CardDescription>
              Set up your gym to collaborate with other coaches. You can add
              clients as members when you are ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <CreateGymButton />
          </CardContent>
        </Card>
      </div>
    )
  }

  const gymContext = await getGymContextForCoach(user.id, gymParam)

  if (!gymContext) {
    return null
  }

  const { gym, membership } = gymContext
  const isOwner = membership.role === 'owner'
  const gymInvitedOnly = isGymInvitedOnlyCoach(await getCoachGymAccessMode(user.id))
  const coachGymIds = new Set(coachGyms.map((item) => item.id))
  const coachPreferences = await getCoachPreferencesForUser(user.id)

  const { data: memberRows } = await supabase
    .from('gym_members')
    .select(
      '*, profile:profiles(id, full_name, avatar_url, business_name)'
    )
    .eq('gym_id', gym.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  const members = (memberRows ?? []).map((row) => ({
    id: row.id,
    gym_id: row.gym_id,
    coach_id: row.coach_id,
    role: row.role,
    status: row.status,
    joined_at: row.joined_at,
    profile: row.profile as GymMemberWithProfile['profile'],
  })) as GymMemberWithProfile[]

  const ownerDashboard = isOwner
    ? await fetchGymOwnerDashboard(supabase, {
        gymId: gym.id,
        coachId: user.id,
        coachGymIds,
        members,
        coachPreferences,
      })
    : null

  const manageContent = (
    <Suspense fallback={<GymManageSkeleton />}>
      <GymManagePanel
        gym={gym}
        userId={user.id}
        isOwner={isOwner}
        members={members}
      />
    </Suspense>
  )

  return (
    <div
      className={`mx-auto flex flex-col gap-8 ${isOwner ? 'max-w-7xl' : 'max-w-4xl'}`}
    >
      <PageHeader
        title="Gyms"
        description={
          isOwner
            ? 'Monitor gym performance and manage coaches, clients, and teams.'
            : 'Manage gym members and invite coaches to collaborate on client programs.'
        }
      >
        {gymInvitedOnly ? null : <CreateGymButton />}
        {isOwner ? (
          <>
            <GymFormDialog
              gym={gym}
              trigger={<Button variant="outline">Edit gym</Button>}
            />
            <InviteCoachDialog gymId={gym.id} />
          </>
        ) : null}
      </PageHeader>

      {coachGyms.length > 1 ? (
        <Suspense fallback={<ScopeTabsSkeleton />}>
          <PageFilterPersistence pageKey="gym" filterKeys={['gym']} />
          <GymScopeBreadcrumbs
            gyms={coachGyms.map((item) => ({ id: item.id, name: item.name }))}
          />
          <div className="space-y-3">
            <GymScopeTabs
              gyms={coachGyms.map((item) => ({ id: item.id, name: item.name }))}
            />
            <ClearPageFilters pageKey="gym" filterKeys={['gym']} />
          </div>
        </Suspense>
      ) : null}

      {isOwner && ownerDashboard ? (
        <Suspense fallback={<FilterPillsSkeleton count={3} />}>
          <GymPageTabs
            gymId={gym.id}
            gymName={gym.name}
            dashboard={ownerDashboard}
            manageContent={manageContent}
          />
        </Suspense>
      ) : (
        manageContent
      )}
    </div>
  )
}
