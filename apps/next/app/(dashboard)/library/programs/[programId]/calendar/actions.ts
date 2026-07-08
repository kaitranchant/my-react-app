'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { addDaysToDateKey } from '@/lib/calendar'
import {
  DAYS_PER_PROGRAM_WEEK,
  formatProgramDayLabel,
  formatProgramWeekLabel,
  getMatchingDayOffsetsInRange,
  getTargetDayOffsetForWeekCopy,
  getWeekDayOffsets,
  MAX_PROGRAM_DAY_OFFSET,
} from '@/lib/program-calendar'
import {
  copyProgramWeekRangeSchema,
  copyProgramWorkoutRangeSchema,
} from '@/lib/validations/program'
import {
  buildOrderedIdsAfterInsert,
  type OrderedExerciseRow,
} from '@/lib/workout-exercise-order'
import { createClient } from '@/lib/supabase/server'
import {
  prescriptionValuesToDbRow,
  scheduledExerciseFormSchema,
  scheduledExerciseUpdateSchema,
  scheduledWorkoutFormSchema,
  type ScheduledExerciseFormValues,
  type ScheduledExerciseUpdateValues,
  type ScheduledWorkoutFormValues,
} from '@/lib/validations/calendar'
import type {
  ProgramDaySummary,
  ProgramScheduledWorkoutWithExercises,
  ScheduledExerciseBlock,
  ScheduledExerciseRepMode,
  ScheduledExerciseTrackingOptions,
} from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateProgramWorkoutResult =
  | { success: true; workoutId: string }
  | { success: false; error: string }

export type CopyProgramWorkoutRangeResult =
  | { success: true; copiedCount: number; skippedCount: number }
  | { success: false; error: string }

export type ProgramWeekData = {
  workouts: ProgramDaySummary[]
  selectedWorkout: ProgramDaySummary | null
}

const dayOffsetSchema = z.number().int().min(0).max(MAX_PROGRAM_DAY_OFFSET)

const MAX_COPY_RANGE_DAYS = 366

const MAX_COPY_WEEK_RANGE = 52

const PROGRAM_EXERCISES_SQL_FILE = 'apply-program-workout-exercises.sql'

function isMissingProgramExercisesTable(message: string) {
  return (
    message.includes('Could not find the table') &&
    message.includes('program_scheduled_workout_exercises')
  )
}

function mapProgramCalendarDbError(message: string): string {
  if (isMissingProgramExercisesTable(message)) {
    return `Database setup required: run supabase/${PROGRAM_EXERCISES_SQL_FILE} in the Supabase SQL editor, then refresh this page.`
  }
  return message
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

async function requireProgram(programId: string) {
  const { supabase, user } = await requireUser()
  const { data: program, error } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !program) {
    return null
  }

  return { supabase, user, program }
}

function revalidateProgramCalendar(programId: string) {
  revalidatePath(`/library/programs/${programId}`)
  revalidatePath('/library/programs')
}

type ProgramWorkoutSnapshot = {
  day_offset: number
  name: string
  library_workout_id: string | null
}

type ClientWorkoutSnapshot = {
  id: string
  scheduled_date: string
  name: string
  library_workout_id: string | null
}

function matchesMaterializedProgramWorkout(
  programWorkout: Pick<ProgramWorkoutSnapshot, 'name' | 'library_workout_id'>,
  clientWorkout: Pick<ClientWorkoutSnapshot, 'name' | 'library_workout_id'>
): boolean {
  if (
    programWorkout.library_workout_id &&
    clientWorkout.library_workout_id === programWorkout.library_workout_id
  ) {
    return true
  }

  return clientWorkout.name === programWorkout.name
}

function matchesProgramWorkoutCopy(
  source: Pick<ProgramWorkoutSnapshot, 'name' | 'library_workout_id'>,
  target: Pick<ProgramWorkoutSnapshot, 'name' | 'library_workout_id'>
): boolean {
  if (
    source.library_workout_id &&
    target.library_workout_id === source.library_workout_id
  ) {
    return true
  }

  return target.name === source.name
}

const PROGRAM_EXERCISE_SYNC_SELECT =
  'exercise_id, sort_order, sets, reps, prescription, superset_group, exercise_block, workout_notes, rep_mode, each_side, tempo, rest_seconds, weight_percent, rpe_target, tracking_options'

type ProgramExerciseSyncRow = {
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
  programExercise: ProgramExerciseSyncRow,
  clientWorkoutId: string
) {
  return {
    scheduled_workout_id: clientWorkoutId,
    exercise_id: programExercise.exercise_id,
    sort_order: programExercise.sort_order,
    sets: programExercise.sets,
    reps: programExercise.reps,
    prescription: programExercise.prescription,
    superset_group: programExercise.superset_group,
    exercise_block: programExercise.exercise_block,
    workout_notes: programExercise.workout_notes,
    rep_mode: programExercise.rep_mode,
    each_side: programExercise.each_side,
    tempo: programExercise.tempo,
    rest_seconds: programExercise.rest_seconds,
    weight_percent: programExercise.weight_percent,
    rpe_target: programExercise.rpe_target,
    tracking_options: programExercise.tracking_options,
  }
}

async function syncProgramWorkoutExercisesToClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programWorkoutId: string,
  clientWorkoutId: string
) {
  const { data: programExercises, error: programError } = await supabase
    .from('program_scheduled_workout_exercises')
    .select(PROGRAM_EXERCISE_SYNC_SELECT)
    .eq('program_scheduled_workout_id', programWorkoutId)
    .order('sort_order', { ascending: true })

  if (programError) {
    if (programError.message.includes('Could not find the table')) {
      return
    }
    throw new Error(programError.message)
  }

  const { data: clientExercises, error: clientError } = await supabase
    .from('scheduled_workout_exercises')
    .select(`id, ${PROGRAM_EXERCISE_SYNC_SELECT}`)
    .eq('scheduled_workout_id', clientWorkoutId)
    .order('sort_order', { ascending: true })

  if (clientError) {
    throw new Error(clientError.message)
  }

  const programRows = (programExercises ?? []) as ProgramExerciseSyncRow[]
  const clientRows = clientExercises ?? []

  for (let index = 0; index < programRows.length; index++) {
    const programRow = programRows[index]
    const clientRow = clientRows[index]

    if (clientRow) {
      if (clientRow.exercise_id === programRow.exercise_id) {
        const { error } = await supabase
          .from('scheduled_workout_exercises')
          .update(buildClientExerciseRow(programRow, clientWorkoutId))
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
          .insert(buildClientExerciseRow(programRow, clientWorkoutId))

        if (insertError) {
          throw new Error(insertError.message)
        }
      }
    } else {
      const { error } = await supabase
        .from('scheduled_workout_exercises')
        .insert(buildClientExerciseRow(programRow, clientWorkoutId))

      if (error) {
        throw new Error(error.message)
      }
    }
  }

  const extraClientExerciseIds = clientRows
    .slice(programRows.length)
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

type ProgramWorkoutSyncRow = ProgramWorkoutSnapshot & {
  id: string
  notes: string | null
}

async function syncProgramWorkoutToClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  clientId: string,
  startDate: string,
  programWorkout: ProgramWorkoutSyncRow
) {
  const scheduledDate = addDaysToDateKey(startDate, programWorkout.day_offset)

  const { data: existing, error: existingError } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('client_id', clientId)
    .eq('scheduled_date', scheduledDate)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  let clientWorkoutId = existing?.id

  if (clientWorkoutId) {
    const { error } = await supabase
      .from('client_scheduled_workouts')
      .update({
        name: programWorkout.name,
        notes: programWorkout.notes,
        library_workout_id: programWorkout.library_workout_id,
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
        scheduled_date: scheduledDate,
        name: programWorkout.name,
        notes: programWorkout.notes,
        library_workout_id: programWorkout.library_workout_id,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      throw new Error(error?.message ?? 'Could not sync workout to client calendar.')
    }

    clientWorkoutId = inserted.id
  }

  await syncProgramWorkoutExercisesToClient(
    supabase,
    programWorkout.id,
    clientWorkoutId
  )
}

async function removeDeletedProgramWorkoutFromClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  startDate: string,
  deletedWorkout: ProgramWorkoutSnapshot
) {
  const scheduledDate = addDaysToDateKey(startDate, deletedWorkout.day_offset)

  const { data: clientWorkout, error } = await supabase
    .from('client_scheduled_workouts')
    .select('id, name, library_workout_id')
    .eq('client_id', clientId)
    .eq('scheduled_date', scheduledDate)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (
    clientWorkout &&
    matchesMaterializedProgramWorkout(deletedWorkout, clientWorkout)
  ) {
    const { error: deleteError } = await supabase
      .from('client_scheduled_workouts')
      .delete()
      .eq('id', clientWorkout.id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }
}

async function syncProgramAssignmentToClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  clientId: string,
  startDate: string,
  programWorkouts: ProgramWorkoutSyncRow[],
  deletedWorkouts: ProgramWorkoutSnapshot[] = []
) {
  for (const deletedWorkout of deletedWorkouts) {
    await removeDeletedProgramWorkoutFromClient(
      supabase,
      clientId,
      startDate,
      deletedWorkout
    )
  }

  for (const programWorkout of programWorkouts) {
    await syncProgramWorkoutToClient(
      supabase,
      coachId,
      clientId,
      startDate,
      programWorkout
    )
  }
}

async function syncProgramToAssignedClients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  programId: string,
  options?: { deletedWorkouts?: ProgramWorkoutSnapshot[] }
) {
  const { data: assignments, error: assignmentsError } = await supabase
    .from('program_assignments')
    .select('client_id, start_date')
    .eq('program_id', programId)
    .eq('coach_id', coachId)
    .eq('status', 'active')
    .not('start_date', 'is', null)

  if (assignmentsError) {
    if (assignmentsError.message.includes('Could not find the table')) {
      return
    }
    throw new Error(assignmentsError.message)
  }

  if (!assignments?.length) {
    return
  }

  const { data: programWorkouts, error: workoutsError } = await supabase
    .from('program_scheduled_workouts')
    .select('id, day_offset, name, notes, library_workout_id')
    .eq('program_id', programId)
    .order('day_offset', { ascending: true })

  if (workoutsError) {
    if (workoutsError.message.includes('Could not find the table')) {
      return
    }
    throw new Error(workoutsError.message)
  }

  const deletedWorkouts = options?.deletedWorkouts ?? []

  for (const assignment of assignments) {
    if (!assignment.start_date) continue

    await syncProgramAssignmentToClient(
      supabase,
      coachId,
      assignment.client_id,
      assignment.start_date,
      (programWorkouts ?? []) as ProgramWorkoutSyncRow[],
      deletedWorkouts
    )
  }
}

async function afterProgramCalendarChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  programId: string,
  options?: { deletedWorkouts?: ProgramWorkoutSnapshot[] }
) {
  await syncProgramToAssignedClients(supabase, coachId, programId, options)

  const { data: assignments } = await supabase
    .from('program_assignments')
    .select('client_id')
    .eq('program_id', programId)
    .eq('coach_id', coachId)
    .eq('status', 'active')

  for (const assignment of assignments ?? []) {
    revalidatePath(`/clients/${assignment.client_id}`)
  }

  revalidatePath('/portal', 'layout')
  revalidateProgramCalendar(programId)
}

async function fetchProgramWorkoutExerciseRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<OrderedExerciseRow[]> {
  const { data, error } = await supabase
    .from('program_scheduled_workout_exercises')
    .select('id, sort_order, exercise_block, superset_group')
    .eq('program_scheduled_workout_id', workoutId)
    .order('sort_order', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    id: row.id,
    sort_order: row.sort_order,
    exercise_block: row.exercise_block as ScheduledExerciseBlock | null,
    superset_group: row.superset_group,
  }))
}

async function applyProgramExerciseSortOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderedIds: string[]
): Promise<ActionResult> {
  for (let index = 0; index < orderedIds.length; index++) {
    const id = orderedIds[index]
    const { error } = await supabase
      .from('program_scheduled_workout_exercises')
      .update({ sort_order: index })
      .eq('id', id)

    if (error) {
      return { success: false, error: mapProgramCalendarDbError(error.message) }
    }
  }

  return { success: true }
}

async function fetchProgramWorkoutWithExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string,
  programId: string
): Promise<ProgramScheduledWorkoutWithExercises | null> {
  const { data: workout, error: workoutError } = await supabase
    .from('program_scheduled_workouts')
    .select('*')
    .eq('id', workoutId)
    .eq('program_id', programId)
    .maybeSingle()

  if (workoutError || !workout) {
    return null
  }

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('program_scheduled_workout_exercises')
    .select(
      `
      *,
      exercise:exercises(id, name, muscle_group, equipment, external_id, image_url, demo_video_path, demo_video_url, instructions)
    `
    )
    .eq('program_scheduled_workout_id', workoutId)
    .order('sort_order', { ascending: true })

  let exercises: ProgramScheduledWorkoutWithExercises['exercises'] = []

  if (!exercisesError && exerciseRows) {
    exercises = exerciseRows.map((row) => ({
      ...row,
      scheduled_workout_id: row.program_scheduled_workout_id,
      client_notes: null,
      perceived_rpe: null,
    }))
  } else if (
    exercisesError &&
    !exercisesError.message.includes('Could not find the table')
  ) {
    const { data: bareRows } = await supabase
      .from('program_scheduled_workout_exercises')
      .select('*')
      .eq('program_scheduled_workout_id', workoutId)
      .order('sort_order', { ascending: true })

    if (bareRows?.length) {
      const exerciseIds = Array.from(new Set(bareRows.map((row) => row.exercise_id)))
      const { data: exerciseDetails } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, equipment, external_id, image_url, demo_video_path, demo_video_url, instructions')
        .in('id', exerciseIds)

      const detailsById = new Map(
        (exerciseDetails ?? []).map((exercise) => [exercise.id, exercise])
      )

      exercises = bareRows
        .map((row) => {
          const exercise = detailsById.get(row.exercise_id)
          if (!exercise) return null
          return {
            ...row,
            scheduled_workout_id: row.program_scheduled_workout_id,
            client_notes: null,
            perceived_rpe: null,
            exercise,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
    }
  }

  return {
    ...workout,
    exercises,
  } as ProgramScheduledWorkoutWithExercises
}

export async function isProgramExercisesSchemaReady(): Promise<boolean> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('program_scheduled_workout_exercises')
    .select('id')
    .limit(1)

  if (!error) return true
  return !isMissingProgramExercisesTable(error.message)
}

export async function getProgramWorkoutWithExercises(
  programId: string,
  workoutId: string
): Promise<
  | { success: true; workout: ProgramScheduledWorkoutWithExercises }
  | { success: false; error: string }
> {
  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const workout = await fetchProgramWorkoutWithExercises(
    ctx.supabase,
    workoutId,
    programId
  )
  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  return { success: true, workout }
}

export async function getProgramWeekData(
  programId: string,
  weekIndex: number,
  selectedDayOffset?: number
): Promise<ProgramWeekData> {
  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { workouts: [], selectedWorkout: null }
  }

  const { supabase } = ctx
  const dayOffsets = getWeekDayOffsets(weekIndex)

  const { data } = await supabase
    .from('program_scheduled_workouts')
    .select('id, day_offset, name, notes, library_workout_id')
    .eq('program_id', programId)
    .in('day_offset', dayOffsets)
    .order('day_offset', { ascending: true })

  const workouts = (data ?? []) as ProgramDaySummary[]
  const selectedWorkout =
    selectedDayOffset !== undefined
      ? workouts.find((workout) => workout.day_offset === selectedDayOffset) ?? null
      : null

  return { workouts, selectedWorkout }
}

export async function createProgramScheduledWorkout(
  programId: string,
  dayOffset: number,
  values: ScheduledWorkoutFormValues,
  libraryWorkoutId?: string | null
): Promise<CreateProgramWorkoutResult> {
  const parsedOffset = dayOffsetSchema.safeParse(dayOffset)
  if (!parsedOffset.success) {
    return { success: false, error: 'Invalid day.' }
  }

  const parsed = scheduledWorkoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from('program_scheduled_workouts')
    .insert({
      coach_id: user.id,
      program_id: programId,
      day_offset: parsedOffset.data,
      name: parsed.data.name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      library_workout_id: libraryWorkoutId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'This program already has a workout on that day.',
      }
    }
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: false, error: 'Could not schedule workout.' }
  }

  await afterProgramCalendarChange(supabase, user.id, programId)
  return { success: true, workoutId: data.id }
}

