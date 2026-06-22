'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

import { toDateKey } from '@/lib/calendar'
import {
  getGymMembershipForCoach,
  requireTeamAccess,
  requireUser,
} from '@/lib/gym-access'
import { assignProgramToTeamMembers } from '@/lib/team-programs'
import { createClient } from '@/lib/supabase/server'
import {
  addTeamMemberSchema,
  assignProgramToTeamSchema,
  removeTeamMemberSchema,
  teamFormSchema,
  type AddTeamMemberValues,
  type AssignProgramToTeamValues,
  type MemberStartDateMode,
  type RemoveTeamMemberValues,
  type TeamFormValues,
  type UnassignProgramFromTeamValues,
  unassignProgramFromTeamSchema,
} from '@/lib/validations/team'
import {
  assignProgramToClient,
  unassignProgramFromClient,
} from '@/app/(dashboard)/library/programs/actions'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateTeamResult =
  | { success: true; teamId: string }
  | { success: false; error: string }

export type AddTeamMemberResult =
  | { success: true; assigned: boolean }
  | { success: false; error: string }

export type AssignProgramToTeamResult =
  | {
      success: true
      assignedCount: number
      failedCount: number
      totalScheduled: number
      totalSkipped: number
    }
  | { success: false; error: string }

export type UnassignProgramFromTeamResult =
  | { success: true; unassignedCount: number }
  | { success: false; error: string }

function toTeamRow(values: TeamFormValues) {
  return {
    name: values.name,
    description: values.description ? values.description : null,
    next_competition_name: values.nextCompetitionName?.trim()
      ? values.nextCompetitionName.trim()
      : null,
    next_competition_date: values.nextCompetitionDate?.trim()
      ? values.nextCompetitionDate.trim()
      : null,
  }
}

function revalidateTeams(teamId?: string, clientIds?: string[]) {
  revalidatePath('/teams')
  revalidatePath('/dashboard')
  revalidatePath('/clients')
  if (teamId) {
    revalidatePath(`/teams/${teamId}`)
  }
  for (const clientId of clientIds ?? []) {
    revalidatePath(`/clients/${clientId}`)
  }
  revalidatePath('/portal', 'layout')
}

async function getTeamForCoach(teamId: string) {
  const access = await requireTeamAccess(teamId)
  if (!access) {
    const { supabase, user } = await requireUser()
    return { supabase, user, team: null, error: 'Team not found.' as const }
  }

  return {
    supabase: access.supabase,
    user: access.user,
    team: {
      id: access.team.id,
      coach_id: access.team.coach_id,
      active_program_id: access.team.active_program_id,
      program_start_date: access.team.program_start_date,
    },
    error: null,
  }
}

function resolveMemberStartDate(
  mode: MemberStartDateMode | undefined,
  teamStartDate: string | null,
  customStartDate?: string
): string | null {
  if (!mode) return null

  if (mode === 'team_start') {
    return teamStartDate
  }

  if (mode === 'today') {
    return toDateKey(new Date())
  }

  const custom = customStartDate?.trim()
  return custom ? custom : null
}

async function resolveGymIdForTeam(
  userId: string,
  gymId?: string
): Promise<{ gymId: string | null } | { error: string }> {
  if (!gymId || gymId === 'none') {
    return { gymId: null }
  }

  const membership = await getGymMembershipForCoach(userId, gymId)
  if (!membership) {
    return { error: 'You must be a member of the selected gym.' }
  }

  return { gymId }
}

export async function createTeamRecord(
  values: TeamFormValues
): Promise<CreateTeamResult> {
  const parsed = teamFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const gymResult = await resolveGymIdForTeam(user.id, parsed.data.gymId)
  if ('error' in gymResult) {
    return { success: false, error: gymResult.error }
  }

  const teamId = randomUUID()
  const { error } = await supabase.from('teams').insert({
    id: teamId,
    ...toTeamRow(parsed.data),
    coach_id: user.id,
    gym_id: gymResult.gymId,
  })

  if (error) {
    return { success: false, error: error.message ?? 'Could not create team.' }
  }

  revalidateTeams(teamId)
  return { success: true, teamId }
}

