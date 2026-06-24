'use client'

import * as React from 'react'
import { Pin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createForumPost,
  createForumReply,
  deleteForumPost,
  pinForumPost,
} from '@/app/(dashboard)/teams/forum-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useTeamForumRealtime } from '@/hooks/use-team-forum-realtime'
import { formatMessageTimestamp } from '@/lib/messages'
import type { TeamForumPostWithReplies } from 'app/types/database'

type TeamForumPanelProps = {
  teamId: string
  posts: TeamForumPostWithReplies[]
}

export function TeamForumPanel({ teamId, posts: initialPosts }: TeamForumPanelProps) {
  const posts = useTeamForumRealtime(teamId, initialPosts)
  const [body, setBody] = React.useState('')
  const [replyBodies, setReplyBodies] = React.useState<Record<string, string>>({})
  const [pending, setPending] = React.useState(false)

  async function handleCreatePost() {
    const trimmed = body.trim()
    if (!trimmed || pending) return

    setPending(true)
    const result = await createForumPost(teamId, trimmed)
    setPending(false)

    if (result.success) {
      toast.success('Post published')
      setBody('')
    } else {
      toast.error(result.error)
    }
  }

  async function handleReply(postId: string) {
    const trimmed = replyBodies[postId]?.trim()
    if (!trimmed || pending) return

    setPending(true)
    const result = await createForumReply(teamId, postId, trimmed)
    setPending(false)

    if (result.success) {
      toast.success('Reply posted')
      setReplyBodies((current) => ({ ...current, [postId]: '' }))
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(postId: string) {
    const result = await deleteForumPost(teamId, postId)
    if (result.success) {
      toast.success('Post deleted')
    } else {
      toast.error(result.error)
    }
  }

  async function handlePin(postId: string, pinned: boolean) {
    const result = await pinForumPost(teamId, postId, pinned)
    if (result.success) {
      toast.success(pinned ? 'Post pinned' : 'Post unpinned')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community</CardTitle>
        <CardDescription>
          Team discussion between you and your athletes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Start a discussion…"
            disabled={pending}
          />
          <Button
            type="button"
            size="sm"
            disabled={!body.trim() || pending}
            onClick={() => void handleCreatePost()}
          >
            Post
          </Button>
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{post.authorName}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {post.author_role}
                      </Badge>
                      {post.pinned ? (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Pin className="size-3" />
                          Pinned
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatMessageTimestamp(post.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={post.pinned ? 'Unpin post' : 'Pin post'}
                      onClick={() => void handlePin(post.id, !post.pinned)}
                    >
                      <Pin className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Delete post"
                      onClick={() => void handleDelete(post.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>

                {post.replies.length > 0 ? (
                  <div className="mt-4 space-y-3 border-l pl-4">
                    {post.replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{reply.authorName}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {reply.author_role}
                          </Badge>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {reply.body}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatMessageTimestamp(reply.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-end gap-2">
                  <Textarea
                    rows={2}
                    value={replyBodies[post.id] ?? ''}
                    onChange={(event) =>
                      setReplyBodies((current) => ({
                        ...current,
                        [post.id]: event.target.value,
                      }))
                    }
                    placeholder="Reply…"
                    className="min-h-0"
                    disabled={pending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!replyBodies[post.id]?.trim() || pending}
                    onClick={() => void handleReply(post.id)}
                  >
                    Reply
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