export async function updateProgramScheduledWorkout(
  programId: string,
  workoutId: string,
  values: ScheduledWorkoutFormValues,
  libraryWorkoutId?: string | null
): Promise<ActionResult> {
  const parsed = scheduledWorkoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase } = ctx

  const { error } = await supabase
    .from('program_scheduled_workouts')
    .update({
      name: parsed.data.name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      library_workout_id: libraryWorkoutId ?? null,
    })
    .eq('id', workoutId)
    .eq('program_id', programId)

  if (error) {
    return { success: false, error: error.message }
  }

  await afterProgramCalendarChange(supabase, ctx.user.id, programId)
  return { success: true }
}

export async function deleteProgramScheduledWorkout(
  programId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx

  const { data: deletedWorkout, error: fetchError } = await supabase
    .from('program_scheduled_workouts')
    .select('day_offset, name, library_workout_id')
    .eq('id', workoutId)
    .eq('program_id', programId)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const { error } = await supabase
    .from('program_scheduled_workouts')
    .delete()
    .eq('id', workoutId)
    .eq('program_id', programId)

  if (error) {
    return { success: false, error: error.message }
  }

  await afterProgramCalendarChange(supabase, user.id, programId, {
    deletedWorkouts: deletedWorkout ? [deletedWorkout] : [],
  })
  return { success: true }
}

export async function addProgramScheduledExercise(
  programId: string,
  workoutId: string,
  values: ScheduledExerciseFormValues
): Promise<ActionResult> {
  const parsed = scheduledExerciseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx

  const { data: workout, error: workoutError } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('program_id', programId)
    .maybeSingle()

  if (workoutError || !workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('id')
    .eq('id', parsed.data.exerciseId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (exerciseError || !exercise) {
    return { success: false, error: 'Exercise not found.' }
  }

  const existingRows = await fetchProgramWorkoutExerciseRows(supabase, workoutId)
  const dbRow = prescriptionValuesToDbRow(parsed.data)
  const newBlock = dbRow.exercise_block

  const { data: inserted, error: insertError } = await supabase
    .from('program_scheduled_workout_exercises')
    .insert({
      program_scheduled_workout_id: workoutId,
      exercise_id: parsed.data.exerciseId,
      sort_order: existingRows.length,
      ...dbRow,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return {
      success: false,
      error: mapProgramCalendarDbError(
        insertError?.message ?? 'Could not add exercise.'
      ),
    }
  }

  const orderedIds = buildOrderedIdsAfterInsert(
    existingRows,
    inserted.id,
    newBlock,
    { newSupersetGroup: dbRow.superset_group }
  )
  const orderResult = await applyProgramExerciseSortOrders(supabase, orderedIds)
  if (!orderResult.success) {
    return orderResult
  }

  await afterProgramCalendarChange(supabase, user.id, programId)
  return { success: true }
}

export async function updateProgramScheduledExercise(
  programId: string,
  exerciseRowId: string,
  values: ScheduledExerciseUpdateValues
): Promise<ActionResult> {
  const parsed = scheduledExerciseUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase } = ctx

  const { data: row, error: rowError } = await supabase
    .from('program_scheduled_workout_exercises')
    .select('id, program_scheduled_workout_id, exercise_block, superset_group')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return {
      success: false,
      error: rowError
        ? mapProgramCalendarDbError(rowError.message)
        : 'Exercise row not found.',
    }
  }

  const { data: workout } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('id', row.program_scheduled_workout_id)
    .eq('program_id', programId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const dbRow = prescriptionValuesToDbRow(parsed.data)
  const newBlock = dbRow.exercise_block
  const blockChanged = row.exercise_block !== newBlock
  const supersetGroupChanged = row.superset_group !== dbRow.superset_group

  const { error: updateError } = await supabase
    .from('program_scheduled_workout_exercises')
    .update(dbRow)
    .eq('id', exerciseRowId)

  if (updateError) {
    return { success: false, error: mapProgramCalendarDbError(updateError.message) }
  }

  if (blockChanged || supersetGroupChanged) {
    const existingRows = await fetchProgramWorkoutExerciseRows(
      supabase,
      row.program_scheduled_workout_id
    )
    const orderedIds = buildOrderedIdsAfterInsert(
      existingRows,
      exerciseRowId,
      newBlock,
      {
        excludeId: exerciseRowId,
        newSupersetGroup: dbRow.superset_group,
      }
    )
    const orderResult = await applyProgramExerciseSortOrders(supabase, orderedIds)
    if (!orderResult.success) {
      return orderResult
    }
  }

  await afterProgramCalendarChange(supabase, ctx.user.id, programId)
  return { success: true }
}

export async function replaceProgramScheduledExercise(
  programId: string,
  exerciseRowId: string,
  newExerciseId: string
): Promise<ActionResult> {
  const exerciseIdParsed = z.string().uuid().safeParse(newExerciseId)
  if (!exerciseIdParsed.success) {
    return { success: false, error: 'Select a valid exercise.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx

  const { data: row, error: rowError } = await supabase
    .from('program_scheduled_workout_exercises')
    .select('id, program_scheduled_workout_id, exercise_id')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return {
      success: false,
      error: rowError
        ? mapProgramCalendarDbError(rowError.message)
        : 'Exercise row not found.',
    }
  }

  if (row.exercise_id === exerciseIdParsed.data) {
    return { success: true }
  }

  const { data: workout } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('id', row.program_scheduled_workout_id)
    .eq('program_id', programId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('id')
    .eq('id', exerciseIdParsed.data)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (exerciseError || !exercise) {
    return { success: false, error: 'Exercise not found.' }
  }

  const { error } = await supabase
    .from('program_scheduled_workout_exercises')
    .update({ exercise_id: exerciseIdParsed.data })
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: mapProgramCalendarDbError(error.message) }
  }

  await afterProgramCalendarChange(supabase, user.id, programId)
  return { success: true }
}

export async function removeProgramScheduledExercise(
  programId: string,
  exerciseRowId: string
): Promise<ActionResult> {
  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase } = ctx

  const { data: row, error: rowError } = await supabase
    .from('program_scheduled_workout_exercises')
    .select('id, program_scheduled_workout_id')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return {
      success: false,
      error: rowError
        ? mapProgramCalendarDbError(rowError.message)
        : 'Exercise row not found.',
    }
  }

  const { data: workout } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('id', row.program_scheduled_workout_id)
    .eq('program_id', programId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const { error } = await supabase
    .from('program_scheduled_workout_exercises')
    .delete()
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: mapProgramCalendarDbError(error.message) }
  }

  await afterProgramCalendarChange(supabase, ctx.user.id, programId)
  return { success: true }
}

