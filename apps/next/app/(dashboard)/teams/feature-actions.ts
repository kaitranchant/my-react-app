'use server'

import { revalidatePath } from 'next/cache'

import { requireTeamAccess, requireUser } from '@/lib/gym-access'
import { notifyTeamClientsOfAnnouncement } from '@/lib/notifications/notify-team-clients'
import { createClient } from '@/lib/supabase/server'
import {
  teamAnnouncementSchema,
  teamEventFormSchema,
  teamPowerliftingExercisesSchema,
  updateTeamEventMemberStatusSchema,
  type TeamAnnouncementValues,
  type TeamEventFormValues,
  type TeamPowerliftingExercisesValues,
  type UpdateTeamEventMemberStatusValues,
} from '@/lib/validations/team'
import type { TeamAnnouncement } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateTeamEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string }

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
      name: access.team.name,
    },
    error: null,
  }
}

function revalidateTeam(teamId: string) {
  revalidatePath('/teams')
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/attendance')
  revalidatePath('/leaderboards')
  revalidatePath('/portal/leaderboards')
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

  void notifyTeamClientsOfAnnouncement({
    teamId,
    teamName: team.name,
    coachId: user.id,
    content: parsed.data.content,
  })

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

export async function restoreTeamAnnouncement(
  teamId: string,
  announcement: TeamAnnouncement
): Promise<ActionResult> {
  const { supabase, user, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  if (announcement.team_id !== teamId || announcement.coach_id !== user.id) {
    return { success: false, error: 'Announcement not found.' }
  }

  const { error } = await supabase.from('team_announcements').insert({
    id: announcement.id,
    team_id: announcement.team_id,
    coach_id: announcement.coach_id,
    content: announcement.content,
    pinned: announcement.pinned,
    created_at: announcement.created_at,
    updated_at: announcement.updated_at,
  })

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

type TeamEventAttendanceSnapshot = {
  clientId: string
  attendanceStatus: import('app/types/database').TeamEventAttendanceStatus | null
  hadStatusRow: boolean
}

export async function restoreTeamEventAttendanceBatch(
  teamId: string,
  eventId: string,
  snapshots: TeamEventAttendanceSnapshot[]
): Promise<ActionResult> {
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

  for (const snapshot of snapshots) {
    if (!snapshot.hadStatusRow) {
      const { error } = await supabase
        .from('team_event_member_status')
        .delete()
        .eq('event_id', eventId)
        .eq('client_id', snapshot.clientId)

      if (error) {
        return { success: false, error: error.message }
      }
      continue
    }

    const result = await updateTeamEventMemberStatus(teamId, eventId, {
      clientId: snapshot.clientId,
      attendanceStatus: snapshot.attendanceStatus,
    })

    if (!result.success) {
      return result
    }
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

function toExerciseId(value: string): string | null {
  return value === 'none' ? null : value
}

async function validateTeamCoachExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  exerciseIds: (string | null)[]
): Promise<ActionResult | null> {
  const ids = exerciseIds.filter((value): value is string => Boolean(value))
  if (ids.length === 0) {
    return null
  }

  const { data, error } = await supabase
    .from('exercises')
    .select('id')
    .eq('coach_id', coachId)
    .in('id', ids)

  if (error) {
    return { success: false, error: error.message }
  }

  if ((data?.length ?? 0) !== ids.length) {
    return { success: false, error: 'One or more exercises were not found.' }
  }

  return null
}

export async function updateTeamPowerliftingExercises(
  teamId: string,
  values: TeamPowerliftingExercisesValues
): Promise<ActionResult> {
  const parsed = teamPowerliftingExercisesSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, team, error: teamError } = await getTeamForCoach(teamId)
  if (teamError || !team) {
    return { success: false, error: teamError ?? 'Team not found.' }
  }

  const squatExerciseId = toExerciseId(parsed.data.squatExerciseId)
  const benchExerciseId = toExerciseId(parsed.data.benchExerciseId)
  const deadliftExerciseId = toExerciseId(parsed.data.deadliftExerciseId)

  const validationError = await validateTeamCoachExercises(
    supabase,
    team.coach_id,
    [squatExerciseId, benchExerciseId, deadliftExerciseId]
  )
  if (validationError) {
    return validationError
  }

  const { error } = await supabase
    .from('teams')
    .update({
      squat_exercise_id: squatExerciseId,
      bench_exercise_id: benchExerciseId,
      deadlift_exercise_id: deadliftExerciseId,
    })
    .eq('id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeam(teamId)
  return { success: true }
}
