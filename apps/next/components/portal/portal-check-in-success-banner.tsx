'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarCheck, CheckCircle2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PortalCheckInSuccessBanner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    setVisible(searchParams.get('checkIn') === 'submitted')
  }, [searchParams])

  function dismiss() {
    setVisible(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('checkIn')
    const query = params.toString()
    router.replace(query ? `/portal?${query}` : '/portal')
  }

  if (!visible) {
    return null
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-status-success/30 bg-status-success/10 p-4',
        'animate-in fade-in slide-in-from-top-2 duration-300'
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="bg-status-success/15 text-status-success-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <CheckCircle2 className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">Check-in recorded</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your coach will review it soon. You can update it anytime before they
            leave feedback.
          </p>
          <Button
            asChild
            variant="link"
            className="text-brand h-auto p-0 text-sm font-medium"
          >
            <Link href="/portal/check-in">
              <CalendarCheck className="size-3.5" />
              View check-in
            </Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      </div>
    </section>
  )
}
