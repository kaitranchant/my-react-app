'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ClientCalendarPanel } from '@/components/calendar/client-calendar-panel'
import { ClientProgramsPanel } from '@/components/programs/client-programs-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { coerceDateKey } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type {
  CalendarDaySummary,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

const TRAINING_SECTIONS = ['calendar', 'programs'] as const
type TrainingSection = (typeof TRAINING_SECTIONS)[number]

const VALID_CALENDAR_ACTIONS = ['log', 'schedule'] as const
type CalendarAction = (typeof VALID_CALENDAR_ACTIONS)[number]

function resolveTrainingSection(
  tab: string | null,
  section: string | null
): TrainingSection {
  if (section && TRAINING_SECTIONS.includes(section as TrainingSection)) {
    return section as TrainingSection
  }
  if (tab === 'programs') {
    return 'programs'
  }
  return 'calendar'
}

type ClientDetailTrainingSectionProps = {
  clientId: string
  clientName: string
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
  coachPreferences?: CoachPreferences
}

export function ClientDetailTrainingSection({
  clientId,
  clientName,
  activeAssignment,
  availablePrograms,
  calendar,
  coachPreferences,
}: ClientDetailTrainingSectionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlTab = searchParams.get('tab')
  const urlSection = searchParams.get('section')
  const trainingSection = resolveTrainingSection(urlTab, urlSection)

  const rawAction = searchParams.get('action')
  const calendarAction = VALID_CALENDAR_ACTIONS.includes(
    rawAction as CalendarAction
  )
    ? (rawAction as CalendarAction)
    : null
  const calendarActionDate = coerceDateKey(searchParams.get('date'))

  function buildUrl(section: TrainingSection) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'training')
    if (section === 'calendar') {
      params.delete('section')
    } else {
      params.set('section', section)
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function handleTrainingSectionChange(value: string) {
    router.replace(buildUrl(value as TrainingSection), { scroll: false })
  }

  function consumeCalendarAction() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('action')
    params.delete('date')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Tabs
      value={trainingSection}
      onValueChange={handleTrainingSectionChange}
      variant="filter"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="calendar" size="sm">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="programs" size="sm">
            Programs
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="calendar" className="mt-4">
        <ClientCalendarPanel
          clientId={clientId}
          clientName={clientName}
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
          weightUnit={coachPreferences?.weightUnit}
        />
      </TabsContent>

      <TabsContent value="programs" className="mt-4">
        <ClientProgramsPanel
          clientId={clientId}
          activeAssignment={activeAssignment}
          availablePrograms={availablePrograms}
        />
      </TabsContent>
    </Tabs>
  )
}
