'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
} from 'lucide-react'

import { AppointmentsList } from '@/components/scheduling/appointments-list'
import { AppointmentManageDialog } from '@/components/scheduling/appointment-manage-dialog'
import { SchedulingWeekCalendar } from '@/components/scheduling/scheduling-week-calendar'
import { SchedulingWeekStats } from '@/components/scheduling/scheduling-week-stats'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  addDaysToDateKey,
  formatSchedulingWeekRange,
} from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { GoogleCalendarBlockedTime } from '@/lib/google-calendar/blocked-times'
import type { ClientSessionPack, CoachingAppointment } from '@/lib/session-booking-types'
import { cn } from '@/lib/utils'

type SchedulingWeekPanelProps = {
  appointments: CoachingAppointment[]
  googleBlockedTimes?: GoogleCalendarBlockedTime[]
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
  weekKeys: string[]
  clients: Array<{ id: string; full_name: string | null }>
  dateOptions: string[]
}

type WeekViewMode = 'calendar' | 'list'

export function SchedulingWeekPanel({
  appointments,
  googleBlockedTimes = [],
  coachPreferences,
  sessionPacks,
  weekKeys,
  clients,
  dateOptions,
}: SchedulingWeekPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [viewMode, setViewMode] = React.useState<WeekViewMode>('calendar')
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<CoachingAppointment | null>(null)
  const [manageOpen, setManageOpen] = React.useState(false)

  const weekStartKey = weekKeys[0]!
  const weekEndKey = weekKeys[weekKeys.length - 1]!
  const weekLabel = formatSchedulingWeekRange(weekStartKey, weekEndKey)
  const prevWeekStart = addDaysToDateKey(weekStartKey, -7)
  const nextWeekStart = addDaysToDateKey(weekStartKey, 7)

  const navigateWeek = React.useCallback(
    (targetWeekStart: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', 'week')
      params.set('week', targetWeekStart)
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  const refreshWeek = React.useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  React.useEffect(() => {
    function onAppointmentsChanged() {
      refreshWeek()
    }

    window.addEventListener('scheduling:appointments-changed', onAppointmentsChanged)
    return () => {
      window.removeEventListener(
        'scheduling:appointments-changed',
        onAppointmentsChanged
      )
    }
  }, [refreshWeek])

  function openManage(appointment: CoachingAppointment) {
    setSelectedAppointment(appointment)
    setManageOpen(true)
  }

  function selectView(mode: WeekViewMode) {
    setViewMode(mode)
  }

  return (
    <div className="space-y-4">
      <SchedulingWeekStats appointments={appointments} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-1 sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Previous week"
            disabled={isPending}
            onClick={() => navigateWeek(prevWeekStart)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="relative min-w-[7.5rem] text-center text-sm font-medium sm:min-w-[8.5rem]">
            {weekLabel}
            {isPending ? (
              <Loader2 className="text-muted-foreground absolute -right-5 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
            ) : null}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Next week"
            disabled={isPending}
            onClick={() => navigateWeek(nextWeekStart)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="bg-muted mx-auto inline-flex rounded-lg p-1 sm:mx-0">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            className={cn('h-8 gap-1.5')}
            onClick={() => selectView('calendar')}
          >
            <LayoutGrid className="size-4" />
            Calendar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            className={cn('h-8 gap-1.5')}
            onClick={() => selectView('list')}
          >
            <List className="size-4" />
            List
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'transition-opacity duration-150',
          isPending && 'pointer-events-none opacity-60'
        )}
      >
        {viewMode === 'calendar' ? (
          appointments.length === 0 && googleBlockedTimes.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No sessions this week"
              description="Set your weekly availability so clients can book open slots."
              action={{
                label: 'Configure availability',
                href: '/scheduling?view=availability',
              }}
            />
          ) : (
            <SchedulingWeekCalendar
              appointments={appointments}
              googleBlockedTimes={googleBlockedTimes}
              coachPreferences={coachPreferences}
              weekKeys={weekKeys}
              onSelectAppointment={openManage}
            />
          )
        ) : (
          <AppointmentsList
            appointments={appointments}
            coachPreferences={coachPreferences}
            sessionPacks={sessionPacks}
            onManage={openManage}
            emptyTitle="No sessions this week"
            emptyDescription="Book a session or open availability for client self-booking."
            emptyAction={{
              label: 'Configure availability',
              href: '/scheduling?view=availability',
            }}
          />
        )}
      </div>

      <AppointmentManageDialog
        appointment={selectedAppointment}
        open={manageOpen}
        onOpenChange={setManageOpen}
        onAppointmentsMutated={refreshWeek}
        coachPreferences={coachPreferences}
        sessionPacks={sessionPacks}
        clients={clients}
        dateOptions={dateOptions}
      />
    </div>
  )
}
