import Link from 'next/link'
import { ArrowRight, HeartPulse } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PortalCheckInStatus } from '@/lib/portal-data'

type PortalReadinessPromptProps = {
  status: PortalCheckInStatus
  dueLabel: string
}

export function PortalReadinessPrompt({
  status,
  dueLabel,
}: PortalReadinessPromptProps) {
  if (status !== 'due') {
    return null
  }

  return (
    <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-brand/15 text-brand flex size-10 shrink-0 items-center justify-center rounded-xl">
            <HeartPulse className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Quick readiness check-in</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {dueLabel}. Share sleep, energy, soreness, and how you&apos;re
              feeling before you train.
            </p>
          </div>
        </div>
        <Button variant="brand" size="sm" className="shrink-0" asChild>
          <Link href="/portal/check-in">
            Check in now
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
