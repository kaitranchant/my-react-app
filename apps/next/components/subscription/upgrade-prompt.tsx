import Link from 'next/link'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getUpgradeMessage,
  type SubscriptionGateResult,
} from '@/lib/subscription-server'
import { PLAN_LABELS } from '@/lib/subscription-plans'

type UpgradePromptProps = {
  gate: Extract<SubscriptionGateResult, { allowed: false }>
}

export function UpgradePrompt({ gate }: UpgradePromptProps) {
  const message = getUpgradeMessage(gate.feature, gate.requiredPlan)
  const planLabel = PLAN_LABELS[gate.requiredPlan]

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="empty-state-icon mx-auto mb-2">
            <Lock className="size-7" />
          </div>
          <CardTitle>Upgrade to {planLabel}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-8">
          <p className="text-muted-foreground text-center text-sm">
            You&apos;re on{' '}
            <span className="text-foreground font-medium">
              {PLAN_LABELS[gate.context.personalPlan]}
            </span>
            {gate.context.inPaidFacility
              ? ' with Facility team benefits'
              : null}
            .
          </p>
          <Button asChild variant="brand">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
