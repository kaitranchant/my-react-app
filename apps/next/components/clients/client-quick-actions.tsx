'use client'

import Link from 'next/link'
import {
  CalendarPlus,
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

type ClientQuickActionsProps = {
  clientId: string
}

export function ClientQuickActions({ clientId }: ClientQuickActionsProps) {
  const base = `/clients/${clientId}`

  const actions = [
    {
      label: 'Log session',
      icon: ClipboardCheck,
      href: `${base}?tab=calendar&action=log`,
    },
    {
      label: 'Schedule workout',
      icon: CalendarPlus,
      href: `${base}?tab=calendar&action=schedule`,
    },
    {
      label: 'Message',
      icon: MessageSquare,
      href: `${base}?tab=messages`,
    },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(({ label, icon: Icon, href }) => (
        <Button key={label} variant="outline" size="sm" asChild title={label}>
          <Link href={href}>
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        </Button>
      ))}
    </div>
  )
}
