'use client'

import * as React from 'react'

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
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

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
}

export function ClientDetailTabs({
  client,
  activeAssignment,
  availablePrograms,
  calendar,
  weekSessions,
}: ClientDetailTabsProps) {
  const [tab, setTab] = React.useState('overview')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-10">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
        <TabsTrigger value="progress-photos">Progress photos</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <ClientOverview
          client={client}
          activeAssignment={activeAssignment}
          weekSessions={weekSessions}
          onOpenNotes={() => setTab('notes')}
          onOpenCalendar={() => setTab('calendar')}
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

      <TabsContent value="notes" className="mt-4">
        <ClientNotesEditor
          clientId={client.id}
          initialNotes={client.notes}
        />
      </TabsContent>
    </Tabs>
  )
}
