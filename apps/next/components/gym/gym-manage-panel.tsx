import { createClient } from '@/lib/supabase/server'
import { GymMembersPanel } from '@/components/gym/gym-members-panel'
import { GymInvitesPanel } from '@/components/gym/gym-invites-panel'
import { GymDangerZone } from '@/components/gym/gym-danger-zone'
import { AddClientsButton } from '@/components/gym/client-gym-share-toggle'
import { AddTeamsButton } from '@/components/gym/team-gym-share-toggle'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Gym, GymInvite, GymMemberWithProfile } from 'app/types/database'

type GymManagePanelProps = {
  gym: Pick<Gym, 'id' | 'name'>
  userId: string
  isOwner: boolean
  members: GymMemberWithProfile[]
}

export async function GymManagePanel({
  gym,
  userId,
  isOwner,
  members,
}: GymManagePanelProps) {
  const supabase = await createClient()

  const [{ data: inviteRows }, { data: clientRows }, { data: teamRows }] =
    await Promise.all([
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
        .eq('coach_id', userId)
        .eq('is_coach_self', false)
        .order('full_name', { ascending: true }),
      supabase
        .from('teams')
        .select('id, name, gym_id')
        .eq('coach_id', userId)
        .order('name', { ascending: true }),
    ])

  return (
    <div className="space-y-8">
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
            currentUserId={userId}
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
            Choose specific teams to add, or add all of your teams at once. You
            can also add teams individually from each team page.
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
    </div>
  )
}
