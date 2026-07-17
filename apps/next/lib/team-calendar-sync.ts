import type { createClient } from '@/lib/supabase/server'
import { addDaysToDateKey } from '@/lib/calendar'
import type {
  ScheduledExerciseBlock,
  ScheduledExerciseRepMode,
  ScheduledExerciseTrackingOptions,
} from 'app/types/database'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export const TEAM_EXERCISE_SYNC_SELECT =
  'exercise_id, sort_order, sets, reps, prescription, superset_group, exercise_block, workout_notes, rep_mode, each_side, tempo, rest_seconds, weight_percent, rpe_target, tracking_options'

export type TeamExerciseSyncRow = {
  exercise_id: string
  sort_order: number
  sets: string | null
  reps: string | null
  prescription: string | null
  superset_group: string | null
  exercise_block: ScheduledExerciseBlock | null
  workout_notes: string | null
  rep_mode: ScheduledExerciseRepMode
  each_side: boolean
  tempo: string | null
  rest_seconds: string | null
  weight_percent: string | null
  rpe_target: string | null
  tracking_options: ScheduledExerciseTrackingOptions
}

function buildClientExerciseRow(
  teamExercise: TeamExerciseSyncRow,
  clientWorkoutId: string
) {
  return {
    scheduled_workout_id: clientWorkoutId,
    exercise_id: teamExercise.exercise_id,
    sort_order: teamExercise.sort_order,
    sets: teamExercise.sets,
    reps: teamExercise.reps,
    prescription: teamExercise.prescription,
    superset_group: teamExercise.superset_group,
    exercise_block: teamExercise.exercise_block,
    workout_notes: teamExercise.workout_notes,
    rep_mode: teamExercise.rep_mode,
    each_side: teamExercise.each_side,
    tempo: teamExercise.tempo,
    rest_seconds: teamExercise.rest_seconds,
    weight_percent: teamExercise.weight_percent,
    rpe_target: teamExercise.rpe_target,
    tracking_options: teamExercise.tracking_options,
  }
}

async function syncTeamWorkoutExercisesToClient(
  supabase: SupabaseClient,
  teamWorkoutId: string,
  clientWorkoutId: string
) {
  const { data: teamExercises, error: teamError } = await supabase
    .from('team_scheduled_workout_exercises')
    .select(TEAM_EXERCISE_SYNC_SELECT)
    .eq('team_scheduled_workout_id', teamWorkoutId)
    .order('sort_order', { ascending: true })

  if (teamError) {
    if (teamError.message.includes('Could not find the table')) {
      return
    }
    throw new Error(teamError.message)
  }

  const { data: clientExercises, error: clientError } = await supabase
    .from('scheduled_workout_exercises')
    .select(`id, ${TEAM_EXERCISE_SYNC_SELECT}`)
    .eq('scheduled_workout_id', clientWorkoutId)
    .order('sort_order', { ascending: true })

  if (clientError) {
    throw new Error(clientError.message)
  }

  const teamRows = (teamExercises ?? []) as TeamExerciseSyncRow[]
  const clientRows = clientExercises ?? []

  for (let index = 0; index < teamRows.length; index++) {
    const teamRow = teamRows[index]
    const clientRow = clientRows[index]

    if (clientRow) {
      if (clientRow.exercise_id === teamRow.exercise_id) {
        const { error } = await supabase
          .from('scheduled_workout_exercises')
          .update(buildClientExerciseRow(teamRow, clientWorkoutId))
          .eq('id', clientRow.id)

        if (error) {
          throw new Error(error.message)
        }
      } else {
        const { error: deleteError } = await supabase
          .from('scheduled_workout_exercises')
          .delete()
          .eq('id', clientRow.id)

        if (deleteError) {
          throw new Error(deleteError.message)
        }

        const { error: insertError } = await supabase
          .from('scheduled_workout_exercises')
          .insert(buildClientExerciseRow(teamRow, clientWorkoutId))

        if (insertError) {
          throw new Error(insertError.message)
        }
      }
    } else {
      const { error } = await supabase
        .from('scheduled_workout_exercises')
        .insert(buildClientExerciseRow(teamRow, clientWorkoutId))

      if (error) {
        throw new Error(error.message)
      }
    }
  }

  const extraClientExerciseIds = clientRows
    .slice(teamRows.length)
    .map((row) => row.id)

  if (extraClientExerciseIds.length > 0) {
    const { error } = await supabase
      .from('scheduled_workout_exercises')
      .delete()
      .in('id', extraClientExerciseIds)

    if (error) {
      throw new Error(error.message)
    }
  }
}

export async function getTeamMemberClientIds(
  supabase: SupabaseClient,
  teamId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('client_id')
    .eq('team_id', teamId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => row.client_id)
}

