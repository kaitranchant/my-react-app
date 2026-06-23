import Link from 'next/link'
import { ArrowRight, MessageSquare } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import type { PortalMessageHighlight } from '@/lib/portal-home-highlights'

type PortalRecentMessagesCardProps = {
  highlight: PortalMessageHighlight | null
}

function formatMessageTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function PortalRecentMessagesCard({
  highlight,
}: PortalRecentMessagesCardProps) {
  const latest = highlight?.latestCoachMessage ?? null
  const unreadCount = highlight?.unreadCount ?? 0

  if (!latest) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="text-brand size-5" />
            Messages from coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Your coach can reach you here about training, scheduling, or anything else."
            action={{ label: 'Open messages', href: '/portal/messages' }}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href="/portal/messages" className="group block">
      <Card className="h-full transition-colors group-hover:border-brand/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <MessageSquare className="text-brand size-5" />
              Messages from coach
            </span>
            <span className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <Badge variant="default">{unreadCount} new</Badge>
              ) : null}
              <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {latest.body}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatMessageTime(latest.createdAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
