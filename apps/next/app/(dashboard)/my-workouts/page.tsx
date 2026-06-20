import { Suspense } from 'react'

import { getCalendarMonthData } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { MyWorkoutsTabs } from '@/components/my-workouts/my-workouts-tabs'
import { PageHeader } from '@/components/dashboard/page-header'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Card, CardContent } from '@/components/ui/card'
import { coerceDateKey, parseDateKey, toDateKey } from '@/lib/calendar'
import { getOrCreateCoachSelfClient } from '@/lib/coach-self'
import { createClient } from '@/lib/supabase/server'
import type {
  ClientProgramAssignment,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

export const metadata = {
  title: 'My Workouts — Coaching App',
}

export default async function MyWorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; action?: string; tab?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const selfClientResult = await getOrCreateCoachSelfClient(supabase)

  const selectedDate = coerceDateKey(params.date) ?? toDateKey(new Date())
  const selectedDateObj = parseDateKey(selectedDate)
  const initialYear = selectedDateObj.getFullYear()
  const initialMonth = selectedDateObj.getMonth()

  if (!selfClientResult.success) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="My Workouts"
          description="Schedule your own training, build sessions from your exercise library, and log sets alongside your client roster."
        />
        {selfClientResult.needsMigration ? (
          <SchemaSetupNotice
            tables={['clients (is_coach_self)']}
            sqlFile="apply-coach-self-client.sql"
          />
        ) : (
          <Card>
            <CardContent className="text-destructive py-8 text-center text-sm">
              {selfClientResult.error}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const { client, coachName } = selfClientResult.data

  const [
    calendarResult,
    exercisesResult,
    workoutsResult,
    assignmentResult,
    programsResult,
  ] = await Promise.all([
    getCalendarMonthData(client.id, initialYear, initialMonth, selectedDate),
    supabase
      .from('exercises')
      .select('id, name, muscle_group, external_id')
      .eq('status', 'active')
      .order('name', { ascending: true }),
    supabase
      .from('workouts')
      .select('id, name, status')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status)')
      .eq('client_id', client.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('programs')
      .select('id, name, status')
      .order('name', { ascending: true }),
  ])

  const calendarDays = calendarResult.success ? calendarResult.data.days : []
  const selectedWorkout = calendarResult.success
    ? calendarResult.data.selectedWorkout
    : null
  const calendarError =
    !calendarResult.success ? calendarResult.error : null

  const exercises = (exercisesResult.data ?? []) as Pick<
    Exercise,
    'id' | 'name' | 'muscle_group' | 'external_id'
  >[]
  const libraryWorkouts = (workoutsResult.data ?? []) as Pick<
    Workout,
    'id' | 'name' | 'status'
  >[]
  const activeAssignment = assignmentResult.data
    ? (assignmentResult.data as ClientProgramAssignment)
    : null
  const availablePrograms = (programsResult.data ?? []) as Pick<
    Program,
    'id' | 'name' | 'status'
  >[]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="My Workouts"
        description="Schedule your own training, assign programs to yourself, add library workouts to your calendar, and log sets alongside your client roster."
      />

      <Suspense fallback={null}>
        <MyWorkoutsTabs
          clientId={client.id}
          coachName={coachName}
          initialTab={params.tab}
          calendar={{
            schemaError: calendarError,
            year: initialYear,
            month: initialMonth,
            selectedDate,
            days: calendarDays,
            selectedWorkout,
            exercises,
            libraryWorkouts,
          }}
          programs={{
            activeAssignment,
            availablePrograms,
          }}
        />
      </Suspense>
    </div>
  )
}
