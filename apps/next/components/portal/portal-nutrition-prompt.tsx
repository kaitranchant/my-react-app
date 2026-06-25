import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

type PortalNutritionPromptProps = {
  needsLogToday: boolean
}

export function PortalNutritionPrompt({
  needsLogToday,
}: PortalNutritionPromptProps) {
  if (!needsLogToday) {
    return null
  }

  return (
    <section className="rounded-xl border border-brand/20 bg-brand/5 p-3 sm:rounded-2xl sm:p-4">
      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-3">
        <p className="min-w-0 flex-1 text-sm leading-snug font-medium lg:flex-none">
          Log today&apos;s nutrition adherence
        </p>
        <Button
          variant="brand"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3.5 text-xs lg:h-9 lg:w-full lg:rounded-md lg:px-4 lg:text-sm"
          asChild
        >
          <Link href="/portal/nutrition">
            Log nutrition
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
