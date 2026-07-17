import { createClient } from '@/lib/supabase/server'
import { ensureCoachCatalogSeeded } from '@/lib/coach-exercise-library.server'
import { getMonthDateRange, toDateKey } from '@/lib/calendar'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { backfillTeamCalendarFromProgram } from '@/lib/team-calendar-sync'
import { ClientCalendarPanel } from '@/components/calendar/client-calendar-panel'
import { TeamScheduleSection } from '@/components/teams/team-schedule-section'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  TeamEventWithMemberStatus,
  TeamMemberWithClient,
  Workout,
} from 'app/types/database'
import type { ReactNode } from 'react'

type TeamSchedulePanelProps = {
  teamId: string
  teamName: string
  coachUserId: string | null
  activeProgramId: string | null
  programStartDate: string | null
  events: TeamEventWithMemberStatus[]
  members: TeamMemberWithClient[]
  programPanel: ReactNode
}

export async function TeamSchedulePanel({
  teamId,
  teamName,
  coachUserId,
  activeProgramId,
  programStartDate,
  events,
  members,
  programPanel,
}: TeamSchedulePanelProps) {
  const supabase = await createClient()
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const selectedDate = toDateKey(today)
  const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month)
  const coachPreferences = coachUserId
    ? await getCoachPreferencesForUser(coachUserId)
    : defaultCoachPreferences

  if (coachUserId) {
    await ensureCoachCatalogSeeded(supabase, coachUserId)
  }

  if (coachUserId && activeProgramId && programStartDate) {
    await backfillTeamCalendarFromProgram(
      supabase,
      coachUserId,
      teamId,
      activeProgramId,
      programStartDate
    )
  }

  const [monthResult, selectedResult, exercisesResult, workoutsResult] =
    await Promise.all([
      supabase
        .from('team_scheduled_workouts')
        .select('id, scheduled_date, name, created_at')
        .eq('team_id', teamId)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd)
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('team_scheduled_workouts')
        .select(
          `
          *,
          exercises:team_scheduled_workout_exercises(
            *,
            exercise:exercises(id, name, muscle_group, equipment, external_id, image_url, demo_video_path, demo_video_url, instructions)
          )
        `
        )
        .eq('team_id', teamId)
        .eq('scheduled_date', selectedDate)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
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
    ])

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selectedResult.data) {
    const exercises = (selectedResult.data.exercises ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
    selectedWorkout = {
      id: selectedResult.data.id,
      coach_id: selectedResult.data.coach_id,
      client_id: selectedResult.data.team_id,
      scheduled_date: selectedResult.data.scheduled_date,
      name: selectedResult.data.name,
      notes: selectedResult.data.notes,
      library_workout_id: selectedResult.data.library_workout_id,
      team_scheduled_workout_id: selectedResult.data.id,
      status: 'scheduled',
      started_at: null,
      completed_at: null,
      created_at: selectedResult.data.created_at,
      updated_at: selectedResult.data.updated_at,
      exercises: exercises.map((row) => ({
        id: row.id,
        scheduled_workout_id: selectedResult.data!.id,
        exercise_id: row.exercise_id,
        sort_order: row.sort_order,
        sets: row.sets,
        reps: row.reps,
        prescription: row.prescription,
        superset_group: row.superset_group,
        exercise_block: row.exercise_block,
        workout_notes: row.workout_notes,
        coach_session_notes: null,
        client_notes: null,
        rep_mode: row.rep_mode,
        each_side: row.each_side,
        tempo: row.tempo,
        rest_seconds: row.rest_seconds,
        weight_percent: row.weight_percent,
        target_weight: null,
        rpe_target: row.rpe_target,
        perceived_rpe: null,
        tracking_options: row.tracking_options,
        created_at: row.created_at,
        updated_at: row.updated_at,
        exercise: row.exercise,
      })),
    } as ClientScheduledWorkoutWithExercises
  }

  const days: CalendarDaySummary[] = (monthResult.data ?? []).map((day) => ({
    id: day.id,
    scheduled_date: day.scheduled_date,
    name: day.name,
    status: 'scheduled' as const,
    started_at: null,
  }))

  const exercises = (exercisesResult.data ?? []) as Pick<
    Exercise,
    'id' | 'name' | 'muscle_group' | 'external_id'
  >[]
  const libraryWorkouts = (workoutsResult.data ?? []) as Pick<
    Workout,
    'id' | 'name' | 'status'
  >[]

  return (
    <TeamScheduleSection
      teamId={teamId}
      events={events}
      members={members}
      calendarPanel={
        <ClientCalendarPanel
          clientId={teamId}
          clientName={teamName}
          calendarVariant="team"
          exercises={exercises}
          libraryWorkouts={libraryWorkouts}
          schemaError={monthResult.error?.message ?? null}
          initialYear={year}
          initialMonth={month}
          initialSelectedDate={selectedDate}
          initialDays={days}
          initialWorkout={selectedWorkout}
          weightUnit={coachPreferences.weightUnit}
        />
      }
      programPanel={programPanel}
    />
  )
}
