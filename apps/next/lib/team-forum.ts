import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Database,
  TeamForumPost,
  TeamForumPostWithReplies,
  TeamForumReply,
} from 'app/types/database'

const FORUM_POST_PAGE_SIZE = 20

type AuthorMaps = {
  coachName: string
  clientNamesByUserId: Map<string, string>
}

async function resolveAuthorMaps(
  supabase: SupabaseClient<Database>,
  teamId: string,
  coachId: string
): Promise<AuthorMaps> {
  const [{ data: coachProfile }, { data: members }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', coachId)
      .maybeSingle(),
    supabase
      .from('team_members')
      .select('client:clients(full_name, user_id)')
      .eq('team_id', teamId),
  ])

  const coachName =
    coachProfile?.business_name?.trim() ||
    coachProfile?.full_name?.trim() ||
    'Coach'

  const clientNamesByUserId = new Map<string, string>()
  for (const member of members ?? []) {
    const client = member.client as
      | { full_name: string; user_id: string | null }
      | null
      | undefined
    if (client?.user_id) {
      clientNamesByUserId.set(client.user_id, client.full_name)
    }
  }

  return { coachName, clientNamesByUserId }
}

function resolveAuthorName(
  post: Pick<TeamForumPost, 'author_id' | 'author_role'>,
  maps: AuthorMaps
) {
  if (post.author_role === 'coach') {
    return maps.coachName
  }
  return maps.clientNamesByUserId.get(post.author_id) ?? 'Client'
}

export async function fetchTeamForumPosts(
  supabase: SupabaseClient<Database>,
  teamId: string,
  coachId: string
): Promise<TeamForumPostWithReplies[]> {
  const { data: posts, error } = await supabase
    .from('team_forum_posts')
    .select('*')
    .eq('team_id', teamId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(FORUM_POST_PAGE_SIZE)

  if (error || !posts?.length) {
    return []
  }

  const postIds = posts.map((post) => post.id)
  const { data: replies } = await supabase
    .from('team_forum_replies')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true })

  const maps = await resolveAuthorMaps(supabase, teamId, coachId)
  const repliesByPostId = new Map<string, TeamForumReply[]>()

  for (const reply of (replies ?? []) as TeamForumReply[]) {
    const list = repliesByPostId.get(reply.post_id) ?? []
    list.push(reply)
    repliesByPostId.set(reply.post_id, list)
  }

  return (posts as TeamForumPost[]).map((post) => ({
    ...post,
    replies: (repliesByPostId.get(post.id) ?? []).map((reply) => ({
      ...reply,
      authorName: resolveAuthorName(reply, maps),
    })),
    authorName: resolveAuthorName(post, maps),
  }))
}

export async function fetchClientTeamForumPosts(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<TeamForumPostWithReplies[]> {
  const { data: team } = await supabase
    .from('teams')
    .select('coach_id')
    .eq('id', teamId)
    .maybeSingle()

  if (!team) {
    return []
  }

  return fetchTeamForumPosts(supabase, teamId, team.coach_id)
}

export function resolveForumReplyAuthorName(
  reply: Pick<TeamForumReply, 'author_id' | 'author_role'>,
  maps: AuthorMaps
) {
  return resolveAuthorName(reply, maps)
}

export async function getTeamForumAuthorMaps(
  supabase: SupabaseClient<Database>,
  teamId: string,
  coachId: string
) {
  return resolveAuthorMaps(supabase, teamId, coachId)
}
