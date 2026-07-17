'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getMatchingDatesInRange, getMonthDateRange } from '@/lib/calendar'
import {
  buildOrderedIdsAfterInsert,
  type OrderedExerciseRow,
} from '@/lib/workout-exercise-order'
import { requireTeamAccess } from '@/lib/gym-access'
import {
  materializeTeamCalendarToClient,
  removeTeamWorkoutFromMembers,
  syncTeamWorkoutToMembers,
} from '@/lib/team-calendar-sync'
import { createClient } from '@/lib/supabase/server'
import {
  copyWorkoutRangeSchema,
  dateKeySchema,
  prescriptionValuesToDbRow,
  scheduledExerciseFormSchema,
  scheduledExerciseUpdateSchema,
  scheduledWorkoutFormSchema,
  type ScheduledExerciseFormValues,
  type ScheduledExerciseUpdateValues,
  type ScheduledWorkoutFormValues,
} from '@/lib/validations/calendar'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
  ScheduledExerciseBlock,
  ScheduledExerciseRepMode,
  ScheduledExerciseTrackingOptions,
  ScheduledWorkoutExerciseWithDetails,
  TeamScheduledWorkoutWithExercises,
} from 'app/types/database'
import {
  getSchedulableWorkoutTemplates as getClientSchedulableWorkoutTemplates,
  type CreateScheduledWorkoutResult,
  type SchedulableWorkoutTemplatesResult,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'

export type ActionResult = { success: true } | { success: false; error: string }

export type CalendarMonthData = {
  days: CalendarDaySummary[]
  selectedWorkout: ClientScheduledWorkoutWithExercises | null
}

async function getTeamForCoach(teamId: string) {
  const access = await requireTeamAccess(teamId)
  if (!access) {
    return { supabase: null, user: null, team: null, error: 'Team not found.' as const }
  }
  return {
    supabase: access.supabase,
    user: access.user,
    team: access.team,
    error: null,
  }
}

function revalidateTeamCalendar(teamId: string, clientIds: string[] = []) {
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/teams')
  revalidatePath('/portal', 'layout')
  for (const clientId of clientIds) {
    revalidatePath(`/clients/${clientId}`)
  }
}

function mapTeamWorkoutToClientShape(
  workout: TeamScheduledWorkoutWithExercises
): ClientScheduledWorkoutWithExercises {
  return {
    id: workout.id,
    coach_id: workout.coach_id,
    client_id: workout.team_id,
    scheduled_date: workout.scheduled_date,
    name: workout.name,
    notes: workout.notes,
    library_workout_id: workout.library_workout_id,
    team_scheduled_workout_id: workout.id,
    status: 'scheduled',
    started_at: null,
    completed_at: null,
    created_at: workout.created_at,
    updated_at: workout.updated_at,
    exercises: workout.exercises.map(
      (row): ScheduledWorkoutExerciseWithDetails => ({
        id: row.id,
        scheduled_workout_id: workout.id,
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
      })
    ),
  }
}

async function fetchTeamWorkoutExerciseRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<OrderedExerciseRow[]> {
  const { data, error } = await supabase
    .from('team_scheduled_workout_exercises')
    .select('id, sort_order, exercise_block, superset_group')
    .eq('team_scheduled_workout_id', workoutId)
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

async function applyTeamExerciseSortOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderedIds: string[]
): Promise<ActionResult> {
  for (let index = 0; index < orderedIds.length; index++) {
    const id = orderedIds[index]
    const { error } = await supabase
      .from('team_scheduled_workout_exercises')
      .update({ sort_order: index })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

async function fetchTeamWorkoutWithExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<TeamScheduledWorkoutWithExercises | null> {
  const { data, error } = await supabase
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
    .eq('id', workoutId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const exercises = (data.exercises ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    ...data,
    exercises,
  } as TeamScheduledWorkoutWithExercises
}

const LIBRARY_TEMPLATE_EXERCISE_SELECT =
  'exercise_id, sort_order, sets, reps, prescription, superset_group, exercise_block, workout_notes, rep_mode, each_side, tempo, rest_seconds, weight_percent, rpe_target, tracking_options'

type LibraryTemplateExerciseRow = {
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

function mapTemplateExerciseToTeamInsert(
  teamScheduledWorkoutId: string,
  row: LibraryTemplateExerciseRow
) {
  return {
    team_scheduled_workout_id: teamScheduledWorkoutId,
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
  }
}

function toTeamExerciseDbRow(
  values: ScheduledExerciseFormValues | ScheduledExerciseUpdateValues
) {
  const { target_weight: _targetWeight, ...row } = prescriptionValuesToDbRow(values)
  return row
}

async function fetchLibraryWorkoutTemplateExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  libraryWorkoutId: string
): Promise<LibraryTemplateExerciseRow[]> {
  const { data: programWorkouts } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('coach_id', coachId)
    .eq('library_workout_id', libraryWorkoutId)
    .order('updated_at', { ascending: false })

  for (const programWorkout of programWorkouts ?? []) {
    const { data: exercises, error } = await supabase
      .from('program_scheduled_workout_exercises')
      .select(LIBRARY_TEMPLATE_EXERCISE_SELECT)
      .eq('program_scheduled_workout_id', programWorkout.id)
      .order('sort_order', { ascending: true })

    if (error) {
      if (error.message.includes('Could not find the table')) {
        break
      }
      continue
    }

    if (exercises?.length) {
      return exercises as LibraryTemplateExerciseRow[]
    }
  }

  const { data: clientWorkouts } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('coach_id', coachId)
    .eq('library_workout_id', libraryWorkoutId)
    .order('updated_at', { ascending: false })
    .limit(10)

  for (const clientWorkout of clientWorkouts ?? []) {
    const { data: exercises } = await supabase
      .from('scheduled_workout_exercises')
      .select(LIBRARY_TEMPLATE_EXERCISE_SELECT)
      .eq('scheduled_workout_id', clientWorkout.id)
      .order('sort_order', { ascending: true })

    if (exercises?.length) {
      return exercises as LibraryTemplateExerciseRow[]
    }
  }

  return []
}

async function copyLibraryWorkoutExercisesToTeamWorkout(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  libraryWorkoutId: string,
  teamScheduledWorkoutId: string
): Promise<ActionResult> {
  const templateExercises = await fetchLibraryWorkoutTemplateExercises(
    supabase,
    coachId,
    libraryWorkoutId
  )

  if (templateExercises.length === 0) {
    return { success: true }
  }

  const { error } = await supabase.from('team_scheduled_workout_exercises').insert(
    templateExercises.map((row) =>
      mapTemplateExerciseToTeamInsert(teamScheduledWorkoutId, row)
    )
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

async function afterTeamWorkoutChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  teamId: string,
  teamWorkoutId: string
) {
  const clientIds = await syncTeamWorkoutToMembers(
    supabase,
    coachId,
    teamId,
    teamWorkoutId
  )
  revalidateTeamCalendar(teamId, clientIds)
}

export async function getTeamWorkoutWithExercises(
  teamId: string,
  workoutId: string
): Promise<
  | { success: true; workout: ClientScheduledWorkoutWithExercises }
  | { success: false; error: string }
> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.team) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { data: ownedWorkout, error: workoutError } = await ctx.supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (workoutError || !ownedWorkout) {
    return { success: false, error: 'Workout not found.' }
  }

  const workout = await fetchTeamWorkoutWithExercises(ctx.supabase, workoutId)
  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  return { success: true, workout: mapTeamWorkoutToClientShape(workout) }
}

export async function getTeamCalendarMonthSummaries(
  teamId: string,
  year: number,
  month: number
): Promise<
  | { success: true; days: CalendarDaySummary[] }
  | { success: false; error: string }
> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { start, end } = getMonthDateRange(year, month)
  const { data: days, error: daysError } = await ctx.supabase
    .from('team_scheduled_workouts')
    .select('id, scheduled_date, name, created_at')
    .eq('team_id', teamId)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (daysError) {
    return { success: false, error: daysError.message }
  }

  return {
    success: true,
    days: (days ?? []).map((day) => ({
      id: day.id,
      scheduled_date: day.scheduled_date,
      name: day.name,
      status: 'scheduled' as const,
      started_at: null,
    })),
  }
}

export async function getTeamCalendarMonthData(
  teamId: string,
  year: number,
  month: number,
  selectedDate: string
): Promise<
  | { success: true; data: CalendarMonthData }
  | { success: false; error: string }
> {
  const parsedDate = dateKeySchema.safeParse(selectedDate)
  if (!parsedDate.success) {
    return { success: false, error: 'Invalid date.' }
  }

  const summariesResult = await getTeamCalendarMonthSummaries(teamId, year, month)
  if (!summariesResult.success) {
    return summariesResult
  }

  const selectedSummary = summariesResult.days.find(
    (day) => day.scheduled_date === parsedDate.data
  )

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selectedSummary) {
    const workoutResult = await getTeamWorkoutWithExercises(
      teamId,
      selectedSummary.id
    )
    if (workoutResult.success) {
      selectedWorkout = workoutResult.workout
    }
  }

  return {
    success: true,
    data: {
      days: summariesResult.days,
      selectedWorkout,
    },
  }
}

export async function getSchedulableWorkoutTemplates(): Promise<SchedulableWorkoutTemplatesResult> {
  return getClientSchedulableWorkoutTemplates()
}

export async function scheduleProgramWorkoutTemplateToDate(
  teamId: string,
  programScheduledWorkoutId: string,
  scheduledDate: string
): Promise<CreateScheduledWorkoutResult> {
  const parsedDate = dateKeySchema.safeParse(scheduledDate)
  if (!parsedDate.success) {
    return { success: false, error: 'Invalid date.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data: programWorkout, error: programWorkoutError } = await supabase
    .from('program_scheduled_workouts')
    .select('id, name, notes, library_workout_id')
    .eq('id', programScheduledWorkoutId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (programWorkoutError || !programWorkout) {
    return { success: false, error: 'Program workout template not found.' }
  }

  const { data: programExercises, error: exercisesError } = await supabase
    .from('program_scheduled_workout_exercises')
    .select(LIBRARY_TEMPLATE_EXERCISE_SELECT)
    .eq('program_scheduled_workout_id', programWorkout.id)
    .order('sort_order', { ascending: true })

  if (exercisesError) {
    return { success: false, error: exercisesError.message }
  }

  const { data: created, error: createError } = await supabase
    .from('team_scheduled_workouts')
    .insert({
      coach_id: user.id,
      team_id: teamId,
      scheduled_date: parsedDate.data,
      name: programWorkout.name,
      notes: programWorkout.notes,
      library_workout_id: programWorkout.library_workout_id,
    })
    .select('id')
    .single()

  if (createError || !created) {
    return {
      success: false,
      error: createError?.message ?? 'Could not schedule workout.',
    }
  }

  if (programExercises?.length) {
    const { error: insertError } = await supabase
      .from('team_scheduled_workout_exercises')
      .insert(
        programExercises.map((row) =>
          mapTemplateExerciseToTeamInsert(
            created.id,
            row as LibraryTemplateExerciseRow
          )
        )
      )

    if (insertError) {
      await supabase.from('team_scheduled_workouts').delete().eq('id', created.id)
      return { success: false, error: insertError.message }
    }
  }

  try {
    await afterTeamWorkoutChange(supabase, user.id, teamId, created.id)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not sync to members.',
    }
  }

  return { success: true, workoutId: created.id }
}

export async function createScheduledWorkout(
  teamId: string,
  scheduledDate: string,
  values: ScheduledWorkoutFormValues,
  libraryWorkoutId?: string | null
): Promise<CreateScheduledWorkoutResult> {
  const parsedDate = dateKeySchema.safeParse(scheduledDate)
  if (!parsedDate.success) {
    return { success: false, error: 'Invalid date.' }
  }

  const parsed = scheduledWorkoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from('team_scheduled_workouts')
    .insert({
      coach_id: user.id,
      team_id: teamId,
      scheduled_date: parsedDate.data,
      name: parsed.data.name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      library_workout_id: libraryWorkoutId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  if (libraryWorkoutId) {
    const copyResult = await copyLibraryWorkoutExercisesToTeamWorkout(
      supabase,
      user.id,
      libraryWorkoutId,
      data.id
    )
    if (!copyResult.success) {
      return copyResult
    }
  }

  try {
    await afterTeamWorkoutChange(supabase, user.id, teamId, data.id)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true, workoutId: data.id }
}

export async function updateScheduledWorkout(
  teamId: string,
  workoutId: string,
  values: ScheduledWorkoutFormValues
): Promise<ActionResult> {
  const parsed = scheduledWorkoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx
  const { error } = await supabase
    .from('team_scheduled_workouts')
    .update({
      name: parsed.data.name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    })
    .eq('id', workoutId)
    .eq('team_id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await afterTeamWorkoutChange(supabase, user.id, teamId, workoutId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true }
}

export async function deleteScheduledWorkout(
  teamId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase } = ctx

  let clientIds: string[] = []
  try {
    clientIds = await removeTeamWorkoutFromMembers(supabase, workoutId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not remove from members.',
    }
  }

  const { error } = await supabase
    .from('team_scheduled_workouts')
    .delete()
    .eq('id', workoutId)
    .eq('team_id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeamCalendar(teamId, clientIds)
  return { success: true }
}

export async function addScheduledExercise(
  teamId: string,
  workoutId: string,
  values: ScheduledExerciseFormValues
): Promise<ActionResult> {
  const parsed = scheduledExerciseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data: workout, error: workoutError } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('team_id', teamId)
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

  const existingRows = await fetchTeamWorkoutExerciseRows(supabase, workoutId)
  const dbRow = toTeamExerciseDbRow(parsed.data)
  const newBlock = dbRow.exercise_block

  const { data: inserted, error: insertError } = await supabase
    .from('team_scheduled_workout_exercises')
    .insert({
      team_scheduled_workout_id: workoutId,
      exercise_id: parsed.data.exerciseId,
      sort_order: existingRows.length,
      ...dbRow,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return {
      success: false,
      error: insertError?.message ?? 'Could not add exercise.',
    }
  }

  const orderedIds = buildOrderedIdsAfterInsert(
    existingRows,
    inserted.id,
    newBlock,
    { newSupersetGroup: dbRow.superset_group }
  )
  const orderResult = await applyTeamExerciseSortOrders(supabase, orderedIds)
  if (!orderResult.success) {
    return orderResult
  }

  try {
    await afterTeamWorkoutChange(supabase, user.id, teamId, workoutId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true }
}

export async function updateScheduledExercise(
  teamId: string,
  exerciseRowId: string,
  values: ScheduledExerciseUpdateValues
): Promise<ActionResult> {
  const parsed = scheduledExerciseUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data: row, error: rowError } = await supabase
    .from('team_scheduled_workout_exercises')
    .select('id, team_scheduled_workout_id, exercise_block, superset_group')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise row not found.' }
  }

  const { data: workout } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('id', row.team_scheduled_workout_id)
    .eq('team_id', teamId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const dbRow = toTeamExerciseDbRow(parsed.data)
  const newBlock = dbRow.exercise_block
  const blockChanged = row.exercise_block !== newBlock
  const supersetGroupChanged = row.superset_group !== dbRow.superset_group

  const { error } = await supabase
    .from('team_scheduled_workout_exercises')
    .update(dbRow)
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (blockChanged || supersetGroupChanged) {
    const existingRows = await fetchTeamWorkoutExerciseRows(
      supabase,
      row.team_scheduled_workout_id
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
    const orderResult = await applyTeamExerciseSortOrders(supabase, orderedIds)
    if (!orderResult.success) {
      return orderResult
    }
  }

  try {
    await afterTeamWorkoutChange(
      supabase,
      user.id,
      teamId,
      row.team_scheduled_workout_id
    )
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true }
}

export async function replaceScheduledExercise(
  teamId: string,
  exerciseRowId: string,
  newExerciseId: string
): Promise<ActionResult> {
  const exerciseIdParsed = z.string().uuid().safeParse(newExerciseId)
  if (!exerciseIdParsed.success) {
    return { success: false, error: 'Select a valid exercise.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data: row, error: rowError } = await supabase
    .from('team_scheduled_workout_exercises')
    .select('id, team_scheduled_workout_id, exercise_id')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise row not found.' }
  }

  if (row.exercise_id === exerciseIdParsed.data) {
    return { success: true }
  }

  const { data: workout } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('id', row.team_scheduled_workout_id)
    .eq('team_id', teamId)
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
    .from('team_scheduled_workout_exercises')
    .update({ exercise_id: exerciseIdParsed.data })
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await afterTeamWorkoutChange(
      supabase,
      user.id,
      teamId,
      row.team_scheduled_workout_id
    )
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true }
}

export async function removeScheduledExercise(
  teamId: string,
  exerciseRowId: string
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data: row, error: rowError } = await supabase
    .from('team_scheduled_workout_exercises')
    .select('id, team_scheduled_workout_id')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise row not found.' }
  }

  const { data: workout } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('id', row.team_scheduled_workout_id)
    .eq('team_id', teamId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const { error } = await supabase
    .from('team_scheduled_workout_exercises')
    .delete()
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await afterTeamWorkoutChange(
      supabase,
      user.id,
      teamId,
      row.team_scheduled_workout_id
    )
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true }
}

export async function reorderScheduledExercises(
  teamId: string,
  workoutId: string,
  orderedRowIds: string[]
): Promise<ActionResult> {
  if (orderedRowIds.length === 0) {
    return { success: true }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx

  const { data: workout } = await supabase
    .from('team_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const existingRows = await fetchTeamWorkoutExerciseRows(supabase, workoutId)
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

  const orderResult = await applyTeamExerciseSortOrders(supabase, orderedRowIds)
  if (!orderResult.success) {
    return orderResult
  }

  try {
    await afterTeamWorkoutChange(supabase, user.id, teamId, workoutId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true }
}

export async function copyScheduledWorkoutToDate(
  teamId: string,
  workoutId: string,
  targetDate: string
): Promise<CreateScheduledWorkoutResult> {
  const parsedDate = dateKeySchema.safeParse(targetDate)
  if (!parsedDate.success) {
    return { success: false, error: 'Invalid date.' }
  }

  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  const { supabase, user } = ctx
  const source = await fetchTeamWorkoutWithExercises(supabase, workoutId)
  if (!source || source.team_id !== teamId) {
    return { success: false, error: 'Workout not found.' }
  }

  const { data: created, error } = await supabase
    .from('team_scheduled_workouts')
    .insert({
      coach_id: user.id,
      team_id: teamId,
      scheduled_date: parsedDate.data,
      name: source.name,
      notes: source.notes,
      library_workout_id: source.library_workout_id,
    })
    .select('id')
    .single()

  if (error || !created) {
    return { success: false, error: error?.message ?? 'Could not copy workout.' }
  }

  if (source.exercises.length > 0) {
    const { error: insertError } = await supabase
      .from('team_scheduled_workout_exercises')
      .insert(
        source.exercises.map((row) => ({
          team_scheduled_workout_id: created.id,
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
      )

    if (insertError) {
      await supabase.from('team_scheduled_workouts').delete().eq('id', created.id)
      return { success: false, error: insertError.message }
    }
  }

  try {
    await afterTeamWorkoutChange(supabase, user.id, teamId, created.id)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not sync to members.',
    }
  }

  return { success: true, workoutId: created.id }
}

export async function copyScheduledWorkoutToDateRange(
  teamId: string,
  workoutId: string,
  startDate: string,
  endDate: string,
  weekdays: number[]
): Promise<
  | { success: true; copiedCount: number; skippedCount: number }
  | { success: false; error: string }
> {
  const parsed = copyWorkoutRangeSchema.safeParse({
    startDate,
    endDate,
    weekdays,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid copy settings.',
    }
  }

  const sourceResult = await getTeamWorkoutWithExercises(teamId, workoutId)
  if (!sourceResult.success) {
    return sourceResult
  }

  const dates = getMatchingDatesInRange(
    parsed.data.startDate,
    parsed.data.endDate,
    parsed.data.weekdays
  ).filter((date) => date !== sourceResult.workout.scheduled_date)

  let copiedCount = 0
  let skippedCount = 0

  for (const date of dates) {
    const result = await copyScheduledWorkoutToDate(teamId, workoutId, date)
    if (result.success) {
      copiedCount += 1
    } else {
      skippedCount += 1
    }
  }

  return { success: true, copiedCount, skippedCount }
}

export async function materializeTeamCalendarForMember(
  teamId: string,
  clientId: string
): Promise<ActionResult> {
  const ctx = await getTeamForCoach(teamId)
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return { success: false, error: ctx.error ?? 'Team not found.' }
  }

  try {
    await materializeTeamCalendarToClient(
      ctx.supabase,
      ctx.user.id,
      teamId,
      clientId
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not sync calendar.',
    }
  }

  revalidateTeamCalendar(teamId, [clientId])
  return { success: true }
}
