import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Team,
  TeamAnnouncement,
  TeamEvent,
  TeamEventMemberStatus,
  TeamEventRsvpStatus,
} from 'app/types/database'

export type ClientTeamSummary = Pick<
  Team,
  'id' | 'name' | 'description' | 'next_competition_name' | 'next_competition_date'
>

export type ClientTeamEvent = TeamEvent & {
  myStatus: TeamEventMemberStatus | null
}

export type ClientNextTeamEvent = {
  teamId: string
  teamName: string
  event: TeamEvent
  myRsvpStatus: TeamEventRsvpStatus
}

export async function fetchClientTeams(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientTeamSummary[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('client_id', clientId)

  if (memberError || !memberships?.length) {
    return []
  }

  const teamIds = memberships.map((row) => row.team_id)
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, description, next_competition_name, next_competition_date')
    .in('id', teamIds)
    .order('name', { ascending: true })

  if (error) {
    return []
  }

  return (teams ?? []) as ClientTeamSummary[]
}

export async function clientHasTeamMembership(
  supabase: SupabaseClient,
  clientId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)

  return !error && (count ?? 0) > 0
}

export async function verifyClientTeamMembership(
  supabase: SupabaseClient,
  clientId: string,
  teamId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('client_id', clientId)
    .eq('team_id', teamId)
    .maybeSingle()

  return !error && Boolean(data)
}

export async function fetchClientTeamAnnouncements(
  supabase: SupabaseClient,
  teamId: string,
  clientId: string
): Promise<TeamAnnouncement[]> {
  const isMember = await verifyClientTeamMembership(supabase, clientId, teamId)
  if (!isMember) return []

  const { data, error } = await supabase
    .from('team_announcements')
    .select('*')
    .eq('team_id', teamId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as TeamAnnouncement[]
}

export async function fetchClientTeamEvents(
  supabase: SupabaseClient,
  teamId: string,
  clientId: string
): Promise<ClientTeamEvent[]> {
  const isMember = await verifyClientTeamMembership(supabase, clientId, teamId)
  if (!isMember) return []

  const { data: events, error } = await supabase
    .from('team_events')
    .select('*')
    .eq('team_id', teamId)
    .order('event_date', { ascending: false })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error || !events?.length) return []

  const eventIds = events.map((event) => event.id)
  const { data: statuses } = await supabase
    .from('team_event_member_status')
    .select('*')
    .eq('client_id', clientId)
    .in('event_id', eventIds)

  const statusByEventId = new Map(
    (statuses ?? []).map((row) => [row.event_id, row as TeamEventMemberStatus])
  )

  return events.map((event) => ({
    ...(event as TeamEvent),
    myStatus: statusByEventId.get(event.id) ?? null,
  }))
}

export async function fetchClientNextTeamEvent(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientNextTeamEvent | null> {
  const teams = await fetchClientTeams(supabase, clientId)
  if (!teams.length) return null

  const todayKey = new Date().toISOString().slice(0, 10)
  let best: ClientNextTeamEvent | null = null

  for (const team of teams) {
    const { data: events, error } = await supabase
      .from('team_events')
      .select('*')
      .eq('team_id', team.id)
      .gte('event_date', todayKey)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: false })
      .limit(1)

    if (error || !events?.length) continue

    const event = events[0] as TeamEvent
    const { data: status } = await supabase
      .from('team_event_member_status')
      .select('rsvp_status')
      .eq('event_id', event.id)
      .eq('client_id', clientId)
      .maybeSingle()

    const candidate: ClientNextTeamEvent = {
      teamId: team.id,
      teamName: team.name,
      event,
      myRsvpStatus: (status?.rsvp_status as TeamEventRsvpStatus) ?? 'no_response',
    }

    if (
      !best ||
      event.event_date < best.event.event_date ||
      (event.event_date === best.event.event_date &&
        (event.start_time ?? '') < (best.event.start_time ?? ''))
    ) {
      best = candidate
    }
  }

  return best
}

/** True when the client has an upcoming team event that still needs an RSVP. */
export async function clientNeedsTeamAttention(
  supabase: SupabaseClient,
  clientId: string
): Promise<boolean> {
  const teams = await fetchClientTeams(supabase, clientId)
  if (!teams.length) return false

  const todayKey = new Date().toISOString().slice(0, 10)
  const horizonKey = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  for (const team of teams) {
    const { data: events } = await supabase
      .from('team_events')
      .select('id')
      .eq('team_id', team.id)
      .gte('event_date', todayKey)
      .lte('event_date', horizonKey)

    if (!events?.length) continue

    for (const event of events) {
      const { data: status } = await supabase
        .from('team_event_member_status')
        .select('rsvp_status')
        .eq('event_id', event.id)
        .eq('client_id', clientId)
        .maybeSingle()

      const rsvp = (status?.rsvp_status as TeamEventRsvpStatus) ?? 'no_response'
      if (rsvp === 'no_response') {
        return true
      }
    }
  }

  return false
}
