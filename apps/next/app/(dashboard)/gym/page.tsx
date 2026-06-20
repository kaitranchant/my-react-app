import { Suspense } from 'react'
import { Building2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getGymContextForCoach, getGymsForCoach } from '@/lib/gym-access'
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
import { ShareAllClientsButton } from '@/components/gym/client-gym-share-toggle'
import { GymScopeTabs } from '@/components/gym/gym-scope-tabs'
import { Button } from '@/components/ui/button'
import type { GymInvite, GymMemberWithProfile } from 'app/types/database'

export const metadata = {
  title: 'Gym — Coaching App',
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

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageHeader
        title={coachGyms.length > 1 ? 'Gyms' : gym.name}
        description="Manage gym members and invite coaches to collaborate on client programs."
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
        <Suspense fallback={null}>
          <GymScopeTabs
            gyms={coachGyms.map((item) => ({ id: item.id, name: item.name }))}
          />
        </Suspense>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{gym.name}</CardTitle>
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
            <CardTitle className="text-base">Pending invites</CardTitle>
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
          <CardTitle className="text-base">Client membership</CardTitle>
          <CardDescription>
            Add clients as gym members individually from each client profile,
            or add all of your clients at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShareAllClientsButton gymId={gym.id} />
        </CardContent>
      </Card>

      <GymDangerZone gymId={gym.id} isOwner={isOwner} />
    </div>
  )
}
