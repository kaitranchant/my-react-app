'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  dismissProactiveAlert,
  undoDismissProactiveAlert,
} from '@/app/(dashboard)/dashboard/actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toastSuccessWithUndo } from '@/lib/toast-undo'
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
  const router = useRouter()
  const [pendingAlertId, setPendingAlertId] = React.useState<string | null>(null)
  const [hiddenAlertIds, setHiddenAlertIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const visibleAlerts = alerts.filter((alert) => !hiddenAlertIds.has(alert.id))

  React.useEffect(() => {
    setHiddenAlertIds(new Set())
  }, [alerts])

  async function handleDismiss(alert: ProactiveAlert) {
    setPendingAlertId(alert.id)
    setHiddenAlertIds((current) => new Set(current).add(alert.id))

    const result = await dismissProactiveAlert({
      alertId: alert.id,
      kind: alert.kind,
      signature: alert.signature,
      clientId: alert.clientId,
    })
    setPendingAlertId(null)

    if (!result.success) {
      setHiddenAlertIds((current) => {
        const next = new Set(current)
        next.delete(alert.id)
        return next
      })
      toast.error(result.error)
      return
    }

    toastSuccessWithUndo('Alert cleared', async () => {
      const undoResult = await undoDismissProactiveAlert(alert.id)
      if (!undoResult.success) {
        toast.error(undoResult.error)
        return
      }
      setHiddenAlertIds((current) => {
        const next = new Set(current)
        next.delete(alert.id)
        return next
      })
      router.refresh()
    })
    router.refresh()
  }

  if (visibleAlerts.length === 0) {
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
          {visibleAlerts.map((alert) => {
            const config = kindConfig[alert.kind]
            const Icon = config.icon

            return (
              <li key={alert.id}>
                <div
                  className={cn(
                    'flex items-start gap-2 border-l-[3px] py-3 pr-2 pl-4 sm:rounded-lg sm:py-3 sm:pr-2 sm:pl-4',
                    priorityBorder[alert.priority]
                  )}
                >
                  <Link
                    href={alert.href}
                    className="body-text flex min-w-0 flex-1 items-start gap-3 py-0.5 transition-colors hover:text-foreground"
                  >
                    <Icon
                      className={cn('mt-0.5 size-4 shrink-0', config.className)}
                    />
                    <span className="flex-1 leading-snug">{alert.message}</span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    disabled={pendingAlertId === alert.id}
                    aria-label={`Clear alert: ${alert.message}`}
                    onClick={() => void handleDismiss(alert)}
                  >
                    <Check className="size-3.5" />
                    Clear
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