export async function reorderProgramScheduledExercises(
  programId: string,
  workoutId: string,
  orderedRowIds: string[]
): Promise<ActionResult> {
  if (orderedRowIds.length === 0) {
    return { success: true }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase } = ctx

  const { data: workout } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('program_id', programId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const existingRows = await fetchProgramWorkoutExerciseRows(supabase, workoutId)
  if (existingRows.length !== orderedRowIds.length) {
    return {
      success: false,
      error: 'Exercise list is out of date. Refresh and try again.',
    }
  }

  const existingIds = new Set(existingRows.map((row) => row.id))
  const uniqueOrdered = new Set(orderedRowIds)
  if (
    uniqueOrdered.size !== orderedRowIds.length ||
    orderedRowIds.some((id) => !existingIds.has(id))
  ) {
    return { success: false, error: 'Invalid exercise order.' }
  }

  const orderResult = await applyProgramExerciseSortOrders(supabase, orderedRowIds)
  if (!orderResult.success) {
    return orderResult
  }

  await afterProgramCalendarChange(supabase, ctx.user.id, programId)
  return { success: true }
}

export type DematerializeProgramResult = {
  removedCount: number
}

export async function dematerializeProgramFromClientCalendar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  programId: string,
  startDate: string
): Promise<DematerializeProgramResult> {
  const { data: programWorkouts, error } = await supabase
    .from('program_scheduled_workouts')
    .select('day_offset, name, library_workout_id')
    .eq('program_id', programId)
    .order('day_offset', { ascending: true })

  if (error) {
    if (error.message.includes('Could not find the table')) {
      return { removedCount: 0 }
    }
    throw new Error(error.message)
  }

  if (!programWorkouts?.length) {
    return { removedCount: 0 }
  }

  const programByDate = new Map(
    programWorkouts.map((workout) => [
      addDaysToDateKey(startDate, workout.day_offset),
      workout,
    ])
  )
  const targetDates = Array.from(programByDate.keys())

  const { data: clientWorkouts, error: clientError } = await supabase
    .from('client_scheduled_workouts')
    .select('id, scheduled_date, name, library_workout_id')
    .eq('client_id', clientId)
    .in('scheduled_date', targetDates)

  if (clientError) {
    throw new Error(clientError.message)
  }

  const idsToDelete = (clientWorkouts ?? [])
    .filter((clientWorkout) => {
      const programWorkout = programByDate.get(clientWorkout.scheduled_date)
      if (!programWorkout) return false
      return matchesMaterializedProgramWorkout(programWorkout, clientWorkout)
    })
    .map((workout) => workout.id)

  if (idsToDelete.length === 0) {
    return { removedCount: 0 }
  }

  const { error: deleteError } = await supabase
    .from('client_scheduled_workouts')
    .delete()
    .eq('client_id', clientId)
    .in('id', idsToDelete)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  return { removedCount: idsToDelete.length }
}

export type MaterializeProgramResult = {
  scheduledCount: number
  skippedCount: number
}

export async function materializeProgramToClientCalendar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  clientId: string,
  programId: string,
  startDate: string
): Promise<MaterializeProgramResult> {
  const { data: programWorkouts, error } = await supabase
    .from('program_scheduled_workouts')
    .select('id, day_offset, name, notes, library_workout_id')
    .eq('program_id', programId)
    .order('day_offset', { ascending: true })

  if (error) {
    if (error.message.includes('Could not find the table')) {
      return { scheduledCount: 0, skippedCount: 0 }
    }
    throw new Error(error.message)
  }

  if (!programWorkouts?.length) {
    return { scheduledCount: 0, skippedCount: 0 }
  }

  const targetDates = programWorkouts.map((workout) =>
    addDaysToDateKey(startDate, workout.day_offset)
  )

  const { data: existingRows } = await supabase
    .from('client_scheduled_workouts')
    .select('scheduled_date')
    .eq('client_id', clientId)
    .in('scheduled_date', targetDates)

  const existingDates = new Set(
    (existingRows ?? []).map((row) => row.scheduled_date)
  )

  let scheduledCount = 0
  let skippedCount = 0

  for (const programWorkout of programWorkouts) {
    const scheduledDate = addDaysToDateKey(startDate, programWorkout.day_offset)

    if (existingDates.has(scheduledDate)) {
      skippedCount += 1
      continue
    }

    const { data: clientWorkout, error: insertError } = await supabase
      .from('client_scheduled_workouts')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        scheduled_date: scheduledDate,
        name: programWorkout.name,
        notes: programWorkout.notes,
        library_workout_id: programWorkout.library_workout_id,
      })
      .select('id')
      .single()

    if (insertError || !clientWorkout) {
      throw new Error(insertError?.message ?? 'Could not schedule workout.')
    }

    const { data: programExercises, error: exercisesError } = await supabase
      .from('program_scheduled_workout_exercises')
      .select(PROGRAM_EXERCISE_SYNC_SELECT)
      .eq('program_scheduled_workout_id', programWorkout.id)
      .order('sort_order', { ascending: true })

    if (
      exercisesError &&
      !exercisesError.message.includes('Could not find the table')
    ) {
      throw new Error(exercisesError.message)
    }

    if (programExercises?.length) {
      const { error: exerciseInsertError } = await supabase
        .from('scheduled_workout_exercises')
        .insert(
          programExercises.map((exercise) => ({
            scheduled_workout_id: clientWorkout.id,
            exercise_id: exercise.exercise_id,
            sort_order: exercise.sort_order,
            sets: exercise.sets,
            reps: exercise.reps,
            prescription: exercise.prescription,
            superset_group: exercise.superset_group,
            exercise_block: exercise.exercise_block,
            workout_notes: exercise.workout_notes,
            rep_mode: exercise.rep_mode,
            each_side: exercise.each_side,
            tempo: exercise.tempo,
            rest_seconds: exercise.rest_seconds,
            weight_percent: exercise.weight_percent,
            rpe_target: exercise.rpe_target,
            tracking_options: exercise.tracking_options,
          }))
        )

      if (exerciseInsertError) {
        throw new Error(exerciseInsertError.message)
      }
    }

    scheduledCount += 1
  }

  return {
    scheduledCount,
    skippedCount,
  }
}