export async function updateTeamRecord(
  id: string,
  values: TeamFormValues
): Promise<ActionResult> {
  const parsed = teamFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const gymResult = await resolveGymIdForTeam(user.id, parsed.data.gymId)
  if ('error' in gymResult) {
    return { success: false, error: gymResult.error }
  }

  const { error } = await supabase
    .from('teams')
    .update({
      ...toTeamRow(parsed.data),
      gym_id: gymResult.gymId,
    })
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams(id)
  return { success: true }
}

export async function deleteTeamRecord(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams()
  return { success: true }
}

export async function addTeamMember(
  teamId: string,
  values: AddTeamMemberValues
): Promise<AddTeamMemberResult> {
  const parsed = addTeamMemberSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', parsed.data.clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('client_id', parsed.data.clientId)
    .maybeSingle()

  if (existingMember) {
    return { success: false, error: 'Client is already on this team.' }
  }

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: teamId,
    client_id: parsed.data.clientId,
  })

  if (memberError) {
    return { success: false, error: memberError.message }
  }

  const todayKey = toDateKey(new Date())
  const { data: futureEvents } = await supabase
    .from('team_events')
    .select('id')
    .eq('team_id', teamId)
    .gte('event_date', todayKey)

  if (futureEvents?.length) {
    await supabase.from('team_event_member_status').upsert(
      futureEvents.map((event) => ({
        event_id: event.id,
        client_id: parsed.data.clientId,
        rsvp_status: 'no_response' as const,
      })),
      { onConflict: 'event_id,client_id', ignoreDuplicates: true }
    )
  }

  let assigned = false

  if (team.active_program_id) {
    const startDate = resolveMemberStartDate(
      parsed.data.startDateMode,
      team.program_start_date,
      parsed.data.customStartDate
    )

    if (!startDate) {
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('client_id', parsed.data.clientId)

      return {
        success: false,
        error: 'Choose how to set this member’s program start date.',
      }
    }

    const assignResult = await assignProgramToClient(
      parsed.data.clientId,
      { programId: team.active_program_id, startDate },
      teamId
    )

    if (!assignResult.success) {
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('client_id', parsed.data.clientId)

      return { success: false, error: assignResult.error }
    }

    assigned = true
  }

  revalidateTeams(teamId, [parsed.data.clientId])
  return { success: true, assigned }
}

