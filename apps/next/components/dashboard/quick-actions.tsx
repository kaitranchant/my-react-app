'use client'

import Link from 'next/link'
import { CalendarPlus, ClipboardList, UserPlus } from 'lucide-react'

import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { WorkoutFormDialog } from '@/components/workouts/workout-form-dialog'
import { cn } from '@/lib/utils'

type QuickActionsProps = {
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
    key: 'create-workout',
    label: 'Build program',
    description: 'Create a workout or session template',
    icon: ClipboardList,
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

export function QuickActions({ gyms = [] }: QuickActionsProps) {
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

        <WorkoutFormDialog
          trigger={
            <button type="button" className={mobileActionClass}>
              <ClipboardList className="text-chart-2 size-4 shrink-0" />
              <span>{actions[1].label}</span>
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

        <WorkoutFormDialog
          trigger={
            <button type="button" className={desktopActionClass}>
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  actions[1].accent
                )}
              >
                <ClipboardList className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{actions[1].label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {actions[1].description}
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
