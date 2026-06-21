import { createClient } from '@/lib/supabase/server'
import type { Client, Gym, GymMember, Team } from 'app/types/database'

export type GymMembershipContext = {
  gym: Gym
  membership: GymMember
}

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

export async function getGymsForCoach(userId: string): Promise<Gym[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gym_members')
    .select('gym:gyms(*)')
    .eq('coach_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data
    .map((row) => row.gym as Gym | null)
    .filter((gym): gym is Gym => gym !== null)
}

export async function getGymIdsForCoach(userId: string): Promise<string[]> {
  const gyms = await getGymsForCoach(userId)
  return gyms.map((gym) => gym.id)
}

export async function getGymMembershipForCoach(
  userId: string,
  gymId: string
): Promise<GymMembershipContext | null> {
  const supabase = await createClient()
  const { data: membership, error } = await supabase
    .from('gym_members')
    .select('*, gym:gyms(*)')
    .eq('coach_id', userId)
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !membership?.gym) {
    return null
  }

  return {
    gym: membership.gym as Gym,
    membership: {
      id: membership.id,
      gym_id: membership.gym_id,
      coach_id: membership.coach_id,
      role: membership.role,
      status: membership.status,
      joined_at: membership.joined_at,
    },
  }
}

export async function getGymContextForCoach(
  userId: string,
  preferredGymId?: string | null
): Promise<GymMembershipContext | null> {
  if (preferredGymId) {
    const context = await getGymMembershipForCoach(userId, preferredGymId)
    if (context) {
      return context
    }
  }

  const gyms = await getGymsForCoach(userId)
  if (gyms.length === 0) {
    return null
  }

  return getGymMembershipForCoach(userId, gyms[0].id)
}

/** @deprecated Use getGymContextForCoach or getGymMembershipForCoach instead. */
export async function getActiveGymForCoach(
  userId: string
): Promise<GymMembershipContext | null> {
  return getGymContextForCoach(userId)
}

export function canCoachAccessClient(
  userId: string,
  client: Pick<Client, 'coach_id' | 'gym_id'>,
  coachGymIds: readonly string[]
): boolean {
  if (client.coach_id === userId) {
    return true
  }
  if (!client.gym_id) {
    return false
  }
  return coachGymIds.includes(client.gym_id)
}

export function isPrimaryCoach(
  userId: string,
  client: Pick<Client, 'coach_id'>
): boolean {
  return client.coach_id === userId
}

export function isPrimaryTeamCoach(
  userId: string,
  team: Pick<Team, 'coach_id'>
): boolean {
  return team.coach_id === userId
}

export function canCoachAccessTeam(
  userId: string,
  team: Pick<Team, 'coach_id' | 'gym_id'>,
  coachGymIds: readonly string[]
): boolean {
  if (team.coach_id === userId) {
    return true
  }
  if (!team.gym_id) {
    return false
  }
  return coachGymIds.includes(team.gym_id)
}

export async function requireTeamAccess(teamId: string) {
  const { supabase, user } = await requireUser()
  const coachGymIds = await getGymIdsForCoach(user.id)

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle()

  if (error || !team) {
    return null
  }

  if (!canCoachAccessTeam(user.id, team, coachGymIds)) {
    return null
  }

  return {
    supabase,
    user,
    team: team as Team,
    isPrimaryCoach: isPrimaryTeamCoach(user.id, team),
  }
}

export async function requireClientAccess(clientId: string) {
  const { supabase, user } = await requireUser()
  const coachGymIds = await getGymIdsForCoach(user.id)

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  if (!canCoachAccessClient(user.id, client, coachGymIds)) {
    return null
  }

  const gymContext =
    client.gym_id !== null
      ? await getGymMembershipForCoach(user.id, client.gym_id)
      : null

  return {
    supabase,
    user,
    client: client as Client,
    gymContext,
    isPrimaryCoach: isPrimaryCoach(user.id, client),
  }
}
