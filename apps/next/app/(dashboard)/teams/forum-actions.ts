'use server'

import { revalidatePath } from 'next/cache'

import { notifyTeamClientsOfForumPost } from '@/lib/notifications/notify-team-forum-post'
import { createClient } from '@/lib/supabase/server'
import {
  forumPostBodySchema,
  forumReplyBodySchema,
} from '@/lib/validations/forum'

export type ActionResult = { success: true } | { success: false; error: string }

async function requireTeamCoach(teamId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, coach_id')
    .eq('id', teamId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!team) {
    return null
  }

  return { supabase, user, team }
}

function revalidateForumPaths(teamId: string) {
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/portal/team')
}

export async function createForumPost(
  teamId: string,
  body: string
): Promise<ActionResult> {
  const parsed = forumPostBodySchema.safeParse(body)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid post.',
    }
  }

  const ctx = await requireTeamCoach(teamId)
  if (!ctx) {
    return { success: false, error: 'Team not found.' }
  }

  const { error } = await ctx.supabase.from('team_forum_posts').insert({
    team_id: teamId,
    author_id: ctx.user.id,
    author_role: 'coach',
    body: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  void notifyTeamClientsOfForumPost({
    teamId,
    teamName: ctx.team.name,
    coachId: ctx.team.coach_id,
    preview: parsed.data,
  })

  revalidateForumPaths(teamId)
  return { success: true }
}

export async function createForumReply(
  teamId: string,
  postId: string,
  body: string
): Promise<ActionResult> {
  const parsed = forumReplyBodySchema.safeParse(body)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid reply.',
    }
  }

  const ctx = await requireTeamCoach(teamId)
  if (!ctx) {
    return { success: false, error: 'Team not found.' }
  }

  const { data: post } = await ctx.supabase
    .from('team_forum_posts')
    .select('id')
    .eq('id', postId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (!post) {
    return { success: false, error: 'Post not found.' }
  }

  const { error } = await ctx.supabase.from('team_forum_replies').insert({
    post_id: postId,
    author_id: ctx.user.id,
    author_role: 'coach',
    body: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateForumPaths(teamId)
  return { success: true }
}

export async function deleteForumPost(
  teamId: string,
  postId: string
): Promise<ActionResult> {
  const ctx = await requireTeamCoach(teamId)
  if (!ctx) {
    return { success: false, error: 'Team not found.' }
  }

  const { error } = await ctx.supabase
    .from('team_forum_posts')
    .delete()
    .eq('id', postId)
    .eq('team_id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateForumPaths(teamId)
  return { success: true }
}

export async function pinForumPost(
  teamId: string,
  postId: string,
  pinned: boolean
): Promise<ActionResult> {
  const ctx = await requireTeamCoach(teamId)
  if (!ctx) {
    return { success: false, error: 'Team not found.' }
  }

  const { error } = await ctx.supabase
    .from('team_forum_posts')
    .update({ pinned })
    .eq('id', postId)
    .eq('team_id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateForumPaths(teamId)
  return { success: true }
}
