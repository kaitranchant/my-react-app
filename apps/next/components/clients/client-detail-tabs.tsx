'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientNotesEditor } from '@/components/clients/client-notes-editor'
import { ClientOverview } from '@/components/clients/client-overview'
import { ClientCalendarPanel } from '@/components/calendar/client-calendar-panel'
import { ClientProgramsPanel } from '@/components/programs/client-programs-panel'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ClientWorkoutActivity } from '@/lib/client-metrics'
import { coerceDateKey } from '@/lib/calendar'
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

const VALID_TABS = [
  'overview',
  'calendar',
  'programs',
  'progress-photos',
  'messages',
  'notes',
] as const

type TabValue = (typeof VALID_TABS)[number]

function ComingSoon({ feature }: { feature: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{feature}</CardTitle>
        <CardDescription>
          This is where {feature.toLowerCase()} will live. Coming soon.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

const VALID_CALENDAR_ACTIONS = ['log', 'schedule'] as const
type CalendarAction = (typeof VALID_CALENDAR_ACTIONS)[number]

type ClientDetailTabsProps = {
  client: Client
  activeAssignment: ClientProgramAssignment | null
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
  calendar: {
    schemaError: string | null
    year: number
    month: number
    selectedDate: string
    days: CalendarDaySummary[]
    selectedWorkout: ClientScheduledWorkoutWithExercises | null
    exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
    libraryWorkouts: Pick<Workout, 'id' | 'name' | 'status'>[]
  }
  weekSessions: CalendarDaySummary[]
  recentWorkouts: ClientWorkoutActivity[]
  streakWorkouts: ClientWorkoutActivity[]
  initialTab?: string
}

export function ClientDetailTabs({
  client,
  activeAssignment,
  availablePrograms,
  calendar,
  weekSessions,
  recentWorkouts,
  streakWorkouts,
  initialTab,
}: ClientDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const defaultTab: TabValue = VALID_TABS.includes(initialTab as TabValue)
    ? (initialTab as TabValue)
    : 'overview'
  const [tab, setTab] = React.useState<TabValue>(defaultTab)

  const rawAction = searchParams.get('action')
  const calendarAction = VALID_CALENDAR_ACTIONS.includes(
    rawAction as CalendarAction
  )
    ? (rawAction as CalendarAction)
    : null
  const calendarActionDate = coerceDateKey(searchParams.get('date'))

  function consumeCalendarAction() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('action')
    params.delete('date')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  React.useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab && VALID_TABS.includes(urlTab as TabValue)) {
      setTab(urlTab as TabValue)
    }
  }, [searchParams])

  function handleTabChange(value: string) {
    const next = value as TabValue
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', next)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="h-10">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
        <TabsTrigger value="progress-photos">Progress photos</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <ClientOverview
          client={client}
          activeAssignment={activeAssignment}
          weekSessions={weekSessions}
          recentWorkouts={recentWorkouts}
          streakWorkouts={streakWorkouts}
          onOpenNotes={() => handleTabChange('notes')}
          onOpenCalendar={() => handleTabChange('calendar')}
        />
      </TabsContent>

      <TabsContent value="calendar" className="mt-4">
        <ClientCalendarPanel
          clientId={client.id}
          clientName={client.full_name}
          exercises={calendar.exercises}
          libraryWorkouts={calendar.libraryWorkouts}
          schemaError={calendar.schemaError}
          initialYear={calendar.year}
          initialMonth={calendar.month}
          initialSelectedDate={calendar.selectedDate}
          initialDays={calendar.days}
          initialWorkout={calendar.selectedWorkout}
          initialAction={calendarAction}
          initialActionDate={calendarActionDate}
          onActionConsumed={consumeCalendarAction}
        />
      </TabsContent>

      <TabsContent value="programs" className="mt-4">
        <ClientProgramsPanel
          clientId={client.id}
          activeAssignment={activeAssignment}
          availablePrograms={availablePrograms}
        />
      </TabsContent>

      <TabsContent value="progress-photos" className="mt-4">
        <ComingSoon feature="Progress photos" />
      </TabsContent>

      <TabsContent value="messages" className="mt-4">
        <ComingSoon feature="Messages" />
      </TabsContent>

      <TabsContent value="notes" className="mt-4">
        <ClientNotesEditor clientId={client.id} initialNotes={client.notes} />
      </TabsContent>
    </Tabs>
  )
}
