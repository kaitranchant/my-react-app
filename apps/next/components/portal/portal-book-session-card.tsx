import Link from 'next/link'
import { ArrowRight, CalendarClock } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type PortalBookSessionCardProps = {
  upcomingCount: number
}

export function PortalBookSessionCard({
  upcomingCount,
}: PortalBookSessionCardProps) {
  return (
    <Link href="/portal/sessions" className="group block">
      <Card className="h-full transition-colors group-hover:border-brand/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <CalendarClock className="text-brand size-4" />
              Sessions
            </span>
            <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {upcomingCount > 0
              ? `You have ${upcomingCount} upcoming session${upcomingCount === 1 ? '' : 's'}. Book another or manage existing ones.`
              : 'Book a 1:1 coaching session when your coach has open slots.'}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
