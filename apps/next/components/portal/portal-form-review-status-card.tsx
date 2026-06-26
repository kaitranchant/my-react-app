import Link from 'next/link'
import { ArrowRight, Video } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatFormReviewCoachReplyMessage } from '@/lib/form-reviews'
import type { PortalFormReviewHighlight } from '@/lib/portal-home-highlights'

type PortalFormReviewStatusCardProps = {
  highlight?: PortalFormReviewHighlight | null
  coachName?: string
}

export function PortalFormReviewStatusCard({
  highlight,
  coachName = 'Coach',
}: PortalFormReviewStatusCardProps) {
  const unreadReplyCount = highlight?.unreadReplyCount ?? 0
  const recentCoachReply = highlight?.recentCoachReply ?? null

  return (
    <Link href="/portal/form-review" className="group block">
      <Card className="h-full transition-colors group-hover:border-brand/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Video className="text-brand size-5" />
              Form review
            </span>
            {unreadReplyCount > 0 ? (
              <Badge variant="default">
                {unreadReplyCount} new repl{unreadReplyCount === 1 ? 'y' : 'ies'}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentCoachReply ? (
            <p className="text-brand text-sm font-medium leading-relaxed">
              {formatFormReviewCoachReplyMessage(recentCoachReply, coachName)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Upload lift photos or videos for technique feedback from your coach.
            </p>
          )}
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs group-hover:text-brand">
            Open form review
            <ArrowRight className="size-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
