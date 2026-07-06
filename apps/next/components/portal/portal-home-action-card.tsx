import Link from 'next/link'
import { ArrowRight, Apple, CalendarCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PortalCheckInStatus } from '@/lib/portal-data'

type PortalHomeActionCardProps = {
  checkInStatus: PortalCheckInStatus
  dueLabel: string
  needsNutritionLogToday: boolean
}

export function PortalHomeActionCard({
  checkInStatus,
  dueLabel,
  needsNutritionLogToday,
}: PortalHomeActionCardProps) {
  const showCheckIn = checkInStatus === 'due'
  if (!showCheckIn && !needsNutritionLogToday) {
    return null
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-base">Today&apos;s to-dos</CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {showCheckIn ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <CalendarCheck className="text-brand size-4 shrink-0" />
              <p className="text-sm leading-snug font-medium">{dueLabel}</p>
            </div>
            <Button
              variant="brand"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3.5 text-xs"
              asChild
            >
              <Link href="/portal/check-in">
                Check in
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : null}
        {needsNutritionLogToday ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Apple className="text-brand size-4 shrink-0" />
              <p className="text-sm leading-snug font-medium">
                Log nutrition adherence
              </p>
            </div>
            <Button
              variant="brand"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3.5 text-xs"
              asChild
            >
              <Link href="/portal/nutrition" aria-label="Log nutrition">
                Log
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
