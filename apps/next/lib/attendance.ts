import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Client,
  ClientCoachingType,
  ClientTeamMembership,
  TeamEventAttendanceStatus,
  TeamEventRsvpStatus,
  TeamEventWithTeamContext,
  TeamMemberWithClient,
} from 'app/types/database'

export type DailyAttendanceRecord = {
  status: TeamEventAttendanceStatus
  notes: string | null
  coaching_type: ClientCoachingType | null
}

export type ClientRsvpHint = {
  rsvpStatus: TeamEventRsvpStatus
  eventTitle: string
  teamName: string
}

export type AttendanceClientRow = Pick<
  Client,
  'id' | 'full_name' | 'avatar_url' | 'status' | 'coaching_type' | 'gym_id'
> & {
  memberships: ClientTeamMembership[]
}

export type AttendanceBaseScope =
  | { kind: 'all' }
  | { kind: 'personal' }
  | { kind: 'gym'; gymId: string }

export type AttendanceScope = AttendanceBaseScope & {
  teamId?: string
}

export type CoachTeam = {
  id: string
  name: string
  gym_id: string | null
}

export async function fetchCoachTeams(
  supabase: SupabaseClient,
  _coachId: string
): Promise<CoachTeam[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, gym_id')
    .order('name', { ascending: true })

  if (error || !data) {
    return []
  }

  return data
}

export async function fetchCoachTeamEventsForDate(
  supabase: SupabaseClient,
  _coachId: string,
  date: string,
  scope: AttendanceScope
): Promise<TeamEventWithTeamContext[]> {
  let query = supabase
    .from('team_events')
    .select(
      `
      *,
      team:teams!inner(id, name, gym_id),
      memberStatuses:team_event_member_status(
        *,
        client:clients(id, full_name, avatar_url)
      )
    `
    )
    .eq('event_date', date)

  if (scope.teamId) {
    query = query.eq('team_id', scope.teamId)
  } else if (scope.kind === 'gym') {
    query = query.eq('team.gym_id', scope.gymId)
  } else if (scope.kind === 'personal') {
    query = query.is('team.gym_id', null)
  }

  const { data, error } = await query
    .order('start_time', { ascending: true, nullsFirst: true })
    .order('title', { ascending: true })

  if (error || !data) {
    return []
  }

  return data
    .map((row) => {
      const team = row.team as { id: string; name: string } | null
      if (!team) return null
      const { team: _team, ...event } = row
      return {
        ...event,
        team,
        memberStatuses: event.memberStatuses ?? [],
      } as TeamEventWithTeamContext
    })
    .filter((event): event is TeamEventWithTeamContext => event !== null)
}