export async function syncTeamWorkoutToClient(
  supabase: SupabaseClient,
  coachId: string,
  clientId: string,
  teamWorkout: {
    id: string
    scheduled_date: string
    name: string
    notes: string | null
    library_workout_id: string | null
  }
) {
  const { data: existing, error: existingError } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('client_id', clientId)
    .eq('team_scheduled_workout_id', teamWorkout.id)
    .maybeSingle()

  if (existingError) {
    if (existingError.message.includes('team_scheduled_workout_id')) {
      return
    }
    throw new Error(existingError.message)
  }

  let clientWorkoutId = existing?.id

  if (clientWorkoutId) {
    const { error } = await supabase
      .from('client_scheduled_workouts')
      .update({
        scheduled_date: teamWorkout.scheduled_date,
        name: teamWorkout.name,
        notes: teamWorkout.notes,
        library_workout_id: teamWorkout.library_workout_id,
      })
      .eq('id', clientWorkoutId)

    if (error) {
      throw new Error(error.message)
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('client_scheduled_workouts')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        scheduled_date: teamWorkout.scheduled_date,
        name: teamWorkout.name,
        notes: teamWorkout.notes,
        library_workout_id: teamWorkout.library_workout_id,
        team_scheduled_workout_id: teamWorkout.id,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      throw new Error(error?.message ?? 'Could not sync workout to member calendar.')
    }

    clientWorkoutId = inserted.id
  }

  await syncTeamWorkoutExercisesToClient(supabase, teamWorkout.id, clientWorkoutId)
}

