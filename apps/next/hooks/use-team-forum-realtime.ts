'use client'

import * as React from 'react'

import { createClient } from '@/lib/supabase/client'
import type {
  TeamForumPostWithReplies,
  TeamForumReplyWithAuthor,
} from 'app/types/database'

export function useTeamForumRealtime(
  teamId: string | null,
  initialPosts: TeamForumPostWithReplies[]
) {
  const [posts, setPosts] = React.useState(initialPosts)

  React.useEffect(() => {
    setPosts(initialPosts)
  }, [teamId, initialPosts])

  React.useEffect(() => {
    if (!teamId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`team-forum:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_forum_posts',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const incoming = payload.new as TeamForumPostWithReplies
          setPosts((current) => {
            if (current.some((post) => post.id === incoming.id)) {
              return current
            }
            return [
              {
                ...incoming,
                replies: [],
                authorName: 'Member',
              },
              ...current,
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_forum_replies',
        },
        (payload) => {
          const incoming = payload.new as TeamForumReplyWithAuthor
          setPosts((current) =>
            current.map((post) => {
              if (post.id !== incoming.post_id) return post
              if (post.replies.some((reply) => reply.id === incoming.id)) {
                return post
              }
              return {
                ...post,
                replies: [
                  ...post.replies,
                  { ...incoming, authorName: 'Member' },
                ].sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                ),
              }
            })
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [teamId])

  return posts
}
