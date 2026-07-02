'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { fetchSchedulingWeekData } from '@/app/(dashboard)/scheduling/actions'
import { AppointmentsList } from '@/components/scheduling/appointments-list'
import { AppointmentManageDialog } from '@/components/scheduling/appointment-manage-dialog'
import { SchedulingWeekCalendar } from '@/components/scheduling/scheduling-week-calendar'
import { SchedulingWeekStats } from '@/components/scheduling/scheduling-week-stats'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  addDaysToDateKey,
  formatSchedulingWeekRange,
  getCurrentWeekDateKeys,
  parseDateKey,
} from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { ClientSessionPack, CoachingAppointment } from '@/lib/session-booking-types'
import { cn } from '@/lib/utils'

type SchedulingWeekPanelProps = {
  appointments: CoachingAppointment[]
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
  weekKeys: string[]
  clients: Array<{ id: string; full_name: string | null }>
  dateOptions: string[]
}

type WeekViewMode = 'calendar' | 'list'

type WeekData = {
  appointments: CoachingAppointment[]
  weekKeys: string[]
}

function weekKeysForStart(
  weekStartsOn: CoachPreferences['weekStartsOn'],
  weekStartKey: string
) {
  return getCurrentWeekDateKeys(weekStartsOn, parseDateKey(weekStartKey))
}

export function SchedulingWeekPanel({
  appointments: initialAppointments,
  coachPreferences,
  sessionPacks,
  weekKeys: initialWeekKeys,
  clients,
  dateOptions,
}: SchedulingWeekPanelProps) {
  const pathname = usePathname()
  const [viewMode, setViewMode] = React.useState<WeekViewMode>('calendar')
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<CoachingAppointment | null>(null)
  const [manageOpen, setManageOpen] = React.useState(false)
  const [appointments, setAppointments] = React.useState(initialAppointments)
  const [weekKeys, setWeekKeys] = React.useState(initialWeekKeys)
  const [isLoadingWeek, setIsLoadingWeek] = React.useState(false)
  const weekCacheRef = React.useRef<Map<string, WeekData>>(new Map())
  const requestIdRef = React.useRef(0)

  const weekStartKey = weekKeys[0]!
  const weekEndKey = weekKeys[weekKeys.length - 1]!
  const weekLabel = formatSchedulingWeekRange(weekStartKey, weekEndKey)
  const prevWeekStart = addDaysToDateKey(weekStartKey, -7)
  const nextWeekStart = addDaysToDateKey(weekStartKey, 7)

  React.useEffect(() => {
    weekCacheRef.current.set(weekStartKey, { appointments, weekKeys })
  }, [appointments, weekKeys, weekStartKey])

  React.useEffect(() => {
    setAppointments(initialAppointments)
    setWeekKeys(initialWeekKeys)
  }, [initialAppointments, initialWeekKeys])

  const syncWeekUrl = React.useCallback(
    (targetWeekStart: string) => {
      const params = new URLSearchParams(window.location.search)
      params.set('view', 'week')
      params.set('week', targetWeekStart)
      window.history.replaceState(
        null,
        '',
        `${pathname}?${params.toString()}`
      )
    },
    [pathname]
  )

  const loadWeek = React.useCallback(
    async (targetWeekStart: string, options?: { fromPopState?: boolean }) => {
      const cached = weekCacheRef.current.get(targetWeekStart)
      const optimisticWeekKeys = weekKeysForStart(
        coachPreferences.weekStartsOn,
        targetWeekStart
      )

      if (cached) {
        setWeekKeys(cached.weekKeys)
        setAppointments(cached.appointments)
        if (!options?.fromPopState) {
          syncWeekUrl(targetWeekStart)
        }
        return
      }

      const requestId = ++requestIdRef.current
      setWeekKeys(optimisticWeekKeys)
      if (!options?.fromPopState) {
        syncWeekUrl(targetWeekStart)
      }
      setIsLoadingWeek(true)

      const result = await fetchSchedulingWeekData(targetWeekStart)
      if (requestId !== requestIdRef.current) {
        return
      }

      setIsLoadingWeek(false)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      weekCacheRef.current.set(targetWeekStart, {
        appointments: result.appointments,
        weekKeys: result.weekKeys,
      })
      setWeekKeys(result.weekKeys)
      setAppointments(result.appointments)
    },
    [coachPreferences.weekStartsOn, syncWeekUrl]
  )

  React.useEffect(() => {
    for (const targetWeekStart of [prevWeekStart, nextWeekStart]) {
      if (weekCacheRef.current.has(targetWeekStart)) {
        continue
      }

      void fetchSchedulingWeekData(targetWeekStart).then((result) => {
        if (!result.success) {
          return
        }

        weekCacheRef.current.set(targetWeekStart, {
          appointments: result.appointments,
          weekKeys: result.weekKeys,
        })
      })
    }
  }, [nextWeekStart, prevWeekStart])

  React.useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search)
      const week = params.get('week')
      if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
        return
      }

      void loadWeek(week, { fromPopState: true })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loadWeek])

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
            disabled={isLoadingWeek}
            onClick={() => void loadWeek(prevWeekStart)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="relative min-w-[7.5rem] text-center text-sm font-medium sm:min-w-[8.5rem]">
            {weekLabel}
            {isLoadingWeek ? (
              <Loader2 className="text-muted-foreground absolute -right-5 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
            ) : null}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Next week"
            disabled={isLoadingWeek}
            onClick={() => void loadWeek(nextWeekStart)}
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
          isLoadingWeek && 'pointer-events-none opacity-60'
        )}
      >
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
      </div>

      <AppointmentManageDialog
        appointment={selectedAppointment}
        open={manageOpen}
        onOpenChange={(open) => {
          setManageOpen(open)
          if (!open) {
            void loadWeek(weekStartKey)
          }
        }}
        coachPreferences={coachPreferences}
        sessionPacks={sessionPacks}
        clients={clients}
        dateOptions={dateOptions}
      />
    </div>
  )
}
