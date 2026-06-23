import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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
    <section className="rounded-xl border border-brand/20 bg-brand/5 p-3 sm:rounded-2xl sm:p-4">
      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-3">
        <p className="min-w-0 flex-1 text-sm leading-snug font-medium lg:flex-none">
          {dueLabel}
        </p>
        <Button
          variant="brand"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3.5 text-xs lg:h-9 lg:w-full lg:rounded-md lg:px-4 lg:text-sm"
          asChild
        >
          <Link href="/portal/check-in">
            Check in
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
