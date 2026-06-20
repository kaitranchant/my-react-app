import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { ProgramCalendarPanel } from '@/components/programs/program-calendar-panel'
import { AssignProgramDialog } from '@/components/programs/assign-program-dialog'
import { ProgramFormDialog } from '@/components/programs/program-form-dialog'
import { ProgramStatusBadge } from '@/components/programs/program-status-badge'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import { getWeekDayOffsets } from '@/lib/program-calendar'
import type { Client, Exercise, Program, ProgramDaySummary, ProgramPhase, Team, Workout } from 'app/types/database'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select('name')
    .eq('id', programId)
    .maybeSingle()

  return {
    title: data?.name
      ? `${data.name} — Programs — Library — Coaching App`
      : 'Program — Library — Coaching App',
  }
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  const supabase = await createClient()

  const { data: programData, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .maybeSingle()

  if (programError?.message.includes('Could not find the table')) {
    return (
      <LibraryLoadError
        resource="programs"
        error={programError}
        sqlFile="apply-programs.sql"
      />
    )
  }

  if (!programData) {
    notFound()
  }

  const program = programData as Program
  const initialWeekIndex = 0
  const initialSelectedDayOffset = getWeekDayOffsets(initialWeekIndex)[0]

  const { data: workoutRows, error: workoutError } = await supabase
    .from('program_scheduled_workouts')
    .select('id, day_offset, name, notes, library_workout_id')
    .eq('program_id', programId)
    .in('day_offset', getWeekDayOffsets(initialWeekIndex))
    .order('day_offset', { ascending: true })

  const initialWorkouts = (workoutRows ?? []) as ProgramDaySummary[]
  const initialSelectedWorkout =
    initialWorkouts.find(
      (workout) => workout.day_offset === initialSelectedDayOffset
    ) ?? null

  const { data: phaseRows, error: phaseError } = await supabase
    .from('program_phases')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })
    .order('start_day_offset', { ascending: true })

  const initialPhases = (phaseRows ?? []) as ProgramPhase[]

  const { data: libraryWorkoutRows } = await supabase
    .from('workouts')
    .select('id, name, status')
    .order('name', { ascending: true })

  const libraryWorkouts = (libraryWorkoutRows ?? []) as Pick<
    Workout,
    'id' | 'name' | 'status'
  >[]

  const { data: exerciseRows } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, external_id')
    .eq('status', 'active')
    .order('name', { ascending: true })

  const exercises = (exerciseRows ?? []) as Pick<
    Exercise,
    'id' | 'name' | 'muscle_group' | 'external_id'
  >[]

  const { data: clientRows } = await supabase
    .from('clients')
    .select('id, full_name, status')
    .neq('status', 'archived')
    .order('full_name', { ascending: true })

  const { data: teamRows } = await supabase
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true })

  const clients = (clientRows ?? []) as Pick<
    Client,
    'id' | 'full_name' | 'status'
  >[]
  const teams = (teamRows ?? []) as Pick<Team, 'id' | 'name'>[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
            <Link href="/library/programs">
              <ArrowLeft className="size-4" />
              Back to programs
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {program.name}
              </h2>
              <ProgramStatusBadge status={program.status} />
            </div>
            {program.description ? (
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed whitespace-pre-wrap">
                {program.description}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Build the program calendar below, then assign it to clients.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AssignProgramDialog
            programId={programId}
            programName={program.name}
            programStatus={program.status}
            clients={clients}
            teams={teams}
          />
          <ProgramFormDialog
            program={program}
            trigger={
              <Button variant="outline" size="sm">
                Edit details
              </Button>
            }
          />
        </div>
      </div>

      <ProgramCalendarPanel
        programId={programId}
        programName={program.name}
        exercises={exercises}
        libraryWorkouts={libraryWorkouts}
        schemaError={workoutError?.message ?? null}
        phasesSchemaError={phaseError?.message ?? null}
        initialPhases={initialPhases}
        initialWeekIndex={initialWeekIndex}
        initialSelectedDayOffset={initialSelectedDayOffset}
        initialWorkouts={initialWorkouts}
        initialSelectedWorkout={initialSelectedWorkout}
      />
    </div>
  )
}
