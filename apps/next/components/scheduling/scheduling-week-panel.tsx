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
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

import { fetchSchedulingWeekData } from '@/app/(dashboard)/scheduling/actions'
import { AppointmentsList } from '@/components/scheduling/appointments-list'
import { AppointmentManageDialog } from '@/components/scheduling/appointment-manage-dialog'
import { GoogleEventStatusDialog } from '@/components/scheduling/google-event-status-dialog'
import { SchedulingWeekCalendar } from '@/components/scheduling/scheduling-week-calendar'
import { SchedulingWeekStats } from '@/components/scheduling/scheduling-week-stats'
import { WeeklySessionTargetsDialog } from '@/components/scheduling/weekly-session-targets-dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  addDaysToDateKey,
  formatSchedulingWeekRange,
} from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { GoogleCalendarBlockedTime } from '@/lib/google-calendar/blocked-times'
import type { GoogleEventMarkerStatus } from '@/lib/google-calendar/blocked-times-filter'
import type { ClientSessionPack, CoachingAppointment } from '@/lib/session-booking-types'
import {
  buildClientSessionProgressMap,
  clientDefaultsFromClients,
  weekOverridesFromRows,
  type ClientWeeklySessionDefault,
} from '@/lib/weekly-session-targets'
import { cn } from '@/lib/utils'

type SchedulingWeekPanelProps = {
  appointments: CoachingAppointment[]
  googleBlockedTimes?: GoogleCalendarBlockedTime[]
  googleAuthExpired?: boolean
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
  weekKeys: string[]
  clients: Array<{ id: string; full_name: string | null }>
  dateOptions: string[]
  weeklyTargetsEnabled: boolean
  clientDefaults: ClientWeeklySessionDefault[]
  weekOverrides: Array<{ client_id: string; target_sessions: number }>
}

type WeekViewMode = 'calendar' | 'list'

type WeekData = {
  appointments: CoachingAppointment[]
  weekKeys: string[]
  googleBlockedTimes: GoogleCalendarBlockedTime[]
  clientDefaults: ClientWeeklySessionDefault[]
  weekOverrides: Array<{ client_id: string; target_sessions: number }>
}

function buildWeekData(
  appointments: CoachingAppointment[],
  weekKeys: string[],
  googleBlockedTimes: GoogleCalendarBlockedTime[] = [],
  clientDefaults: ClientWeeklySessionDefault[] = [],
  weekOverrides: Array<{ client_id: string; target_sessions: number }> = []
): WeekData {
  return {
    appointments,
    weekKeys,
    googleBlockedTimes,
    clientDefaults,
    weekOverrides,
  }
}

