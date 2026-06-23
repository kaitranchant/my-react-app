'use server'

import { revalidatePath } from 'next/cache'

import { requireTeamAccess } from '@/lib/gym-access'
import {
  teamChallengeFormSchema,
  type TeamChallengeFormValues,
} from '@/lib/validations/team'
import type { TeamChallenge } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateTeamChallengeResult =
  | { success: true; challengeId: string }
  | { success: false; error: string }

async function getTeamForCoach(teamId: string) {
  const access = await requireTeamAccess(teamId)
  if (!access) {
    return { error: 'Team not found.' as const }
  }

  return {
    supabase: access.supabase,
    user: access.user,
    team: access.team,
    error: null,
  }
}

function revalidateChallengePaths(teamId: string) {
  revalidatePath('/teams')
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/portal/team')
  revalidatePath('/portal/leaderboards')
}

function mapChallengeFormValues(
  values: TeamChallengeFormValues,
  teamId: string,
  coachId: string
) {
  return {
    team_id: teamId,
    coach_id: coachId,
    name: values.name,
    description: values.description?.trim() || null,
    metric: values.metric,
    exercise_id:
      values.exerciseId && values.exerciseId !== 'none'
        ? values.exerciseId
        : null,
    formula:
      values.metric === 'relative_strength'
        ? values.formula ?? 'dots'
        : null,
    weight_class_filter: values.weightClassFilter?.trim() || null,
    start_date: values.startDate,
    end_date: values.endDate,
    status: 'draft' as const,
  }
}

export async function createTeamChallenge(
  teamId: string,
  values: TeamChallengeFormValues
): Promise<CreateTeamChallengeResult> {
  const parsed = teamChallengeFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error) {
    return { success: false, error: ctx.error }
  }

  const { data, error } = await ctx.supabase
    .from('team_challenges')
    .insert(mapChallengeFormValues(parsed.data, teamId, ctx.user.id))
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create challenge.' }
  }

  revalidateChallengePaths(teamId)
  return { success: true, challengeId: data.id as string }
}

export async function publishTeamChallenge(
  teamId: string,
  challengeId: string
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error) {
    return { success: false, error: ctx.error }
  }

  const { error } = await ctx.supabase
    .from('team_challenges')
    .update({ status: 'active' })
    .eq('id', challengeId)
    .eq('team_id', teamId)
    .eq('status', 'draft')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateChallengePaths(teamId)
  return { success: true }
}

export async function cancelTeamChallenge(
  teamId: string,
  challengeId: string
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error) {
    return { success: false, error: ctx.error }
  }

  const { error } = await ctx.supabase
    .from('team_challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId)
    .eq('team_id', teamId)
    .in('status', ['draft', 'active'])

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateChallengePaths(teamId)
  return { success: true }
}

export async function deleteTeamChallenge(
  teamId: string,
  challengeId: string
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error) {
    return { success: false, error: ctx.error }
  }

  const { error } = await ctx.supabase
    .from('team_challenges')
    .delete()
    .eq('id', challengeId)
    .eq('team_id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateChallengePaths(teamId)
  return { success: true }
}

export async function restoreTeamChallenge(
  teamId: string,
  challenge: TeamChallenge
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error) {
    return { success: false, error: ctx.error }
  }

  const { error } = await ctx.supabase.from('team_challenges').insert({
    id: challenge.id,
    team_id: challenge.team_id,
    coach_id: challenge.coach_id,
    name: challenge.name,
    description: challenge.description,
    metric: challenge.metric,
    exercise_id: challenge.exercise_id,
    formula: challenge.formula,
    weight_class_filter: challenge.weight_class_filter,
    start_date: challenge.start_date,
    end_date: challenge.end_date,
    status: challenge.status,
    created_at: challenge.created_at,
    updated_at: challenge.updated_at,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateChallengePaths(teamId)
  return { success: true }
}
