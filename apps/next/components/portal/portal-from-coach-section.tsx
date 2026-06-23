import Link from 'next/link'
import { ArrowRight, MessageSquare, Video } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  PortalFormReviewHighlight,
  PortalMessageHighlight,
} from '@/lib/portal-home-highlights'
import { formatFormReviewCoachReplySubject } from '@/lib/form-reviews'

type PortalFromCoachSectionProps = {
  coachName: string
  messageHighlight: PortalMessageHighlight | null
  formReviewHighlight: PortalFormReviewHighlight | null
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

export function PortalFromCoachSection({
  coachName,
  messageHighlight,
  formReviewHighlight,
}: PortalFromCoachSectionProps) {
  const latestMessage = messageHighlight?.latestCoachMessage ?? null
  const unreadCount = messageHighlight?.unreadCount ?? 0
  const coachReply = formReviewHighlight?.recentCoachReply ?? null
  const pendingFormReviews = formReviewHighlight?.pendingCount ?? 0

  const hasContent =
    latestMessage != null || coachReply != null || pendingFormReviews > 0

  if (!hasContent) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span>From your coach</span>
          {unreadCount > 0 ? (
            <Badge variant="default">
              {unreadCount} new
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {latestMessage ? (
          <Link
            href="/portal/messages"
            className="group block py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <MessageSquare className="text-brand mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-3 text-sm leading-relaxed">
                  <span className="font-medium">{coachName}</span>
                  <span className="text-muted-foreground"> said </span>
                  <span className="text-muted-foreground">{latestMessage.body}</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatMessageTime(latestMessage.createdAt)}
                </p>
              </div>
              <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        ) : null}

        {coachReply ? (
          <Link
            href="/portal/form-review"
            className="group block py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <Video className="text-brand mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">Form review reply</p>
                <p className="line-clamp-3 text-sm leading-relaxed">
                  <span className="font-medium">{coachName}</span>
                  <span className="text-muted-foreground"> replied to </span>
                  <span className="text-muted-foreground">
                    {formatFormReviewCoachReplySubject(coachReply)}
                  </span>
                </p>
              </div>
              <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        ) : !latestMessage && pendingFormReviews > 0 ? (
          <Link
            href="/portal/form-review"
            className="group block py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <Video className="text-brand mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">Form review</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {pendingFormReviews} submission
                  {pendingFormReviews === 1 ? '' : 's'} awaiting review
                </p>
              </div>
              <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
