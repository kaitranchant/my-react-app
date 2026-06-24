'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'

import { AppointmentsList } from '@/components/scheduling/appointments-list'
import { AppointmentManageDialog } from '@/components/scheduling/appointment-manage-dialog'
import { SchedulingWeekCalendar } from '@/components/scheduling/scheduling-week-calendar'
import { SchedulingWeekStats } from '@/components/scheduling/scheduling-week-stats'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { addDaysToDateKey, formatSchedulingWeekRange } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import type { ClientSessionPack, CoachingAppointment } from '@/lib/session-booking-types'
import { cn } from '@/lib/utils'

type SchedulingWeekPanelProps = {
  appointments: CoachingAppointment[]
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
  weekKeys: string[]
}

type WeekViewMode = 'calendar' | 'list'

function buildWeekHref(weekStartKey: string) {
  return `/scheduling?view=week&week=${weekStartKey}`
}

export function SchedulingWeekPanel({
  appointments,
  coachPreferences,
  sessionPacks,
  weekKeys,
}: SchedulingWeekPanelProps) {
  const isMobile = useIsMobile()
  const [viewMode, setViewMode] = React.useState<WeekViewMode>('calendar')
  const [hasChosenView, setHasChosenView] = React.useState(false)
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<CoachingAppointment | null>(null)
  const [manageOpen, setManageOpen] = React.useState(false)

  const weekStartKey = weekKeys[0]!
  const weekEndKey = weekKeys[weekKeys.length - 1]!
  const weekLabel = formatSchedulingWeekRange(weekStartKey, weekEndKey)
  const prevWeekStart = addDaysToDateKey(weekStartKey, -7)
  const nextWeekStart = addDaysToDateKey(weekStartKey, 7)

  React.useEffect(() => {
    if (!hasChosenView && isMobile) {
      setViewMode('list')
    }
  }, [hasChosenView, isMobile])

  function openManage(appointment: CoachingAppointment) {
    setSelectedAppointment(appointment)
    setManageOpen(true)
  }

  function selectView(mode: WeekViewMode) {
    setHasChosenView(true)
    setViewMode(mode)
  }

  return (
    <div className="space-y-4">
      <SchedulingWeekStats appointments={appointments} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-1 sm:justify-start">
          <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
            <Link href={buildWeekHref(prevWeekStart)} aria-label="Previous week">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <p className="min-w-[7.5rem] text-center text-sm font-medium sm:min-w-[8.5rem]">
            {weekLabel}
          </p>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
            <Link href={buildWeekHref(nextWeekStart)} aria-label="Next week">
              <ChevronRight className="size-4" />
            </Link>
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

      {viewMode === 'calendar' ? (
        appointments.length === 0 ? (
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

      <AppointmentManageDialog
        appointment={selectedAppointment}
        open={manageOpen}
        onOpenChange={setManageOpen}
        coachPreferences={coachPreferences}
        sessionPacks={sessionPacks}
      />
    </div>
  )
}