export async function removeTeamMember(
  teamId: string,
  clientId: string,
  values: RemoveTeamMemberValues
): Promise<ActionResult> {
  const parsed = removeTeamMemberSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!member) {
    return { success: false, error: 'Client is not on this team.' }
  }

  if (parsed.data.unassignProgram) {
    const { data: assignment } = await supabase
      .from('program_assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .eq('team_id', teamId)
      .maybeSingle()

    if (assignment) {
      const unassignResult = await unassignProgramFromClient(clientId)
      if (!unassignResult.success) {
        return { success: false, error: unassignResult.error }
      }
    }
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('client_id', clientId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams(teamId, [clientId])
  return { success: true }
}

export async function assignProgramToTeam(
  teamId: string,
  values: AssignProgramToTeamValues
): Promise<AssignProgramToTeamResult> {
  const parsed = assignProgramToTeamSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please select a program.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id, status')
    .eq('id', parsed.data.programId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (programError || !program) {
    return { success: false, error: 'Program not found.' }
  }

  if (program.status === 'archived') {
    return { success: false, error: 'Archived programs cannot be assigned.' }
  }

  const startDate = parsed.data.startDate?.trim()
    ? parsed.data.startDate.trim()
    : toDateKey(new Date())

  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('client_id')
    .eq('team_id', teamId)

  if (membersError) {
    return { success: false, error: membersError.message }
  }

  const { error: teamUpdateError } = await supabase
    .from('teams')
    .update({
      active_program_id: parsed.data.programId,
      program_start_date: startDate,
    })
    .eq('id', teamId)
    .eq('coach_id', user.id)

  if (teamUpdateError) {
    return { success: false, error: teamUpdateError.message }
  }

  const clientIds = (members ?? []).map((member) => member.client_id)
  const assignValues = { programId: parsed.data.programId, startDate }
  const result = await assignProgramToTeamMembers(teamId, assignValues, clientIds)

  revalidateTeams(
    teamId,
    clientIds
  )

  return {
    success: true,
    assignedCount: result.succeeded.length,
    failedCount: result.failed.length,
    totalScheduled: result.totalScheduled,
    totalSkipped: result.totalSkipped,
  }
}

export async function unassignProgramFromTeam(
  teamId: string,
  values: UnassignProgramFromTeamValues
): Promise<UnassignProgramFromTeamResult> {
  const parsed = unassignProgramFromTeamSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid request.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  let unassignedCount = 0

  if (parsed.data.unassignMembers) {
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('client_id')
      .eq('team_id', teamId)

    if (membersError) {
      return { success: false, error: membersError.message }
    }

    for (const member of members ?? []) {
      const { data: assignment } = await supabase
        .from('program_assignments')
        .select('id')
        .eq('client_id', member.client_id)
        .eq('coach_id', user.id)
        .eq('status', 'active')
        .eq('team_id', teamId)
        .maybeSingle()

      if (!assignment) continue

      const result = await unassignProgramFromClient(member.client_id)
      if (result.success) {
        unassignedCount += 1
      }
    }
  }

  const { error } = await supabase
    .from('teams')
    .update({
      active_program_id: null,
      program_start_date: null,
    })
    .eq('id', teamId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams(teamId)
  return { success: true, unassignedCount }
}

export async function shareTeamWithGym(
  teamId: string,
  gymId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext) {
    return {
      success: false,
      error: 'You must be a member of this gym to add teams.',
    }
  }

  const { data: team, error: fetchError } = await supabase
    .from('teams')
    .select('id, coach_id')
    .eq('id', teamId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !team) {
    return { success: false, error: 'Team not found.' }
  }

  const { error } = await supabase
    .from('teams')
    .update({ gym_id: gymContext.gym.id })
    .eq('id', teamId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams(teamId)
  return { success: true }
}

export async function unshareTeamFromGym(teamId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('teams')
    .update({ gym_id: null })
    .eq('id', teamId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams(teamId)
  return { success: true }
}

export type ShareAllTeamsResult =
  | { success: true; count: number }
  | { success: false; error: string }

export async function shareTeamsWithGym(
  gymId: string,
  teamIds: string[]
): Promise<ShareAllTeamsResult> {
  const uniqueIds = Array.from(new Set(teamIds))

  if (uniqueIds.length === 0) {
    return { success: false, error: 'Select at least one team.' }
  }

  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext) {
    return {
      success: false,
      error: 'You must be a member of this gym to add teams.',
    }
  }

  const { data, error } = await supabase
    .from('teams')
    .update({ gym_id: gymContext.gym.id })
    .eq('coach_id', user.id)
    .in('id', uniqueIds)
    .select('id')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams()
  revalidatePath('/gym')
  return { success: true, count: data?.length ?? 0 }
}

export async function shareAllTeamsWithGym(
  gymId: string
): Promise<ShareAllTeamsResult> {
  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext) {
    return {
      success: false,
      error: 'You must be a member of this gym to add teams.',
    }
  }

  const { data, error } = await supabase
    .from('teams')
    .update({ gym_id: gymContext.gym.id })
    .eq('coach_id', user.id)
    .select('id')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeams()
  revalidatePath('/gym')
  return { success: true, count: data?.length ?? 0 }
}
