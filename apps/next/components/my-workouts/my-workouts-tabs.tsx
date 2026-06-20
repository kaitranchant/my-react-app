'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ClientCalendarPanel } from '@/components/calendar/client-calendar-panel'
import { ClientProgramsPanel } from '@/components/programs/client-programs-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { coerceDateKey } from '@/lib/calendar'
import type {
  CalendarDaySummary,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

const VALID_TABS = ['calendar', 'programs'] as const
type TabValue = (typeof VALID_TABS)[number]

const VALID_CALENDAR_ACTIONS = ['log', 'schedule'] as const
type CalendarAction = (typeof VALID_CALENDAR_ACTIONS)[number]

type MyWorkoutsTabsProps = {
  clientId: string
  coachName: string
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
  programs: {
    activeAssignment: ClientProgramAssignment | null
    availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
  }
  initialTab?: string
}

export function MyWorkoutsTabs({
  clientId,
  coachName,
  calendar,
  programs,
  initialTab,
}: MyWorkoutsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab') ?? initialTab ?? 'calendar'
  const tab: TabValue = VALID_TABS.includes(rawTab as TabValue)
    ? (rawTab as TabValue)
    : 'calendar'

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
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }

  function handleTabChange(value: string) {
    const next = value as TabValue
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'calendar') {
      params.delete('tab')
    } else {
      params.set('tab', next)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="relative z-10 h-10">
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="mt-4">
        <ClientCalendarPanel
          clientId={clientId}
          clientName={coachName}
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
          personalMode
        />
      </TabsContent>

      <TabsContent value="programs" className="mt-4">
        <ClientProgramsPanel
          clientId={clientId}
          activeAssignment={programs.activeAssignment}
          availablePrograms={programs.availablePrograms}
          personalMode
        />
      </TabsContent>
    </Tabs>
  )
}
