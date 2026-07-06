import type { SupabaseClient } from '@supabase/supabase-js'

import { CLIENTS_PAGE_SIZE } from '@/lib/constants'
import { sortByLastName } from '@/lib/person-name'
import { clientStatuses } from '@/lib/validations/client'
import type {
  Client,
  ClientStatus,
  ClientTeamMembership,
  Database,
} from 'app/types/database'

export type CoachGymTab = {
  id: string
  name: string
}

function isStatus(value: string): value is ClientStatus {
  return (clientStatuses as readonly string[]).includes(value)
}

export function resolveClientsScope(
  scopeParam: string | undefined,
  coachGyms: CoachGymTab[]
): 'all' | 'personal' | string {
  const rawScope = scopeParam ?? 'all'
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))

  if (rawScope === 'personal') {
    return 'personal'
  }
  if (rawScope === 'gym' && coachGyms.length === 1) {
    return coachGyms[0].id
  }
  if (coachGymIds.has(rawScope)) {
    return rawScope
  }
  return 'all'
}

export type ClientsListPageData = {
  clients: Client[]
  teamsByClientId: Record<string, ClientTeamMembership[]>
  gymNamesById: Record<string, string>
  coachNamesById: Record<string, string>
  page: number
  totalPages: number
  totalCount: number
  scope: 'all' | 'personal' | string
  error: boolean
}

export async function fetchClientsForListPage(
  supabase: SupabaseClient<Database>,
  {
    userId,
    coachGyms,
    q,
    status,
    scopeParam,
    pageParam,
  }: {
    userId: string | undefined
    coachGyms: CoachGymTab[]
    q?: string
    status?: string
    scopeParam?: string
    pageParam?: string
  }
): Promise<ClientsListPageData> {
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const scope = resolveClientsScope(scopeParam, coachGyms)

  let queryBuilder = supabase
    .from('clients')
    .select('id, full_name', { count: 'exact' })

  if (userId && scope === 'personal') {
    queryBuilder = queryBuilder.is('gym_id', null)
  } else if (userId && coachGymIds.has(scope)) {
    queryBuilder = queryBuilder.eq('gym_id', scope)
  }

  if (q?.trim()) {
    const term = `%${q.trim()}%`
    queryBuilder = queryBuilder.or(
      `full_name.ilike.${term},email.ilike.${term}`
    )
  }

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  const requestedPage = Math.max(
    1,
    Number.parseInt(pageParam ?? '1', 10) || 1
  )
  const from = (requestedPage - 1) * CLIENTS_PAGE_SIZE
  const to = from + CLIENTS_PAGE_SIZE - 1

  const { data: nameRows, error, count } = await queryBuilder
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)

  if (error) {
    return {
      clients: [],
      teamsByClientId: {},
      gymNamesById: Object.fromEntries(
        coachGyms.map((gym) => [gym.id, gym.name])
      ),
      coachNamesById: {},
      page,
      totalPages,
      totalCount,
      scope,
      error: true,
    }
  }

  const sortedIds = sortByLastName(nameRows ?? [], (row) => row.full_name)
    .slice(from, to + 1)
    .map((row) => row.id)

  if (sortedIds.length === 0) {
    return {
      clients: [],
      teamsByClientId: {},
      gymNamesById: Object.fromEntries(
        coachGyms.map((gym) => [gym.id, gym.name])
      ),
      coachNamesById: {},
      page,
      totalPages,
      totalCount,
      scope,
      error: false,
    }
  }

  const { data: clientRows, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .in('id', sortedIds)

  const clientsById = new Map(
    ((clientRows ?? []) as Client[]).map((client) => [client.id, client])
  )
  const clients = sortedIds
    .map((id) => clientsById.get(id))
    .filter((client): client is Client => client !== undefined)

  const gymNamesById = new Map(coachGyms.map((gym) => [gym.id, gym.name]))
  const coachNamesById = new Map<string, string>()
  const otherCoachIds = Array.from(
    new Set(
      clients
        .filter((client) => userId && client.coach_id !== userId)
        .map((client) => client.coach_id)
    )
  )
  const missingGymIds = Array.from(
    new Set(
      clients
        .map((client) => client.gym_id)
        .filter(
          (gymId): gymId is string => gymId !== null && !gymNamesById.has(gymId)
        )
    )
  )

  const [coachResult, gymResult, memberResult] = await Promise.all([
    otherCoachIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, business_name')
          .in('id', otherCoachIds)
      : Promise.resolve({ data: [] }),
    missingGymIds.length > 0
      ? supabase.from('gyms').select('id, name').in('id', missingGymIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('team_members')
      .select('client_id, team:teams(id, name)')
      .in('client_id', sortedIds),
  ])

  for (const coach of coachResult.data ?? []) {
    coachNamesById.set(
      coach.id,
      coach.full_name ?? coach.business_name ?? 'Coach'
    )
  }

  for (const gym of gymResult.data ?? []) {
    gymNamesById.set(gym.id, gym.name)
  }

  const teamsByClientId = new Map<string, ClientTeamMembership[]>()
  for (const row of memberResult.data ?? []) {
    const team = row.team as { id: string; name: string } | null
    if (!team) continue
    const existing = teamsByClientId.get(row.client_id) ?? []
    existing.push({ team })
    teamsByClientId.set(row.client_id, existing)
  }

  return {
    clients,
    teamsByClientId: Object.fromEntries(teamsByClientId),
    gymNamesById: Object.fromEntries(gymNamesById),
    coachNamesById: Object.fromEntries(coachNamesById),
    page,
    totalPages,
    totalCount,
    scope,
    error: Boolean(clientsError),
  }
}

export function clientsListSuspenseKey(params: {
  q?: string
  status?: string
  page?: string
  scope?: string
}) {
  return [
    params.scope ?? 'all',
    params.q ?? '',
    params.status ?? '',
    params.page ?? '1',
  ].join('|')
}
