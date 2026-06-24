import { Suspense } from 'react'
import { Building2 } from 'lucide-react'

import {
  FilterPillsSkeleton,
  ScopeTabsSkeleton,
} from '@/components/dashboard/async-fallback-skeletons'

import { createClient } from '@/lib/supabase/server'
import { getGymContextForCoach, getGymsForCoach } from '@/lib/gym-access'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchGymOwnerDashboard, parseGymCoachFilter } from '@/lib/gym-metrics'
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
import { GymMembersPanel } from '@/components/gym/gym-members-panel'
import { GymInvitesPanel } from '@/components/gym/gym-invites-panel'
import { GymDangerZone } from '@/components/gym/gym-danger-zone'
import { AddClientsButton } from '@/components/gym/client-gym-share-toggle'
import { AddTeamsButton } from '@/components/gym/team-gym-share-toggle'
import { GymScopeTabs } from '@/components/gym/gym-scope-tabs'
import { GymPageTabs } from '@/components/gym/gym-page-tabs'
import { GymScopeBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { Button } from '@/components/ui/button'
import type { GymInvite, GymMemberWithProfile } from 'app/types/database'

export const metadata = {
  title: 'Gym — Coaching App',
}

export default async function GymPage({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string; tab?: string; coach?: string }>
}) {
  const { gym: gymParam, coach: coachParam } = await searchParams
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
          title="Gym"
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
  const coachGymIds = new Set(coachGyms.map((item) => item.id))
  const coachPreferences = await getCoachPreferencesForUser(user.id)

  const [
    { data: memberRows },
    { data: inviteRows },
    { data: clientRows },
    { data: teamRows },
  ] = await Promise.all([
    supabase
      .from('gym_members')
      .select(
        '*, profile:profiles(id, full_name, avatar_url, business_name)'
      )
      .eq('gym_id', gym.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true }),
    isOwner
      ? supabase
          .from('gym_invites')
          .select('*')
          .eq('gym_id', gym.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as GymInvite[] }),
    supabase
      .from('clients')
      .select('id, full_name, gym_id')
      .eq('coach_id', user.id)
      .eq('is_coach_self', false)
      .order('full_name', { ascending: true }),
    supabase
      .from('teams')
      .select('id, name, gym_id')
      .eq('coach_id', user.id)
      .order('name', { ascending: true }),
  ])

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
        filterCoachId: parseGymCoachFilter(
          coachParam,
          new Set(members.map((member) => member.coach_id))
        ),
      })
    : null

  const manageContent = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{gym.name}</CardTitle>
          <CardDescription>
            {members.length} coach{members.length === 1 ? '' : 'es'} in this gym
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <GymMembersPanel
            gymId={gym.id}
            members={members}
            currentUserId={user.id}
            isOwner={isOwner}
          />
        </CardContent>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>
              Invited coaches can sign up or join with the invite link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GymInvitesPanel
              gymId={gym.id}
              invites={(inviteRows ?? []) as GymInvite[]}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Client membership</CardTitle>
          <CardDescription>
            Choose specific clients to add, or add all of your clients at once.
            You can also add clients individually from each client profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddClientsButton
            gymId={gym.id}
            gymName={gym.name}
            clients={(clientRows ?? []).map((client) => ({
              id: client.id,
              full_name: client.full_name,
              gym_id: client.gym_id,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team membership</CardTitle>
          <CardDescription>
            Choose specific teams to add, or add all of your teams at once.
            You can also add teams individually from each team page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddTeamsButton
            gymId={gym.id}
            gymName={gym.name}
            teams={(teamRows ?? []).map((team) => ({
              id: team.id,
              name: team.name,
              gym_id: team.gym_id,
            }))}
          />
        </CardContent>
      </Card>

      <GymDangerZone gymId={gym.id} gymName={gym.name} isOwner={isOwner} />
    </>
  )

  return (
    <div
      className={`mx-auto flex flex-col gap-8 ${isOwner ? 'max-w-7xl' : 'max-w-4xl'}`}
    >
      <PageHeader
        title={coachGyms.length > 1 ? 'Gyms' : gym.name}
        description={
          isOwner
            ? 'Monitor gym performance and manage coaches, clients, and teams.'
            : 'Manage gym members and invite coaches to collaborate on client programs.'
        }
      >
        <CreateGymButton />
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
          <PageFilterPersistence pageKey="gym" filterKeys={['gym', 'tab', 'coach']} />
          <GymScopeBreadcrumbs
            gyms={coachGyms.map((item) => ({ id: item.id, name: item.name }))}
          />
          <div className="space-y-3">
            <GymScopeTabs
              gyms={coachGyms.map((item) => ({ id: item.id, name: item.name }))}
            />
            <ClearPageFilters pageKey="gym" filterKeys={['gym', 'tab', 'coach']} />
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
