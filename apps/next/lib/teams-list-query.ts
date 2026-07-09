import type { SupabaseClient } from '@supabase/supabase-js'

import {
  resolveClientsScope,
  type CoachGymTab,
} from '@/lib/clients-list-query'
import type { Program, Team, TeamWithProgram, Database } from 'app/types/database'

export type TeamsListPageData = {
  teams: TeamWithProgram[]
  gymNamesById: Record<string, string>
  coachNamesById: Record<string, string>
  scope: 'all' | 'personal' | string
  error: boolean
}

export async function fetchTeamsForListPage(
  supabase: SupabaseClient<Database>,
  {
    userId,
    coachGyms,
    q,
    scopeParam,
    gymInvitedOnly = false,
  }: {
    userId: string | undefined
    coachGyms: CoachGymTab[]
    q?: string
    scopeParam?: string
    gymInvitedOnly?: boolean
  }
): Promise<TeamsListPageData> {
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const scope = resolveClientsScope(scopeParam, coachGyms, { gymInvitedOnly })
  const gymNamesById = new Map(coachGyms.map((gym) => [gym.id, gym.name]))

  let queryBuilder = supabase.from('teams').select('*').order('name', {
    ascending: true,
  })

  if (userId && scope === 'personal') {
    queryBuilder = queryBuilder.eq('coach_id', userId).is('gym_id', null)
  } else if (userId && coachGymIds.has(scope)) {
    queryBuilder = queryBuilder.eq('gym_id', scope)
  }

  if (q?.trim()) {
    const term = `%${q.trim()}%`
    queryBuilder = queryBuilder.or(`name.ilike.${term},description.ilike.${term}`)
  }

  const { data: teamsData, error } = await queryBuilder
  const teams = (teamsData ?? []) as Team[]

  if (error) {
    return {
      teams: [],
      gymNamesById: Object.fromEntries(gymNamesById),
      coachNamesById: {},
      scope,
      error: true,
    }
  }

  if (teams.length === 0) {
    return {
      teams: [],
      gymNamesById: Object.fromEntries(gymNamesById),
      coachNamesById: {},
      scope,
      error: false,
    }
  }

  const teamIds = teams.map((team) => team.id)
  const otherCoachIds = Array.from(
    new Set(
      teams
        .filter((team) => userId && team.coach_id !== userId)
        .map((team) => team.coach_id)
    )
  )
  const missingGymIds = Array.from(
    new Set(
      teams
        .map((team) => team.gym_id)
        .filter(
          (gymId): gymId is string => gymId !== null && !gymNamesById.has(gymId)
        )
    )
  )
  const programIds = Array.from(
    new Set(
      teams
        .map((team) => team.active_program_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const [coachResult, gymResult, programResult, memberResult] = await Promise.all([
    otherCoachIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, business_name')
          .in('id', otherCoachIds)
      : Promise.resolve({ data: [] }),
    missingGymIds.length > 0
      ? supabase.from('gyms').select('id, name').in('id', missingGymIds)
      : Promise.resolve({ data: [] }),
    programIds.length > 0
      ? supabase
          .from('programs')
          .select('id, name, status')
          .in('id', programIds)
      : Promise.resolve({ data: [] }),
    supabase.from('team_members').select('team_id').in('team_id', teamIds),
  ])

  const coachNamesById = new Map<string, string>()
  for (const coach of coachResult.data ?? []) {
    coachNamesById.set(
      coach.id,
      coach.full_name ?? coach.business_name ?? 'Coach'
    )
  }

  for (const gym of gymResult.data ?? []) {
    gymNamesById.set(gym.id, gym.name)
  }

  const programsById = new Map<string, Pick<Program, 'id' | 'name' | 'status'>>()
  for (const program of programResult.data ?? []) {
    programsById.set(program.id, program as Pick<Program, 'id' | 'name' | 'status'>)
  }

  const memberCounts = new Map<string, number>()
  for (const row of memberResult.data ?? []) {
    memberCounts.set(row.team_id, (memberCounts.get(row.team_id) ?? 0) + 1)
  }

  const teamsWithMeta: TeamWithProgram[] = teams.map((team) => ({
    ...team,
    program: team.active_program_id
      ? programsById.get(team.active_program_id) ?? null
      : null,
    member_count: memberCounts.get(team.id) ?? 0,
  }))

  return {
    teams: teamsWithMeta,
    gymNamesById: Object.fromEntries(gymNamesById),
    coachNamesById: Object.fromEntries(coachNamesById),
    scope,
    error: false,
  }
}

export function teamsListSuspenseKey(params: { q?: string; scope?: string }) {
  return [params.scope ?? 'all', params.q ?? ''].join('|')
}