type ProgramExerciseRow = ProgramScheduledWorkoutWithExercises['exercises'][number]

function buildProgramExerciseInserts(
  programScheduledWorkoutId: string,
  exercises: ProgramExerciseRow[]
) {
  return exercises.map((row) => ({
    program_scheduled_workout_id: programScheduledWorkoutId,
    exercise_id: row.exercise_id,
    sort_order: row.sort_order,
    sets: row.sets,
    reps: row.reps,
    prescription: row.prescription,
    superset_group: row.superset_group,
    exercise_block: row.exercise_block,
    workout_notes: row.workout_notes,
    rep_mode: row.rep_mode,
    each_side: row.each_side,
    tempo: row.tempo,
    rest_seconds: row.rest_seconds,
    weight_percent: row.weight_percent,
    rpe_target: row.rpe_target,
    tracking_options: row.tracking_options,
  }))
}

async function copyProgramWorkoutToOffsets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  programId: string,
  source: ProgramScheduledWorkoutWithExercises,
  targetOffsets: number[]
): Promise<{ copiedCount: number; skippedCount: number } | { error: string }> {
  if (targetOffsets.length === 0) {
    return { copiedCount: 0, skippedCount: 0 }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('program_scheduled_workouts')
    .select('day_offset')
    .eq('program_id', programId)
    .in('day_offset', targetOffsets)

  if (existingError) {
    return { error: mapProgramCalendarDbError(existingError.message) }
  }

  const occupiedOffsets = new Set(
    (existingRows ?? []).map((row) => Number(row.day_offset))
  )
  const normalizedTargetOffsets = targetOffsets.map((offset) => Number(offset))
  const openOffsets = normalizedTargetOffsets.filter(
    (offset) => Number.isFinite(offset) && !occupiedOffsets.has(offset)
  )
  const skippedCount = normalizedTargetOffsets.length - openOffsets.length

  if (openOffsets.length === 0) {
    return { copiedCount: 0, skippedCount }
  }

  const { data: insertedWorkouts, error: createError } = await supabase
    .from('program_scheduled_workouts')
    .insert(
      openOffsets.map((dayOffset) => ({
        coach_id: coachId,
        program_id: programId,
        day_offset: dayOffset,
        name: source.name,
        notes: source.notes,
        library_workout_id: source.library_workout_id,
      }))
    )
    .select('id, day_offset')

  if (createError) {
    if (createError.code === '23505') {
      return { error: 'One or more target days already have a workout.' }
    }
    return {
      error: mapProgramCalendarDbError(
        createError.message ?? 'Could not copy workout.'
      ),
    }
  }

  let createdWorkouts = insertedWorkouts ?? []
  if (createdWorkouts.length === 0) {
    const { data: refetchedWorkouts, error: refetchError } = await supabase
      .from('program_scheduled_workouts')
      .select('id, day_offset')
      .eq('program_id', programId)
      .in('day_offset', openOffsets)

    if (refetchError) {
      return { error: mapProgramCalendarDbError(refetchError.message) }
    }

    createdWorkouts = refetchedWorkouts ?? []
  }

  if (createdWorkouts.length === 0) {
    return { error: 'Could not copy workout.' }
  }

  if (source.exercises.length > 0) {
    const exerciseRows = createdWorkouts.flatMap((created) =>
      buildProgramExerciseInserts(created.id, source.exercises)
    )

    const { error: exercisesError } = await supabase
      .from('program_scheduled_workout_exercises')
      .insert(exerciseRows)

    if (exercisesError) {
      await supabase
        .from('program_scheduled_workouts')
        .delete()
        .in(
          'id',
          createdWorkouts.map((row) => row.id)
        )
      return { error: mapProgramCalendarDbError(exercisesError.message) }
    }
  }

  return { copiedCount: createdWorkouts.length, skippedCount }
}

export async function copyProgramScheduledWorkoutToDay(
  programId: string,
  sourceWorkoutId: string,
  targetDayOffset: number
): Promise<CreateProgramWorkoutResult> {
  const parsedOffset = dayOffsetSchema.safeParse(targetDayOffset)
  if (!parsedOffset.success) {
    return { success: false, error: 'Invalid day.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx

  const source = await fetchProgramWorkoutWithExercises(
    supabase,
    sourceWorkoutId,
    programId
  )
  if (!source) {
    return { success: false, error: 'Source workout not found.' }
  }

  if (source.day_offset === parsedOffset.data) {
    return { success: false, error: 'Choose a different day than the source workout.' }
  }

  const result = await copyProgramWorkoutToOffsets(
    supabase,
    user.id,
    programId,
    source,
    [parsedOffset.data]
  )

  if ('error' in result) {
    return { success: false, error: result.error }
  }

  if (result.copiedCount === 0) {
    return {
      success: false,
      error: 'That day already has a workout scheduled.',
    }
  }

  await afterProgramCalendarChange(supabase, user.id, programId)
  const created = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('program_id', programId)
    .eq('day_offset', parsedOffset.data)
    .maybeSingle()

  return {
    success: true,
    workoutId: created.data?.id ?? sourceWorkoutId,
  }
}

export async function copyProgramScheduledWorkoutToDayRange(
  programId: string,
  sourceWorkoutId: string,
  startDayOffset: number,
  endDayOffset: number,
  weekdays: number[]
): Promise<CopyProgramWorkoutRangeResult> {
  const parsed = copyProgramWorkoutRangeSchema.safeParse({
    startDayOffset,
    endDayOffset,
    weekdays,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid copy settings.',
    }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx

  const source = await fetchProgramWorkoutWithExercises(
    supabase,
    sourceWorkoutId,
    programId
  )
  if (!source) {
    return { success: false, error: 'Source workout not found.' }
  }

  const candidateOffsets = getMatchingDayOffsetsInRange(
    parsed.data.startDayOffset,
    parsed.data.endDayOffset,
    parsed.data.weekdays,
    { excludeOffsets: [source.day_offset] }
  )

  if (candidateOffsets.length === 0) {
    return {
      success: false,
      error: 'No matching days in this range. Adjust the days or weekdays.',
    }
  }

  if (candidateOffsets.length > MAX_COPY_RANGE_DAYS) {
    return {
      success: false,
      error: `Choose a range of ${MAX_COPY_RANGE_DAYS} days or fewer.`,
    }
  }

  const result = await copyProgramWorkoutToOffsets(
    supabase,
    user.id,
    programId,
    source,
    candidateOffsets
  )

  if ('error' in result) {
    return { success: false, error: result.error }
  }

  if (result.copiedCount === 0) {
    return {
      success: false,
      error: 'Every matching day already has a workout scheduled.',
    }
  }

  await afterProgramCalendarChange(supabase, user.id, programId)
  return {
    success: true,
    copiedCount: result.copiedCount,
    skippedCount: result.skippedCount,
  }
}

async function fetchProgramWeekWorkoutsWithExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  weekIndex: number
): Promise<ProgramScheduledWorkoutWithExercises[]> {
  const dayOffsets = getWeekDayOffsets(weekIndex)
  const { data: workouts, error } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('program_id', programId)
    .in('day_offset', dayOffsets)
    .order('day_offset', { ascending: true })

  if (error || !workouts?.length) {
    return []
  }

  const results: ProgramScheduledWorkoutWithExercises[] = []
  for (const workout of workouts) {
    const full = await fetchProgramWorkoutWithExercises(
      supabase,
      workout.id,
      programId
    )
    if (full) {
      results.push(full)
    }
  }

  return results
}

async function copyProgramWeekWorkoutsToTargetWeek(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  programId: string,
  sourceWeekIndex: number,
  targetWeekIndex: number,
  sourceWorkouts: ProgramScheduledWorkoutWithExercises[]
): Promise<
  | { copiedCount: number; skippedCount: number; blockedOffsets: number[] }
  | { error: string }
> {
  if (sourceWorkouts.length === 0) {
    return { copiedCount: 0, skippedCount: 0, blockedOffsets: [] }
  }

  const blockedOffsets: number[] = []
  let copiedCount = 0
  let skippedCount = 0

  for (const { source, targetOffset } of getWeekCopyMappings(
    sourceWorkouts,
    sourceWeekIndex,
    targetWeekIndex
  )) {
    const result = await copyProgramWorkoutToOffsets(
      supabase,
      coachId,
      programId,
      source,
      [targetOffset]
    )

    if ('error' in result) {
      return { error: result.error }
    }

    copiedCount += result.copiedCount
    skippedCount += result.skippedCount

    if (result.copiedCount === 0 && result.skippedCount > 0) {
      blockedOffsets.push(targetOffset)
    }
  }

  return { copiedCount, skippedCount, blockedOffsets }
}

function getWeekCopyMappings(
  sourceWorkouts: ProgramScheduledWorkoutWithExercises[],
  sourceWeekIndex: number,
  targetWeekIndex: number
): Array<{
  source: ProgramScheduledWorkoutWithExercises
  targetOffset: number
}> {
  const sourceWeekStart = sourceWeekIndex * DAYS_PER_PROGRAM_WEEK
  const sourceWeekEnd = sourceWeekStart + DAYS_PER_PROGRAM_WEEK - 1

  return sourceWorkouts.flatMap((source) => {
    const sourceOffset = Number(source.day_offset)
    if (
      !Number.isFinite(sourceOffset) ||
      sourceOffset < sourceWeekStart ||
      sourceOffset > sourceWeekEnd
    ) {
      return []
    }

    const targetOffset = getTargetDayOffsetForWeekCopy(
      sourceOffset,
      targetWeekIndex
    )

    if (!Number.isFinite(targetOffset) || targetOffset > MAX_PROGRAM_DAY_OFFSET) {
      return []
    }

    return [{ source, targetOffset }]
  })
}

async function targetWeekAlreadyHasCopiedWorkouts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  sourceWorkouts: ProgramScheduledWorkoutWithExercises[],
  sourceWeekIndex: number,
  targetWeekIndex: number
): Promise<boolean> {
  const mappings = getWeekCopyMappings(
    sourceWorkouts,
    sourceWeekIndex,
    targetWeekIndex
  )

  if (mappings.length === 0) {
    return false
  }

  const targetOffsets = mappings.map((mapping) => mapping.targetOffset)
  const { data: existingRows, error } = await supabase
    .from('program_scheduled_workouts')
    .select('day_offset, name, library_workout_id')
    .eq('program_id', programId)
    .in('day_offset', targetOffsets)

  if (error) {
    return false
  }

  const existingByOffset = new Map(
    (existingRows ?? []).map((row) => [Number(row.day_offset), row])
  )

  return mappings.every((mapping) => {
    const existing = existingByOffset.get(mapping.targetOffset)
    if (!existing) return false

    return matchesProgramWorkoutCopy(mapping.source, existing)
  })
}

function formatBlockedProgramDays(blockedOffsets: number[]): string {
  const labels = Array.from(
    new Set(
      blockedOffsets
        .filter((offset) => Number.isFinite(offset))
        .map((offset) => formatProgramDayLabel(offset))
    )
  )

  if (labels.length === 0) {
    return ''
  }

  return ` Blocked days: ${labels.join(', ')}.`
}

async function safeAfterProgramCalendarChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  programId: string
) {
  try {
    await afterProgramCalendarChange(supabase, coachId, programId)
  } catch {
    revalidateProgramCalendar(programId)
  }
}

export async function copyProgramWeekToWeek(
  programId: string,
  sourceWeekIndex: number,
  targetWeekIndex: number
): Promise<CopyProgramWorkoutRangeResult> {
  const parsedSource = z.number().int().min(0).max(52).safeParse(sourceWeekIndex)
  const parsedTarget = z.number().int().min(0).max(52).safeParse(targetWeekIndex)

  if (!parsedSource.success || !parsedTarget.success) {
    return { success: false, error: 'Invalid week.' }
  }

  if (parsedSource.data === parsedTarget.data) {
    return {
      success: false,
      error: 'Choose a different week than the source week.',
    }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx
  const sourceWorkouts = await fetchProgramWeekWorkoutsWithExercises(
    supabase,
    programId,
    parsedSource.data
  )

  const result = await copyProgramWeekWorkoutsToTargetWeek(
    supabase,
    user.id,
    programId,
    parsedSource.data,
    parsedTarget.data,
    sourceWorkouts
  )

  if ('error' in result) {
    return { success: false, error: result.error }
  }

  if (result.copiedCount === 0 && result.skippedCount === 0) {
    return {
      success: false,
      error: 'No workouts scheduled in this week to copy.',
    }
  }

  if (result.copiedCount === 0) {
    const alreadyCopied = await targetWeekAlreadyHasCopiedWorkouts(
      supabase,
      programId,
      sourceWorkouts,
      parsedSource.data,
      parsedTarget.data
    )

    if (alreadyCopied) {
      revalidateProgramCalendar(programId)
      return {
        success: true,
        copiedCount: 0,
        skippedCount: result.skippedCount,
      }
    }

    const blockedMessage = formatBlockedProgramDays(result.blockedOffsets)
    return {
      success: false,
      error:
        `Could not copy workouts to ${formatProgramWeekLabel(parsedTarget.data)}.` +
        (blockedMessage ||
          ' Every matching day already has a workout scheduled.'),
    }
  }

  await safeAfterProgramCalendarChange(supabase, user.id, programId)
  return {
    success: true,
    copiedCount: result.copiedCount,
    skippedCount: result.skippedCount,
  }
}

export async function copyProgramWeekToWeekRange(
  programId: string,
  sourceWeekIndex: number,
  startWeekIndex: number,
  endWeekIndex: number
): Promise<CopyProgramWorkoutRangeResult> {
  const parsed = copyProgramWeekRangeSchema.safeParse({
    sourceWeekIndex,
    startWeekIndex,
    endWeekIndex,
  })

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid copy settings.',
    }
  }

  if (parsed.data.endWeekIndex - parsed.data.startWeekIndex + 1 > MAX_COPY_WEEK_RANGE) {
    return {
      success: false,
      error: `Choose a range of ${MAX_COPY_WEEK_RANGE} weeks or fewer.`,
    }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { supabase, user } = ctx
  const sourceWorkouts = await fetchProgramWeekWorkoutsWithExercises(
    supabase,
    programId,
    parsed.data.sourceWeekIndex
  )

  let copiedCount = 0
  let skippedCount = 0
  const blockedOffsets: number[] = []

  for (
    let targetWeekIndex = parsed.data.startWeekIndex;
    targetWeekIndex <= parsed.data.endWeekIndex;
    targetWeekIndex++
  ) {
    if (targetWeekIndex === parsed.data.sourceWeekIndex) continue

    const result = await copyProgramWeekWorkoutsToTargetWeek(
      supabase,
      user.id,
      programId,
      parsed.data.sourceWeekIndex,
      targetWeekIndex,
      sourceWorkouts
    )

    if ('error' in result) {
      return { success: false, error: result.error }
    }

    copiedCount += result.copiedCount
    skippedCount += result.skippedCount
    blockedOffsets.push(...result.blockedOffsets)
  }

  if (copiedCount === 0 && skippedCount === 0) {
    return {
      success: false,
      error: 'No workouts scheduled in this week to copy.',
    }
  }

  if (copiedCount === 0) {
    const blockedMessage = formatBlockedProgramDays(blockedOffsets)
    return {
      success: false,
      error:
        'Could not copy workouts to the selected weeks.' +
        (blockedMessage ||
          ' Every matching day already has a workout scheduled.'),
    }
  }

  await safeAfterProgramCalendarChange(supabase, user.id, programId)
  return {
    success: true,
    copiedCount,
    skippedCount,
  }
}
