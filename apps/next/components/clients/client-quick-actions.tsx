'use client'

import Link from 'next/link'
import { CalendarPlus, ClipboardCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ClientQuickActionsProps = {
  clientId: string
}

export function ClientQuickActions({ clientId }: ClientQuickActionsProps) {
  const base = `/clients/${clientId}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="brand" size="sm" asChild>
        <Link href={`${base}?tab=training&action=log`}>
          <ClipboardCheck className="size-4" />
          <span className="hidden sm:inline">Log session</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`${base}?tab=training&action=schedule`}>
          <CalendarPlus className="size-4" />
          <span className="hidden sm:inline">Schedule workout</span>
        </Link>
      </Button>
    </div>
  )
}