export async function fetchTeamMembersByTeamIds(
  supabase: SupabaseClient,
  teamIds: string[]
): Promise<Map<string, TeamMemberWithClient[]>> {
  if (teamIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('team_members')
    .select(
      `
      *,
      client:clients(id, full_name, status, avatar_url, email)
    `
    )
    .in('team_id', teamIds)
    .order('joined_at', { ascending: true })

  if (error || !data) {
    return new Map()
  }

  const membersByTeamId = new Map<string, TeamMemberWithClient[]>()

  for (const row of data) {
    const member = row as TeamMemberWithClient
    const existing = membersByTeamId.get(member.team_id) ?? []
    existing.push(member)
    membersByTeamId.set(member.team_id, existing)
  }

  return membersByTeamId
}

export async function fetchDailyAttendanceForDate(
  supabase: SupabaseClient,
  date: string,
  clientIds: string[]
): Promise<Map<string, DailyAttendanceRecord>> {
  if (clientIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('client_daily_attendance')
    .select('client_id, status, notes, coaching_type')
    .eq('attendance_date', date)
    .in('client_id', clientIds)

  if (error || !data) {
    return new Map()
  }

  return new Map(
    data.map((row) => [
      row.client_id,
      {
        status: row.status as TeamEventAttendanceStatus,
        notes: row.notes,
        coaching_type: row.coaching_type as ClientCoachingType | null,
      },
    ])
  )
}

export async function fetchDailyAttendanceForDateRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  clientIds: string[]
): Promise<Map<string, Map<string, DailyAttendanceRecord>>> {
  if (clientIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('client_daily_attendance')
    .select('client_id, attendance_date, status, notes, coaching_type')
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .in('client_id', clientIds)

  if (error || !data) {
    return new Map()
  }

  const byClientId = new Map<string, Map<string, DailyAttendanceRecord>>()

  for (const row of data) {
    const existing = byClientId.get(row.client_id) ?? new Map()
    existing.set(row.attendance_date, {
      status: row.status as TeamEventAttendanceStatus,
      notes: row.notes,
      coaching_type: row.coaching_type as ClientCoachingType | null,
    })
    byClientId.set(row.client_id, existing)
  }

  return byClientId
}

export async function fetchClientAttendanceHistory(
  supabase: SupabaseClient,
  clientIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, Map<string, TeamEventAttendanceStatus>>> {
  if (clientIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('client_daily_attendance')
    .select('client_id, attendance_date, status')
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .in('client_id', clientIds)

  if (error || !data) {
    return new Map()
  }

  const byClientId = new Map<string, Map<string, TeamEventAttendanceStatus>>()

  for (const row of data) {
    const existing = byClientId.get(row.client_id) ?? new Map()
    existing.set(row.attendance_date, row.status as TeamEventAttendanceStatus)
    byClientId.set(row.client_id, existing)
  }

  return byClientId
}

export function buildClientRsvpHintsByClientId(
  events: TeamEventWithTeamContext[]
): Map<string, ClientRsvpHint> {
  const hints = new Map<string, ClientRsvpHint>()

  for (const event of events) {
    for (const memberStatus of event.memberStatuses) {
      if (memberStatus.rsvp_status === 'no_response') {
        continue
      }

      const existing = hints.get(memberStatus.client_id)
      const priority =
        memberStatus.rsvp_status === 'going'
          ? 3
          : memberStatus.rsvp_status === 'maybe'
            ? 2
            : 1
      const existingPriority =
        existing?.rsvpStatus === 'going'
          ? 3
          : existing?.rsvpStatus === 'maybe'
            ? 2
            : existing?.rsvpStatus === 'declined'
              ? 1
              : 0

      if (!existing || priority >= existingPriority) {
        hints.set(memberStatus.client_id, {
          rsvpStatus: memberStatus.rsvp_status,
          eventTitle: event.title,
          teamName: event.team.name,
        })
      }
    }
  }

  return hints
}

const attendanceClientColumns =
  'id, full_name, avatar_url, status, coaching_type, gym_id'

export async function fetchAttendanceClients(
  supabase: SupabaseClient,
  options: {
    scope: AttendanceScope
    coachGymIds: Set<string>
    userId: string
  }
): Promise<AttendanceClientRow[]> {
  if (options.scope.teamId) {
    return fetchAttendanceClientsForTeam(supabase, options.scope.teamId)
  }

  if (options.scope.kind === 'personal') {
    return fetchAttendanceClientsForPersonal(supabase)
  }

  if (options.scope.kind === 'gym') {
    return fetchAttendanceClientsForGym(supabase, options.scope.gymId)
  }

  const { data, error } = await supabase
    .from('clients')
    .select(attendanceClientColumns)
    .eq('is_coach_self', false)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (error || !data) {
    return []
  }

  return attachTeamMemberships(supabase, data as AttendanceClientRow[])
}

async function fetchAttendanceClientsForGym(
  supabase: SupabaseClient,
  gymId: string
): Promise<AttendanceClientRow[]> {
  const teamClientIds = await fetchClientIdsOnTeamsWithGym(supabase, gymId)

  const [gymClientsResult, teamClientsResult] = await Promise.all([
    supabase
      .from('clients')
      .select(attendanceClientColumns)
      .eq('gym_id', gymId)
      .eq('is_coach_self', false)
      .eq('status', 'active'),
    teamClientIds.length > 0
      ? supabase
          .from('clients')
          .select(attendanceClientColumns)
          .in('id', teamClientIds)
          .eq('is_coach_self', false)
          .eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (gymClientsResult.error && teamClientsResult.error) {
    return []
  }

  const clientsById = new Map<string, AttendanceClientRow>()
  for (const client of [
    ...(gymClientsResult.data ?? []),
    ...(teamClientsResult.data ?? []),
  ] as AttendanceClientRow[]) {
    clientsById.set(client.id, client)
  }

  const clients = Array.from(clientsById.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  )

  return attachTeamMemberships(supabase, clients)
}

async function fetchAttendanceClientsForPersonal(
  supabase: SupabaseClient
): Promise<AttendanceClientRow[]> {
  const gymTeamClientIds = await fetchClientIdsOnGymAssignedTeams(supabase)

  const { data, error } = await supabase
    .from('clients')
    .select(attendanceClientColumns)
    .is('gym_id', null)
    .eq('is_coach_self', false)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (error || !data) {
    return []
  }

  const clients = (data as AttendanceClientRow[]).filter(
    (client) => !gymTeamClientIds.has(client.id)
  )

  return attachTeamMemberships(supabase, clients)
}

async function fetchClientIdsOnTeamsWithGym(
  supabase: SupabaseClient,
  gymId: string
): Promise<string[]> {
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('gym_id', gymId)

  const teamIds = teams?.map((team) => team.id) ?? []
  if (teamIds.length === 0) {
    return []
  }

  const { data: members } = await supabase
    .from('team_members')
    .select('client_id')
    .in('team_id', teamIds)

  return Array.from(
    new Set(members?.map((member) => member.client_id) ?? [])
  )
}

async function fetchClientIdsOnGymAssignedTeams(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .not('gym_id', 'is', null)

  const teamIds = teams?.map((team) => team.id) ?? []
  if (teamIds.length === 0) {
    return new Set()
  }

  const { data: members } = await supabase
    .from('team_members')
    .select('client_id')
    .in('team_id', teamIds)

  return new Set(members?.map((member) => member.client_id) ?? [])
}

async function fetchAttendanceClientsForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<AttendanceClientRow[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(
      `
      client:clients(id, full_name, avatar_url, status, coaching_type, gym_id),
      team:teams(id, name)
    `
    )
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  if (error || !data) {
    return []
  }

  const clients: AttendanceClientRow[] = []

  for (const row of data) {
    const clientRaw = row.client as AttendanceClientRow | AttendanceClientRow[] | null
    const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
    const teamRaw = row.team as { id: string; name: string } | { id: string; name: string }[] | null
    const team = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw

    if (!client || client.status !== 'active') {
      continue
    }

    clients.push({
      ...client,
      memberships: team ? [{ team }] : [],
    })
  }

  const clientIds = clients.map((client) => client.id)
  if (clientIds.length === 0) {
    return clients
  }

  const { data: memberRows } = await supabase
    .from('team_members')
    .select('client_id, team:teams(id, name)')
    .in('client_id', clientIds)

  const teamsByClientId = new Map<string, ClientTeamMembership[]>()

  for (const row of memberRows ?? []) {
    const teamRaw = row.team as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null
    const membershipTeam = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw
    if (!membershipTeam) continue
    const existing = teamsByClientId.get(row.client_id) ?? []
    if (!existing.some((entry) => entry.team.id === membershipTeam.id)) {
      existing.push({ team: membershipTeam })
    }
    teamsByClientId.set(row.client_id, existing)
  }

  return clients.map((client) => ({
    ...client,
    memberships: teamsByClientId.get(client.id) ?? client.memberships,
  }))
}

async function attachTeamMemberships(
  supabase: SupabaseClient,
  clients: AttendanceClientRow[]
): Promise<AttendanceClientRow[]> {
  const clientIds = clients.map((client) => client.id)
  const teamsByClientId = new Map<string, ClientTeamMembership[]>()

  if (clientIds.length > 0) {
    const { data: memberRows } = await supabase
      .from('team_members')
      .select('client_id, team:teams(id, name)')
      .in('client_id', clientIds)

    for (const row of memberRows ?? []) {
      const teamRaw = row.team as
        | { id: string; name: string }
        | { id: string; name: string }[]
        | null
      const team = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw
      if (!team) continue
      const existing = teamsByClientId.get(row.client_id) ?? []
      existing.push({ team })
      teamsByClientId.set(row.client_id, existing)
    }
  }

  return clients.map((client) => ({
    ...client,
    memberships: teamsByClientId.get(client.id) ?? [],
  }))
}

export function baseScopeForTeam(team: CoachTeam): AttendanceBaseScope {
  if (team.gym_id) {
    return { kind: 'gym', gymId: team.gym_id }
  }
  return { kind: 'personal' }
}

export function teamBelongsToBaseScope(
  team: CoachTeam,
  baseScope: AttendanceBaseScope
): boolean {
  if (baseScope.kind === 'all') {
    return true
  }
  if (baseScope.kind === 'personal') {
    return team.gym_id === null
  }
  return team.gym_id === baseScope.gymId
}

export function teamsForAttendanceScope(
  teams: CoachTeam[],
  scope: AttendanceBaseScope
): CoachTeam[] {
  if (scope.kind === 'all') {
    return teams
  }
  if (scope.kind === 'personal') {
    return teams.filter((team) => team.gym_id === null)
  }
  return teams.filter((team) => team.gym_id === scope.gymId)
}

export type AttendanceScopeClient = {
  gymId: string | null
  teamIds: string[]
}

export function clientMatchesAttendanceScope(
  client: AttendanceScopeClient,
  scope: AttendanceScope,
  teams: CoachTeam[]
): boolean {
  const teamIds = client.teamIds ?? []

  if (scope.teamId) {
    return teamIds.includes(scope.teamId)
  }

  if (scope.kind === 'personal') {
    if (client.gymId != null) {
      return false
    }

    return !teamIds.some((teamId) => {
      const team = teams.find((entry) => entry.id === teamId)
      return team?.gym_id != null
    })
  }

  if (scope.kind === 'gym') {
    if (client.gymId === scope.gymId) {
      return true
    }

    return teamIds.some((teamId) => {
      const team = teams.find((entry) => entry.id === teamId)
      return team?.gym_id === scope.gymId
    })
  }

  return true
}

export function attendanceScopeToParams(scope: AttendanceScope): {
  scope: string | null
  team: string | null
} {
  let scopeParam: string | null = null
  if (scope.kind === 'personal') {
    scopeParam = 'personal'
  } else if (scope.kind === 'gym') {
    scopeParam = scope.gymId
  }

  return {
    scope: scopeParam,
    team: scope.teamId ?? null,
  }
}

function parseAttendanceBaseScope(
  rawScope: string,
  coachGymIds: Set<string>,
  coachGyms: { id: string }[],
  options?: { gymInvitedOnly?: boolean }
): AttendanceBaseScope {
  if (options?.gymInvitedOnly && coachGyms.length > 0) {
    if (coachGymIds.has(rawScope)) {
      return { kind: 'gym', gymId: rawScope }
    }
    if (rawScope === 'gym' && coachGyms.length === 1) {
      return { kind: 'gym', gymId: coachGyms[0].id }
    }
    return { kind: 'gym', gymId: coachGyms[0].id }
  }

  if (rawScope === 'all') {
    return { kind: 'all' }
  }
  if (rawScope === 'personal') {
    return { kind: 'personal' }
  }
  if (rawScope === 'gym' && coachGyms.length === 1) {
    return { kind: 'gym', gymId: coachGyms[0].id }
  }
  if (coachGymIds.has(rawScope)) {
    return { kind: 'gym', gymId: rawScope }
  }
  return { kind: 'all' }
}

export function parseAttendanceScope(
  scopeParam: string | undefined,
  teamParam: string | undefined,
  coachGymIds: Set<string>,
  coachGyms: { id: string }[],
  coachTeams: CoachTeam[],
  options?: { gymInvitedOnly?: boolean }
): AttendanceScope {
  const coachTeamIds = new Set(coachTeams.map((team) => team.id))
  let rawScope = scopeParam ?? (options?.gymInvitedOnly ? coachGyms[0]?.id ?? 'all' : 'all')
  let rawTeamId = teamParam ?? undefined

  if (rawScope.startsWith('team:')) {
    rawTeamId = rawScope.slice(5)
    rawScope = options?.gymInvitedOnly ? coachGyms[0]?.id ?? 'all' : 'all'
  }

  let baseScope = parseAttendanceBaseScope(rawScope, coachGymIds, coachGyms, options)

  if (rawTeamId && coachTeamIds.has(rawTeamId)) {
    const team = coachTeams.find((entry) => entry.id === rawTeamId)
    if (team) {
      if (!teamBelongsToBaseScope(team, baseScope)) {
        baseScope = baseScopeForTeam(team)
      }
      return { ...baseScope, teamId: rawTeamId }
    }
  }

  return baseScope
}

export function isValidAttendanceDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}
