'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import { AvailabilityExceptionsPanel } from '@/components/scheduling/availability-exceptions-panel'
import { AvailabilityGridEditor } from '@/components/scheduling/availability-grid-editor'
import { BookingLinkCard } from '@/components/scheduling/booking-link-card'
import { CoachTasksPanel } from '@/components/scheduling/coach-tasks-panel'
import { GoogleCalendarConnectCard } from '@/components/scheduling/google-calendar-connect-card'
import { SchedulingWeekPanel } from '@/components/scheduling/scheduling-week-panel'
import { SessionBookingSettingsForm } from '@/components/scheduling/session-booking-settings-form'
import { SessionPacksPanel } from '@/components/scheduling/session-packs-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CoachTask } from '@/lib/coach-tasks'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { CoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import type { GoogleCalendarBlockedTime } from '@/lib/google-calendar/blocked-times'
import type {
  ClientSessionPack,
  CoachAvailabilityException,
  CoachAvailabilityRule,
  CoachingAppointment,
  SessionBookingSettings,
} from '@/lib/session-booking-types'
import type { SessionBookingSettingsValues } from '@/lib/validations/session-booking'
import {
  parseSchedulingViewMode,
  schedulingViewModes,
  type SchedulingViewMode,
} from '@/lib/validations/session-booking'

type SchedulingPageTabsProps = {
  initialView: SchedulingViewMode
  appointments: CoachingAppointment[]
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
  weekKeys: string[]
  clients: Array<{ id: string; full_name: string | null }>
  bookingDateKeys: string[]
  settings: SessionBookingSettings
  settingsFormValues: SessionBookingSettingsValues
  rules: CoachAvailabilityRule[]
  availabilityExceptions: CoachAvailabilityException[]
  coachTasks: CoachTask[]
  todayKey: string
  coachDisplayName: string | null
  appBaseUrl: string
  googleCalendarConfigured: boolean
  googleCalendarConnection: CoachGoogleCalendarConnection | null
  connectError: string | null
  connectSuccess: boolean
  googleBlockedTimes: GoogleCalendarBlockedTime[]
}

function readViewFromLocation(): SchedulingViewMode {
  if (typeof window === 'undefined') {
    return 'week'
  }

  const params = new URLSearchParams(window.location.search)
  return parseSchedulingViewMode(params.get('view') ?? undefined)
}

export function SchedulingPageTabs({
  initialView,
  appointments,
  coachPreferences,
  sessionPacks,
  weekKeys,
  clients,
  bookingDateKeys,
  settings,
  settingsFormValues,
  rules,
  availabilityExceptions,
  coachTasks,
  todayKey,
  coachDisplayName,
  appBaseUrl,
  googleCalendarConfigured,
  googleCalendarConnection,
  connectError,
  connectSuccess,
  googleBlockedTimes,
}: SchedulingPageTabsProps) {
  const pathname = usePathname()
  const [view, setView] = React.useState(initialView)

  React.useEffect(() => {
    setView(initialView)
  }, [initialView])

  const syncViewUrl = React.useCallback(
    (nextView: SchedulingViewMode) => {
      const params = new URLSearchParams(window.location.search)
      params.set('view', nextView)
      if (nextView !== 'week') {
        params.delete('week')
      }
      const query = params.toString()
      window.history.replaceState(
        null,
        '',
        query ? `${pathname}?${query}` : pathname
      )
    },
    [pathname]
  )

  const handleViewChange = React.useCallback(
    (nextView: string) => {
      if (
        !schedulingViewModes.includes(nextView as SchedulingViewMode) ||
        nextView === view
      ) {
        return
      }

      const parsed = nextView as SchedulingViewMode
      setView(parsed)
      syncViewUrl(parsed)
    },
    [syncViewUrl, view]
  )

  React.useEffect(() => {
    function onPopState() {
      setView(readViewFromLocation())
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <Tabs value={view} onValueChange={handleViewChange} className="space-y-6">
      <TabsList>
        <TabsTrigger value="week">This week</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="availability">Availability</TabsTrigger>
        <TabsTrigger value="packs">Session packs</TabsTrigger>
      </TabsList>

      <TabsContent value="week" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sessions this week</CardTitle>
          </CardHeader>
          <CardContent>
            <SchedulingWeekPanel
              appointments={appointments}
              googleBlockedTimes={googleBlockedTimes}
              coachPreferences={coachPreferences}
              sessionPacks={sessionPacks}
              weekKeys={weekKeys}
              clients={clients}
              dateOptions={bookingDateKeys}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tasks">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachTasksPanel
              tasks={coachTasks}
              clients={clients}
              todayKey={todayKey}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="availability" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <BookingLinkCard
              bookingEnabled={settings.session_booking_enabled}
              coachName={coachDisplayName}
              appBaseUrl={appBaseUrl}
            />
            <SessionBookingSettingsForm defaultValues={settingsFormValues} />
            <GoogleCalendarConnectCard
              configured={googleCalendarConfigured}
              connection={googleCalendarConnection}
              connectError={connectError}
              connectSuccess={connectSuccess}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly availability</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityGridEditor initialRules={rules} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityExceptionsPanel
              initialExceptions={availabilityExceptions}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="packs">
        <Card>
          <CardHeader>
            <CardTitle>Session packs</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionPacksPanel
              clients={clients}
              packs={sessionPacks}
              coachTimezone={coachPreferences.timezone}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
