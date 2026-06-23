import Link from 'next/link'
import {
  AlertTriangle,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Sparkles,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ProactiveAlert } from '@/lib/proactive-alerts'
import { cn } from '@/lib/utils'

const kindConfig = {
  inactive: {
    icon: Dumbbell,
    className: 'text-status-warning-foreground',
  },
  acwr: {
    icon: AlertTriangle,
    className: 'text-status-warning-foreground',
  },
  injury: {
    icon: HeartPulse,
    className: 'text-destructive',
  },
  check_in: {
    icon: ClipboardList,
    className: 'text-brand',
  },
} as const

const priorityBorder = {
  high: 'border-l-amber-400',
  medium: 'border-l-brand/60',
  low: 'border-l-border',
} as const

type ProactiveAlertsProps = {
  alerts: ProactiveAlert[]
}

export function ProactiveAlerts({ alerts }: ProactiveAlertsProps) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <Card className="border-status-warning/25 bg-status-warning/5 gap-0 py-0">
      <CardHeader className="border-status-warning/15 border-b px-4 py-4 sm:px-6 sm:pb-4">
        <div className="flex items-start gap-3">
          <div className="bg-status-warning/15 text-status-warning-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <CardTitle>Coaching alerts</CardTitle>
            <CardDescription>
              Named signals to guide your next move
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0 sm:px-6 sm:pt-4 sm:pb-5">
        <ul className="divide-y divide-status-warning/10">
          {alerts.map((alert) => {
            const config = kindConfig[alert.kind]
            const Icon = config.icon

            return (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className={cn(
                    'body-text flex items-start gap-3 border-l-[3px] py-3.5 pr-4 pl-4 transition-colors hover:bg-status-warning/10 sm:rounded-lg sm:py-3 sm:pr-3 sm:pl-4',
                    priorityBorder[alert.priority]
                  )}
                >
                  <Icon
                    className={cn('mt-0.5 size-4 shrink-0', config.className)}
                  />
                  <span className="flex-1 leading-snug">{alert.message}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
