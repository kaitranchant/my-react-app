'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatCheckInDate,
  formatCheckInHistoryLine,
} from '@/lib/check-ins'
import type { ClientCheckIn } from 'app/types/database'

type CheckInHistoryPanelProps = {
  checkIns: ClientCheckIn[]
  title?: string
}

export function CheckInHistoryPanel({
  checkIns,
  title = 'Recent check-ins',
}: CheckInHistoryPanelProps) {
  if (checkIns.length === 0) {
    return (
      <Card className="h-fit border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Previous entries will appear here so you can spot trends while filling
            out today&apos;s check-in.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">
          Last {checkIns.length} submission{checkIns.length === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {checkIns.map((checkIn) => (
          <div
            key={checkIn.id}
            className="bg-muted/40 rounded-lg border px-3 py-2.5 text-xs leading-relaxed"
          >
            <p className="text-foreground mb-1 font-medium">
              {formatCheckInDate(checkIn.check_in_date)}
            </p>
            <p className="text-muted-foreground">{formatCheckInHistoryLine(checkIn)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
