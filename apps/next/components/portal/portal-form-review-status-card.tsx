import Link from 'next/link'
import { ArrowRight, Video } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PortalFormReviewHighlight } from '@/lib/portal-home-highlights'

type PortalFormReviewStatusCardProps = {
  highlight?: PortalFormReviewHighlight | null
}

export function PortalFormReviewStatusCard({
  highlight,
}: PortalFormReviewStatusCardProps) {
  const pendingCount = highlight?.pendingCount ?? 0
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
            {pendingCount > 0 ? (
              <Badge variant="secondary">
                {pendingCount} awaiting review
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentCoachReply ? (
            <p className="text-brand text-sm font-medium leading-relaxed">
              {recentCoachReply.message}
            </p>
          ) : pendingCount > 0 ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your coach will review your latest submission soon.
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
