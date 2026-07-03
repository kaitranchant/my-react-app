'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Calendar, CalendarPlus, UserPlus } from 'lucide-react'

import { AddClientDialog } from '@/components/clients/add-client-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type QuickActionsProps = {
  clients: { id: string; full_name: string }[]
  gyms?: { id: string; name: string }[]
}

const actions = [
  {
    key: 'add-client',
    label: 'Add client',
    description: 'Invite someone new to your practice',
    icon: UserPlus,
    accent: 'bg-brand/10 text-brand',
  },
  {
    key: 'client-calendar',
    label: 'Client calendar',
    description: "Open a client's training calendar",
    icon: Calendar,
    accent: 'bg-chart-2/10 text-chart-2',
  },
  {
    key: 'schedule',
    label: 'Schedule session',
    description: 'Book a 1:1 session with a client',
    icon: CalendarPlus,
    accent: 'bg-chart-3/10 text-chart-3',
    href: '/scheduling?book=1',
  },
] as const

const mobileActionClass =
  'hover:border-brand/30 flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-background/80 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors'

const desktopActionClass =
  'group hover:border-brand/30 hover:shadow-elevated flex items-start gap-3 rounded-xl border bg-background/80 p-4 text-left transition-all'

function ClientCalendarDialog({
  clients,
  gyms,
  trigger,
}: {
  clients: QuickActionsProps['clients']
  gyms: QuickActionsProps['gyms']
  trigger: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open client calendar</DialogTitle>
          <DialogDescription>
            Choose a client to view and manage their training calendar.
          </DialogDescription>
        </DialogHeader>
        {clients.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No clients yet.{' '}
            <AddClientDialog
              gyms={gyms}
              trigger={
                <button
                  type="button"
                  className="text-brand font-medium underline-offset-4 hover:underline"
                >
                  Add your first client
                </button>
              }
            />
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}?tab=training&section=calendar`}
                  className="hover:bg-accent flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors"
                >
                  <span className="font-medium">{client.full_name}</span>
                  <span className="text-muted-foreground text-xs">
                    Open calendar →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function QuickActions({ clients, gyms = [] }: QuickActionsProps) {
  const calendarAction = actions[1]
  const scheduleAction = actions[2]

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:hidden">
        <AddClientDialog
          gyms={gyms}
          trigger={
            <button type="button" className={mobileActionClass}>
              <UserPlus className="text-brand size-4 shrink-0" />
              <span>{actions[0].label}</span>
            </button>
          }
        />

        <ClientCalendarDialog
          clients={clients}
          gyms={gyms}
          trigger={
            <button type="button" className={mobileActionClass}>
              <Calendar className="text-chart-2 size-4 shrink-0" />
              <span>{calendarAction.label}</span>
            </button>
          }
        />

        <Link href={scheduleAction.href} className={mobileActionClass}>
          <CalendarPlus className="text-chart-3 size-4 shrink-0" />
          <span>{scheduleAction.label}</span>
        </Link>
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-3">
        <AddClientDialog
          gyms={gyms}
          trigger={
            <button type="button" className={desktopActionClass}>
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  actions[0].accent
                )}
              >
                <UserPlus className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{actions[0].label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {actions[0].description}
                </p>
              </div>
            </button>
          }
        />

        <ClientCalendarDialog
          clients={clients}
          gyms={gyms}
          trigger={
            <button type="button" className={desktopActionClass}>
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  calendarAction.accent
                )}
              >
                <Calendar className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{calendarAction.label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {calendarAction.description}
                </p>
              </div>
            </button>
          }
        />

        <Link href={scheduleAction.href} className={desktopActionClass}>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              scheduleAction.accent
            )}
          >
            <CalendarPlus className="size-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{scheduleAction.label}</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {scheduleAction.description}
            </p>
          </div>
        </Link>
      </div>
    </>
  )
}