export async function syncTeamWorkoutToMembers(
  supabase: SupabaseClient,
  coachId: string,
  teamId: string,
  teamWorkoutId: string
) {
  const { data: teamWorkout, error } = await supabase
    .from('team_scheduled_workouts')
    .select('id, scheduled_date, name, notes, library_workout_id')
    .eq('id', teamWorkoutId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (error) {
    if (error.message.includes('Could not find the table')) {
      return []
    }
    throw new Error(error.message)
  }

  if (!teamWorkout) {
    return []
  }

  const clientIds = await getTeamMemberClientIds(supabase, teamId)
  for (const clientId of clientIds) {
    await syncTeamWorkoutToClient(supabase, coachId, clientId, teamWorkout)
  }

  return clientIds
}

export async function removeTeamWorkoutFromMembers(
  supabase: SupabaseClient,
  teamWorkoutId: string
) {
  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .delete()
    .eq('team_scheduled_workout_id', teamWorkoutId)
    .select('client_id')

  if (error) {
    if (error.message.includes('team_scheduled_workout_id')) {
      return []
    }
    throw new Error(error.message)
  }

  return Array.from(new Set((data ?? []).map((row) => row.client_id)))
}

export async function materializeTeamCalendarToClient(
  supabase: SupabaseClient,
  coachId: string,
  teamId: string,
  clientId: string
) {
  const { data: teamWorkouts, error } = await supabase
    .from('team_scheduled_workouts')
    .select('id, scheduled_date, name, notes, library_workout_id')
    .eq('team_id', teamId)
    .order('scheduled_date', { ascending: true })

  if (error) {
    if (error.message.includes('Could not find the table')) {
      return
    }
    throw new Error(error.message)
  }

  for (const teamWorkout of teamWorkouts ?? []) {
    await syncTeamWorkoutToClient(supabase, coachId, clientId, teamWorkout)
  }
}

export async function syncProgramToTeamCalendar(
  supabase: SupabaseClient,
  coachId: string,
  teamId: string,
  programId: string,
  startDate: string
) {
  const { data: programWorkouts, error: programError } = await supabase
    .from('program_scheduled_workouts')
    .select('id, day_offset, name, notes, library_workout_id')
    .eq('program_id', programId)
    .order('day_offset', { ascending: true })

  if (programError) {
    throw new Error(programError.message)
  }

  const { data: existingTeamWorkouts, error: existingError } = await supabase
    .from('team_scheduled_workouts')
    .select('id, program_scheduled_workout_id')
    .eq('team_id', teamId)
    .not('program_scheduled_workout_id', 'is', null)

  if (existingError) {
    throw new Error(existingError.message)
  }

  const currentSourceIds = new Set(
    (programWorkouts ?? []).map((workout) => workout.id)
  )

  for (const staleWorkout of existingTeamWorkouts ?? []) {
    if (
      staleWorkout.program_scheduled_workout_id &&
      !currentSourceIds.has(staleWorkout.program_scheduled_workout_id)
    ) {
      await removeTeamWorkoutFromMembers(supabase, staleWorkout.id)
      const { error } = await supabase
        .from('team_scheduled_workouts')
        .delete()
        .eq('id', staleWorkout.id)

      if (error) {
        throw new Error(error.message)
      }
    }
  }

  const memberIds = await getTeamMemberClientIds(supabase, teamId)

  for (const programWorkout of programWorkouts ?? []) {
    const scheduledDate = addDaysToDateKey(startDate, programWorkout.day_offset)
    const existing = (existingTeamWorkouts ?? []).find(
      (workout) =>
        workout.program_scheduled_workout_id === programWorkout.id
    )

    let teamWorkoutId = existing?.id

    if (teamWorkoutId) {
      const { error } = await supabase
        .from('team_scheduled_workouts')
        .update({
          scheduled_date: scheduledDate,
          name: programWorkout.name,
          notes: programWorkout.notes,
          library_workout_id: programWorkout.library_workout_id,
        })
        .eq('id', teamWorkoutId)

      if (error) {
        throw new Error(error.message)
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('team_scheduled_workouts')
        .insert({
          coach_id: coachId,
          team_id: teamId,
          scheduled_date: scheduledDate,
          name: programWorkout.name,
          notes: programWorkout.notes,
          library_workout_id: programWorkout.library_workout_id,
          program_scheduled_workout_id: programWorkout.id,
        })
        .select('id')
        .single()

      if (error || !inserted) {
        throw new Error(
          error?.message ?? 'Could not add program workout to team calendar.'
        )
      }

      teamWorkoutId = inserted.id
    }

    const { data: programExercises, error: exercisesError } = await supabase
      .from('program_scheduled_workout_exercises')
      .select(TEAM_EXERCISE_SYNC_SELECT)
      .eq('program_scheduled_workout_id', programWorkout.id)
      .order('sort_order', { ascending: true })

    if (exercisesError) {
      throw new Error(exercisesError.message)
    }

    const { error: clearError } = await supabase
      .from('team_scheduled_workout_exercises')
      .delete()
      .eq('team_scheduled_workout_id', teamWorkoutId)

    if (clearError) {
      throw new Error(clearError.message)
    }

    if (programExercises?.length) {
      const { error: insertExercisesError } = await supabase
        .from('team_scheduled_workout_exercises')
        .insert(
          (programExercises as TeamExerciseSyncRow[]).map((exercise) => ({
            team_scheduled_workout_id: teamWorkoutId,
            ...exercise,
          }))
        )

      if (insertExercisesError) {
        throw new Error(insertExercisesError.message)
      }
    }

    for (const clientId of memberIds) {
      const { data: linkedWorkout, error: linkedError } = await supabase
        .from('client_scheduled_workouts')
        .select('id')
        .eq('client_id', clientId)
        .eq('team_scheduled_workout_id', teamWorkoutId)
        .maybeSingle()

      if (linkedError) {
        throw new Error(linkedError.message)
      }

      if (!linkedWorkout) {
        const { data: materializedWorkout, error: materializedError } =
          await supabase
            .from('client_scheduled_workouts')
            .select('id')
            .eq('client_id', clientId)
            .eq('scheduled_date', scheduledDate)
            .eq('name', programWorkout.name)
            .is('team_scheduled_workout_id', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (materializedError) {
          throw new Error(materializedError.message)
        }

        if (materializedWorkout) {
          const { error: linkError } = await supabase
            .from('client_scheduled_workouts')
            .update({ team_scheduled_workout_id: teamWorkoutId })
            .eq('id', materializedWorkout.id)

          if (linkError) {
            throw new Error(linkError.message)
          }
        }
      }

      await syncTeamWorkoutToClient(supabase, coachId, clientId, {
        id: teamWorkoutId,
        scheduled_date: scheduledDate,
        name: programWorkout.name,
        notes: programWorkout.notes,
        library_workout_id: programWorkout.library_workout_id,
      })
    }
  }
}

export async function backfillTeamCalendarFromProgram(
  supabase: SupabaseClient,
  coachId: string,
  teamId: string,
  programId: string,
  startDate: string
) {
  const { data: existing, error } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('team_id', teamId)
    .not('program_scheduled_workout_id', 'is', null)
    .limit(1)

  if (error) {
    if (error.message.includes('Could not find the table')) {
      return
    }
    throw new Error(error.message)
  }

  if (existing && existing.length > 0) {
    return
  }

  await syncProgramToTeamCalendar(supabase, coachId, teamId, programId, startDate)
}

export async function removeProgramWorkoutsFromTeamCalendar(
  supabase: SupabaseClient,
  teamId: string
) {
  const { data: workouts, error } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('team_id', teamId)
    .not('program_scheduled_workout_id', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  const clientIds = new Set<string>()
  for (const workout of workouts ?? []) {
    for (const clientId of await removeTeamWorkoutFromMembers(
      supabase,
      workout.id
    )) {
      clientIds.add(clientId)
    }
  }

  if (workouts?.length) {
    const { error: deleteError } = await supabase
      .from('team_scheduled_workouts')
      .delete()
      .in(
        'id',
        workouts.map((workout) => workout.id)
      )

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  return Array.from(clientIds)
}
