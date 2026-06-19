'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  teamAnnouncementSchema,
  teamEventFormSchema,
  updateTeamEventMemberStatusSchema,
  type TeamAnnouncementValues,
  type TeamEventFormValues,
  type UpdateTeamEventMemberStatusValues,
} from '@/lib/validations/team'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateTeamEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

async function getTeamForCoach(teamId: string) {
  const { supabase, user } = await requireUser()
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, coach_id')
    .eq('id', teamId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !team) {
    return { supabase, user, team: null, error: 'Team not found.' as const }
  }

  return { supabase, user, team, error: null }
}

function revalidateTeam(teamId: string) {
  revalidatePath('/teams')
  revalidatePath(`/teams/${teamId}`)
}

async function seedEventMemberStatuses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  eventId: string
) {
  const { data: members } = await supabase
    .from('team_members')
    .select('client_id')
    .eq('team_id', teamId)

  if (!members?.length) return

  await supabase.from('team_event_member_status').upsert(
    members.map((member) => ({
      event_id: eventId,
      client_id: member.client_id,
      rsvp_status: 'no_response' as const,
    })),
    { onConflict: 'event_id,client_id', ignoreDuplicates: true }
  )
}

export async function createTeamAnnouncement(
  teamId: string,
  values: TeamAnnouncementValues
): Promise<ActionResult> {
  const parsed = teamAnnouncementSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { error } = await supabase.from('team_announcements').insert({
    team_id: teamId,
    coach_id: user.id,
    content: parsed.data.content,
    pinned: parsed.data.pinned ?? false,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}

export async function deleteTeamAnnouncement(
  teamId: string,
  announcementId: string
): Promise<ActionResult> {
  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { error } = await supabase
    .from('team_announcements')
    .delete()
    .eq('id', announcementId)
    .eq('team_id', teamId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}

export async function toggleTeamAnnouncementPin(
  teamId: string,
  announcementId: string,
  pinned: boolean
): Promise<ActionResult> {
  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { error } = await supabase
    .from('team_announcements')
    .update({ pinned })
    .eq('id', announcementId)
    .eq('team_id', teamId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}

export async function createTeamEvent(
  teamId: string,
  values: TeamEventFormValues
): Promise<CreateTeamEventResult> {
  const parsed = teamEventFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { data, error } = await supabase
    .from('team_events')
    .insert({
      team_id: teamId,
      coach_id: user.id,
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      event_date: parsed.data.eventDate,
      start_time: parsed.data.startTime?.trim() ? parsed.data.startTime.trim() : null,
      location: parsed.data.location?.trim() ? parsed.data.location.trim() : null,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create event.' }
  }

  await seedEventMemberStatuses(supabase, teamId, data.id)
  revalidateTeam(teamId)
  return { success: true, eventId: data.id }
}

export async function deleteTeamEvent(
  teamId: string,
  eventId: string
): Promise<ActionResult> {
  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { error } = await supabase
    .from('team_events')
    .delete()
    .eq('id', eventId)
    .eq('team_id', teamId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}

export async function updateTeamEventMemberStatus(
  teamId: string,
  eventId: string,
  values: UpdateTeamEventMemberStatusValues
): Promise<ActionResult> {
  const parsed = updateTeamEventMemberStatusSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { data: event } = await supabase
    .from('team_events')
    .select('id')
    .eq('id', eventId)
    .eq('team_id', teamId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!event) {
    return { success: false, error: 'Event not found.' }
  }

  const { data: existing } = await supabase
    .from('team_event_member_status')
    .select('rsvp_status, attendance_status')
    .eq('event_id', eventId)
    .eq('client_id', parsed.data.clientId)
    .maybeSingle()

  const { error } = await supabase.from('team_event_member_status').upsert(
    {
      event_id: eventId,
      client_id: parsed.data.clientId,
      rsvp_status:
        parsed.data.rsvpStatus ?? existing?.rsvp_status ?? 'no_response',
      attendance_status:
        parsed.data.attendanceStatus !== undefined
          ? parsed.data.attendanceStatus
          : (existing?.attendance_status ?? null),
    },
    { onConflict: 'event_id,client_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}

export async function markAllTeamEventPresent(
  teamId: string,
  eventId: string
): Promise<ActionResult> {
  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const { data: members } = await supabase
    .from('team_members')
    .select('client_id')
    .eq('team_id', teamId)

  if (!members?.length) {
    return { success: false, error: 'No team members to mark.' }
  }

  const { error } = await supabase.from('team_event_member_status').upsert(
    members.map((member) => ({
      event_id: eventId,
      client_id: member.client_id,
      attendance_status: 'present' as const,
    })),
    { onConflict: 'event_id,client_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}

export async function updateTeamMemberWeightClass(
  teamId: string,
  clientId: string,
  weightClass: string
): Promise<ActionResult> {
  const { supabase, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const trimmed = weightClass.trim()
  const { error } = await supabase
    .from('team_members')
    .update({ weight_class: trimmed ? trimmed : null })
    .eq('team_id', teamId)
    .eq('client_id', clientId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}
