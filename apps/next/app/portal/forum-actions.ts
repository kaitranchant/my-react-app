'use server'

import { revalidatePath } from 'next/cache'

import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import {
  forumPostBodySchema,
  forumReplyBodySchema,
} from '@/lib/validations/forum'

export type ActionResult = { success: true } | { success: false; error: string }

const CLIENT_POSTS_PER_HOUR = 10

async function countRecentClientForumPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authorId: string,
  teamId: string
) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('team_forum_posts')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('author_id', authorId)
    .gte('created_at', since)

  return count ?? 0
}

function revalidateForumPaths(teamId: string) {
  revalidatePath('/portal/team')
  revalidatePath(`/teams/${teamId}`)
}

export async function createPortalForumPost(
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

  const portalCtx = await getPortalClientContext()
  if (!portalCtx?.client) {
    return { success: false, error: 'Client profile not found.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const recentCount = await countRecentClientForumPosts(
    supabase,
    user.id,
    teamId
  )
  if (recentCount >= CLIENT_POSTS_PER_HOUR) {
    return {
      success: false,
      error: 'You can only post 10 times per hour. Try again later.',
    }
  }

  const { error } = await supabase.from('team_forum_posts').insert({
    team_id: teamId,
    author_id: user.id,
    author_role: 'client',
    body: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateForumPaths(teamId)
  return { success: true }
}

export async function createPortalForumReply(
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

  const portalCtx = await getPortalClientContext()
  if (!portalCtx?.client) {
    return { success: false, error: 'Client profile not found.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: post } = await supabase
    .from('team_forum_posts')
    .select('id, team_id')
    .eq('id', postId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (!post) {
    return { success: false, error: 'Post not found.' }
  }

  const { error } = await supabase.from('team_forum_replies').insert({
    post_id: postId,
    author_id: user.id,
    author_role: 'client',
    body: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateForumPaths(teamId)
  return { success: true }
}

export async function deletePortalForumPost(
  teamId: string,
  postId: string
): Promise<ActionResult> {
  const portalCtx = await getPortalClientContext()
  if (!portalCtx?.client) {
    return { success: false, error: 'Client profile not found.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('team_forum_posts')
    .delete()
    .eq('id', postId)
    .eq('team_id', teamId)
    .eq('author_id', user.id)
    .eq('author_role', 'client')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateForumPaths(teamId)
  return { success: true }
}