export function SchedulingWeekPanel({
  appointments: initialAppointments,
  googleBlockedTimes: initialGoogleBlockedTimes = [],
  googleAuthExpired: initialGoogleAuthExpired = false,
  coachPreferences,
  sessionPacks,
  weekKeys: initialWeekKeys,
  clients,
  dateOptions,
  weeklyTargetsEnabled,
  clientDefaults: initialClientDefaults,
  weekOverrides: initialWeekOverrides,
}: SchedulingWeekPanelProps) {
  const pathname = usePathname()
  const weekCacheRef = React.useRef(new Map<string, WeekData>())
  const prefetchingRef = React.useRef(new Set<string>())

  const [weekData, setWeekData] = React.useState<WeekData>(() =>
    buildWeekData(
      initialAppointments,
      initialWeekKeys,
      initialGoogleBlockedTimes,
      initialClientDefaults,
      initialWeekOverrides
    )
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<WeekViewMode>('calendar')
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<CoachingAppointment | null>(null)
  const [manageOpen, setManageOpen] = React.useState(false)
  const [selectedBlockedTime, setSelectedBlockedTime] =
    React.useState<GoogleCalendarBlockedTime | null>(null)
  const [blockedTimeOpen, setBlockedTimeOpen] = React.useState(false)
  const [targetsOpen, setTargetsOpen] = React.useState(false)
  const [googleAuthExpired, setGoogleAuthExpired] = React.useState(
    initialGoogleAuthExpired
  )

  React.useEffect(() => {
    setGoogleAuthExpired(initialGoogleAuthExpired)
  }, [initialGoogleAuthExpired])

  const weekStartKey = weekData.weekKeys[0]!
  const weekEndKey = weekData.weekKeys[weekData.weekKeys.length - 1]!
  const weekLabel = formatSchedulingWeekRange(weekStartKey, weekEndKey)
  const prevWeekStart = addDaysToDateKey(weekStartKey, -7)
  const nextWeekStart = addDaysToDateKey(weekStartKey, 7)

  const weekOverridesMap = React.useMemo(
    () => weekOverridesFromRows(weekData.weekOverrides),
    [weekData.weekOverrides]
  )

  const clientSessionProgress = React.useMemo(
    () =>
      buildClientSessionProgressMap(
        weekData.appointments,
        clientDefaultsFromClients(weekData.clientDefaults),
        weekOverridesMap,
        weeklyTargetsEnabled
      ),
    [
      weekData.appointments,
      weekData.clientDefaults,
      weekOverridesMap,
      weeklyTargetsEnabled,
    ]
  )

  React.useEffect(() => {
    const next = buildWeekData(
      initialAppointments,
      initialWeekKeys,
      initialGoogleBlockedTimes,
      initialClientDefaults,
      initialWeekOverrides
    )
    setWeekData(next)
    weekCacheRef.current.set(initialWeekKeys[0]!, next)
  }, [
    initialAppointments,
    initialClientDefaults,
    initialGoogleBlockedTimes,
    initialWeekKeys,
    initialWeekOverrides,
  ])

  const syncWeekUrl = React.useCallback(
    (targetWeekStart: string, pushHistory: boolean) => {
      const params = new URLSearchParams(window.location.search)
      params.set('view', 'week')
      params.set('week', targetWeekStart)
      const nextUrl = `${pathname}?${params.toString()}`

      if (pushHistory) {
        window.history.pushState({ week: targetWeekStart }, '', nextUrl)
      } else {
        window.history.replaceState({ week: targetWeekStart }, '', nextUrl)
      }
    },
    [pathname]
  )

  const prefetchWeek = React.useCallback(async (targetWeekStart: string) => {
    if (
      weekCacheRef.current.has(targetWeekStart) ||
      prefetchingRef.current.has(targetWeekStart)
    ) {
      return
    }

    prefetchingRef.current.add(targetWeekStart)

    try {
      const result = await fetchSchedulingWeekData(targetWeekStart)
      if (result.success) {
        setGoogleAuthExpired(result.googleAuthExpired)
        weekCacheRef.current.set(
          targetWeekStart,
          buildWeekData(
            result.appointments,
            result.weekKeys,
            result.googleBlockedTimes,
            result.clientDefaults,
            result.weekOverrides
          )
        )
      }
    } catch {
      // Prefetch failures are non-blocking.
    } finally {
      prefetchingRef.current.delete(targetWeekStart)
    }
  }, [])

  const loadWeek = React.useCallback(
    async (targetWeekStart: string, options?: { pushHistory?: boolean }) => {
      const cached = weekCacheRef.current.get(targetWeekStart)
      if (cached) {
        setWeekData(cached)
        syncWeekUrl(targetWeekStart, options?.pushHistory ?? false)
        void prefetchWeek(addDaysToDateKey(targetWeekStart, -7))
        void prefetchWeek(addDaysToDateKey(targetWeekStart, 7))
        return
      }

      setIsLoading(true)
      try {
        const result = await fetchSchedulingWeekData(targetWeekStart)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        setGoogleAuthExpired(result.googleAuthExpired)
        const next = buildWeekData(
          result.appointments,
          result.weekKeys,
          result.googleBlockedTimes,
          result.clientDefaults,
          result.weekOverrides
        )
        weekCacheRef.current.set(targetWeekStart, next)
        setWeekData(next)
        syncWeekUrl(targetWeekStart, options?.pushHistory ?? false)
        void prefetchWeek(addDaysToDateKey(targetWeekStart, -7))
        void prefetchWeek(addDaysToDateKey(targetWeekStart, 7))
      } catch {
        toast.error('Could not load that week.')
      } finally {
        setIsLoading(false)
      }
    },
    [prefetchWeek, syncWeekUrl]
  )

  const navigateWeek = React.useCallback(
    (targetWeekStart: string) => {
      void loadWeek(targetWeekStart, { pushHistory: true })
    },
    [loadWeek]
  )

  const refreshWeek = React.useCallback(() => {
    weekCacheRef.current.delete(weekStartKey)
    void loadWeek(weekStartKey)
  }, [loadWeek, weekStartKey])

  React.useEffect(() => {
    void prefetchWeek(prevWeekStart)
    void prefetchWeek(nextWeekStart)
  }, [nextWeekStart, prefetchWeek, prevWeekStart])

  React.useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search)
      const targetWeekStart = params.get('week')
      if (!targetWeekStart || targetWeekStart === weekStartKey) {
        return
      }

      void loadWeek(targetWeekStart)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loadWeek, weekStartKey])

  React.useEffect(() => {
    function onAppointmentsChanged() {
      weekCacheRef.current.clear()
      refreshWeek()
    }

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      weekCacheRef.current.delete(weekStartKey)
      void loadWeek(weekStartKey)
    }

    window.addEventListener('scheduling:appointments-changed', onAppointmentsChanged)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener(
        'scheduling:appointments-changed',
        onAppointmentsChanged
      )
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadWeek, refreshWeek, weekStartKey])

  React.useEffect(() => {
    weekCacheRef.current.delete(weekStartKey)
    void loadWeek(weekStartKey)
  }, [loadWeek, weekStartKey])

  function openManage(appointment: CoachingAppointment) {
    setSelectedAppointment(appointment)
    setManageOpen(true)
  }

  function openBlockedTime(blockedTime: GoogleCalendarBlockedTime) {
    setSelectedBlockedTime(blockedTime)
    setBlockedTimeOpen(true)
  }

  function updateBlockedTimeStatus(
    googleEventId: string,
    status: GoogleEventMarkerStatus | null
  ) {
    setWeekData((current) => {
      const next: WeekData = {
        ...current,
        googleBlockedTimes: current.googleBlockedTimes.map((blockedTime) =>
          blockedTime.id === googleEventId
            ? { ...blockedTime, status: status ?? null }
            : blockedTime
        ),
      }
      const cacheKey = current.weekKeys[0]
      if (cacheKey) {
        weekCacheRef.current.set(cacheKey, next)
      }
      return next
    })
    setSelectedBlockedTime((current) =>
      current?.id === googleEventId
        ? { ...current, status: status ?? null }
        : current
    )
  }

  function selectView(mode: WeekViewMode) {
    setViewMode(mode)
  }

  return (
    <div className="space-y-4">
      <SchedulingWeekStats appointments={weekData.appointments} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-1 sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Previous week"
            disabled={isLoading}
            onClick={() => navigateWeek(prevWeekStart)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="relative min-w-[7.5rem] text-center text-sm font-medium sm:min-w-[8.5rem]">
            {weekLabel}
            {isLoading ? (
              <Loader2 className="text-muted-foreground absolute -right-5 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
            ) : null}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Next week"
            disabled={isLoading}
            onClick={() => navigateWeek(nextWeekStart)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 sm:justify-end">
          {weeklyTargetsEnabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => setTargetsOpen(true)}
            >
              <Target className="size-4" />
              Targets
            </Button>
          ) : null}

          <div className="bg-muted inline-flex rounded-lg p-1">
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
      </div>

      {googleAuthExpired ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Google Calendar events are hidden
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            SwiftCoach loads Google Calendar events live. Your connection expired,
            so personal calendar blocks are not showing. Reconnect in Availability
            settings — your events are still in Google Calendar.
          </p>
          <Button type="button" className="mt-3" size="sm" asChild>
            <a href="/scheduling?view=availability">Reconnect Google Calendar</a>
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          'transition-opacity duration-150',
          isLoading && 'pointer-events-none opacity-60'
        )}
      >
        {viewMode === 'calendar' ? (
          weekData.appointments.length === 0 &&
          weekData.googleBlockedTimes.length === 0 ? (
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
              appointments={weekData.appointments}
              googleBlockedTimes={weekData.googleBlockedTimes}
              coachPreferences={coachPreferences}
              weekKeys={weekData.weekKeys}
              clientSessionProgress={clientSessionProgress}
              onSelectAppointment={openManage}
              onSelectBlockedTime={openBlockedTime}
            />
          )
        ) : (
          <AppointmentsList
            appointments={weekData.appointments}
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

      <GoogleEventStatusDialog
        blockedTime={selectedBlockedTime}
        open={blockedTimeOpen}
        onOpenChange={setBlockedTimeOpen}
        coachPreferences={coachPreferences}
        onStatusChanged={updateBlockedTimeStatus}
      />

      {weeklyTargetsEnabled ? (
        <WeeklySessionTargetsDialog
          open={targetsOpen}
          onOpenChange={setTargetsOpen}
          weekStartKey={weekStartKey}
          clients={weekData.clientDefaults}
          weekOverrides={weekOverridesMap}
          appointments={weekData.appointments}
          onSaved={refreshWeek}
        />
      ) : null}
    </div>
  )
}
