'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getMatchingDatesInRange, getMonthDateRange } from '@/lib/calendar'
import {
  buildOrderedIdsAfterInsert,
  type OrderedExerciseRow,
} from '@/lib/workout-exercise-order'
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
  ScheduledWorkoutStatus,
} from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateScheduledWorkoutResult =
  | { success: true; workoutId: string }
  | { success: false; error: string }

export type CopyScheduledWorkoutRangeResult =
  | { success: true; copiedCount: number; skippedCount: number }
  | { success: false; error: string }

export type CalendarMonthData = {
  days: CalendarDaySummary[]
  selectedWorkout: ClientScheduledWorkoutWithExercises | null
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

async function requireClient(clientId: string) {
  const { supabase, user } = await requireUser()
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  return { supabase, user, client }
}

function revalidateClientCalendar(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal', 'layout')
}

async function fetchWorkoutExerciseRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<OrderedExerciseRow[]> {
  const { data, error } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, sort_order, exercise_block')
    .eq('scheduled_workout_id', workoutId)
    .order('sort_order', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    id: row.id,
    sort_order: row.sort_order,
    exercise_block: row.exercise_block as ScheduledExerciseBlock | null,
  }))
}

async function applyExerciseSortOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderedIds: string[]
): Promise<ActionResult> {
  for (let index = 0; index < orderedIds.length; index++) {
    const id = orderedIds[index]
    const { error } = await supabase
      .from('scheduled_workout_exercises')
      .update({ sort_order: index })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

async function fetchWorkoutWithExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<ClientScheduledWorkoutWithExercises | null> {
  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select(
      `
      *,
      exercises:scheduled_workout_exercises(
        *,
        exercise:exercises(id, name, muscle_group, equipment, external_id, image_url, instructions)
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
  } as ClientScheduledWorkoutWithExercises
}

export async function getCalendarMonthData(
  clientId: string,
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

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { start, end } = getMonthDateRange(year, month)

  const [{ data: days, error: daysError }, { data: selected, error: selectedError }] =
    await Promise.all([
      supabase
        .from('client_scheduled_workouts')
        .select('id, scheduled_date, name, status, started_at')
        .eq('client_id', clientId)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date', { ascending: true }),
      supabase
        .from('client_scheduled_workouts')
        .select('id')
        .eq('client_id', clientId)
        .eq('scheduled_date', parsedDate.data)
        .maybeSingle(),
    ])

  if (daysError) {
    return { success: false, error: daysError.message }
  }
  if (selectedError) {
    return { success: false, error: selectedError.message }
  }

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selected) {
    selectedWorkout = await fetchWorkoutWithExercises(supabase, selected.id)
  }

  return {
    success: true,
    data: {
      days: (days ?? []) as CalendarDaySummary[],
      selectedWorkout,
    },
  }
}

export async function createScheduledWorkout(
  clientId: string,
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

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx

  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .insert({
      coach_id: user.id,
      client_id: clientId,
      scheduled_date: parsedDate.data,
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
        error: 'This client already has a workout on that date.',
      }
    }
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true, workoutId: data.id }
}

export async function updateScheduledWorkout(
  clientId: string,
  workoutId: string,
  values: ScheduledWorkoutFormValues
): Promise<ActionResult> {
  const parsed = scheduledWorkoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      name: parsed.data.name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    })
    .eq('id', workoutId)
    .eq('client_id', clientId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function setScheduledWorkoutStatus(
  clientId: string,
  workoutId: string,
  status: ScheduledWorkoutStatus
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({ status })
    .eq('id', workoutId)
    .eq('client_id', clientId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function deleteScheduledWorkout(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { error } = await supabase
    .from('client_scheduled_workouts')
    .delete()
    .eq('id', workoutId)
    .eq('client_id', clientId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function addScheduledExercise(
  clientId: string,
  workoutId: string,
  values: ScheduledExerciseFormValues
): Promise<ActionResult> {
  const parsed = scheduledExerciseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx

  const { data: workout, error: workoutError } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('client_id', clientId)
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

  const existingRows = await fetchWorkoutExerciseRows(supabase, workoutId)
  const dbRow = prescriptionValuesToDbRow(parsed.data)
  const newBlock = dbRow.exercise_block

  const { data: inserted, error: insertError } = await supabase
    .from('scheduled_workout_exercises')
    .insert({
      scheduled_workout_id: workoutId,
      exercise_id: parsed.data.exerciseId,
      sort_order: existingRows.length,
      ...dbRow,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return { success: false, error: insertError?.message ?? 'Could not add exercise.' }
  }

  const orderedIds = buildOrderedIdsAfterInsert(
    existingRows,
    inserted.id,
    newBlock
  )
  const orderResult = await applyExerciseSortOrders(supabase, orderedIds)
  if (!orderResult.success) {
    return orderResult
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function updateScheduledExercise(
  clientId: string,
  exerciseRowId: string,
  values: ScheduledExerciseUpdateValues
): Promise<ActionResult> {
  const parsed = scheduledExerciseUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx

  const { data: row, error: rowError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout_id, exercise_block')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise row not found.' }
  }

  const { data: workout } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', row.scheduled_workout_id)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const dbRow = prescriptionValuesToDbRow(parsed.data)
  const newBlock = dbRow.exercise_block
  const blockChanged = row.exercise_block !== newBlock

  const { error } = await supabase
    .from('scheduled_workout_exercises')
    .update(dbRow)
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (blockChanged) {
    const existingRows = await fetchWorkoutExerciseRows(
      supabase,
      row.scheduled_workout_id
    )
    const orderedIds = buildOrderedIdsAfterInsert(
      existingRows,
      exerciseRowId,
      newBlock,
      exerciseRowId
    )
    const orderResult = await applyExerciseSortOrders(supabase, orderedIds)
    if (!orderResult.success) {
      return orderResult
    }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function replaceScheduledExercise(
  clientId: string,
  exerciseRowId: string,
  newExerciseId: string
): Promise<ActionResult> {
  const exerciseIdParsed = z.string().uuid().safeParse(newExerciseId)
  if (!exerciseIdParsed.success) {
    return { success: false, error: 'Select a valid exercise.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx

  const { data: row, error: rowError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout_id, exercise_id')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise row not found.' }
  }

  if (row.exercise_id === exerciseIdParsed.data) {
    return { success: true }
  }

  const { data: workout } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', row.scheduled_workout_id)
    .eq('client_id', clientId)
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

  const { error: clearLogError } = await supabase
    .from('workout_log_sets')
    .delete()
    .eq('scheduled_exercise_id', exerciseRowId)

  if (clearLogError) {
    return { success: false, error: clearLogError.message }
  }

  const { error } = await supabase
    .from('scheduled_workout_exercises')
    .update({ exercise_id: exerciseIdParsed.data })
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function removeScheduledExercise(
  clientId: string,
  exerciseRowId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx

  const { data: row, error: rowError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout_id')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise row not found.' }
  }

  const { data: workout } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', row.scheduled_workout_id)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const { error } = await supabase
    .from('scheduled_workout_exercises')
    .delete()
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function reorderScheduledExercises(
  clientId: string,
  workoutId: string,
  orderedRowIds: string[]
): Promise<ActionResult> {
  if (orderedRowIds.length === 0) {
    return { success: true }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx

  const { data: workout } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const existingRows = await fetchWorkoutExerciseRows(supabase, workoutId)
  if (existingRows.length !== orderedRowIds.length) {
    return { success: false, error: 'Exercise list is out of date. Refresh and try again.' }
  }

  const existingIds = new Set(existingRows.map((row) => row.id))
  const uniqueOrdered = new Set(orderedRowIds)
  if (
    uniqueOrdered.size !== orderedRowIds.length ||
    orderedRowIds.some((id) => !existingIds.has(id))
  ) {
    return { success: false, error: 'Invalid exercise order.' }
  }

  const orderResult = await applyExerciseSortOrders(supabase, orderedRowIds)
  if (!orderResult.success) {
    return orderResult
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function moveScheduledExercise(
  clientId: string,
  exerciseRowId: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx

  const { data: current, error: currentError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout_id, sort_order')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (currentError || !current) {
    return { success: false, error: 'Exercise row not found.' }
  }

  const { data: workout } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('id', current.scheduled_workout_id)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!workout) {
    return { success: false, error: 'Workout not found.' }
  }

  const neighborQuery = supabase
    .from('scheduled_workout_exercises')
    .select('id, sort_order')
    .eq('scheduled_workout_id', current.scheduled_workout_id)

  const { data: neighbor, error: neighborError } =
    direction === 'up'
      ? await neighborQuery
          .lt('sort_order', current.sort_order)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborQuery
          .gt('sort_order', current.sort_order)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()

  if (neighborError) {
    return { success: false, error: neighborError.message }
  }
  if (!neighbor) {
    return { success: true }
  }

  const currentOrder = current.sort_order
  const neighborOrder = neighbor.sort_order

  const { error: firstError } = await supabase
    .from('scheduled_workout_exercises')
    .update({ sort_order: -1 })
    .eq('id', current.id)

  if (firstError) {
    return { success: false, error: firstError.message }
  }

  const { error: secondError } = await supabase
    .from('scheduled_workout_exercises')
    .update({ sort_order: currentOrder })
    .eq('id', neighbor.id)

  if (secondError) {
    return { success: false, error: secondError.message }
  }

  const { error: thirdError } = await supabase
    .from('scheduled_workout_exercises')
    .update({ sort_order: neighborOrder })
    .eq('id', current.id)

  if (thirdError) {
    return { success: false, error: thirdError.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function copyScheduledWorkoutToDate(
  clientId: string,
  sourceWorkoutId: string,
  targetDate: string
): Promise<CreateScheduledWorkoutResult> {
  const parsedDate = dateKeySchema.safeParse(targetDate)
  if (!parsedDate.success) {
    return { success: false, error: 'Invalid date.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx

  const source = await fetchWorkoutWithExercises(supabase, sourceWorkoutId)
  if (!source || source.client_id !== clientId) {
    return { success: false, error: 'Source workout not found.' }
  }

  const { data: created, error: createError } = await supabase
    .from('client_scheduled_workouts')
    .insert({
      coach_id: user.id,
      client_id: clientId,
      scheduled_date: parsedDate.data,
      name: source.name,
      notes: source.notes,
      library_workout_id: source.library_workout_id,
    })
    .select('id')
    .single()

  if (createError) {
    if (createError.code === '23505') {
      return {
        success: false,
        error: 'This client already has a workout on that date.',
      }
    }
    return { success: false, error: createError.message }
  }

  if (source.exercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from('scheduled_workout_exercises')
      .insert(
        source.exercises.map((row) => ({
          scheduled_workout_id: created.id,
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
          tracking_options: row.tracking_options,
        }))
      )

    if (exercisesError) {
      await supabase
        .from('client_scheduled_workouts')
        .delete()
        .eq('id', created.id)
      return { success: false, error: exercisesError.message }
    }
  }

  revalidateClientCalendar(clientId)
  return { success: true, workoutId: created.id }
}

const MAX_COPY_RANGE_DAYS = 366

export async function copyScheduledWorkoutToDateRange(
  clientId: string,
  sourceWorkoutId: string,
  startDate: string,
  endDate: string,
  weekdays: number[]
): Promise<CopyScheduledWorkoutRangeResult> {
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

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx

  const source = await fetchWorkoutWithExercises(supabase, sourceWorkoutId)
  if (!source || source.client_id !== clientId) {
    return { success: false, error: 'Source workout not found.' }
  }

  const candidateDates = getMatchingDatesInRange(
    parsed.data.startDate,
    parsed.data.endDate,
    parsed.data.weekdays,
    { excludeDates: [source.scheduled_date] }
  )

  if (candidateDates.length === 0) {
    return {
      success: false,
      error: 'No matching dates in this range. Adjust the dates or days of the week.',
    }
  }

  if (candidateDates.length > MAX_COPY_RANGE_DAYS) {
    return {
      success: false,
      error: `Choose a range of ${MAX_COPY_RANGE_DAYS} days or fewer.`,
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('client_scheduled_workouts')
    .select('scheduled_date')
    .eq('client_id', clientId)
    .gte('scheduled_date', parsed.data.startDate)
    .lte('scheduled_date', parsed.data.endDate)

  if (existingError) {
    return { success: false, error: existingError.message }
  }

  const occupiedDates = new Set(
    (existingRows ?? []).map((row) => row.scheduled_date as string)
  )
  const targetDates = candidateDates.filter((date) => !occupiedDates.has(date))
  const skippedCount = candidateDates.length - targetDates.length

  if (targetDates.length === 0) {
    return {
      success: false,
      error: 'Every matching date already has a workout scheduled.',
    }
  }

  const { data: createdWorkouts, error: createError } = await supabase
    .from('client_scheduled_workouts')
    .insert(
      targetDates.map((scheduledDate) => ({
        coach_id: user.id,
        client_id: clientId,
        scheduled_date: scheduledDate,
        name: source.name,
        notes: source.notes,
        library_workout_id: source.library_workout_id,
      }))
    )
    .select('id')

  if (createError || !createdWorkouts) {
    return { success: false, error: createError?.message ?? 'Could not copy workout.' }
  }

  if (source.exercises.length > 0) {
    const exerciseRows = createdWorkouts.flatMap((created) =>
      source.exercises.map((row) => ({
        scheduled_workout_id: created.id,
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
        tracking_options: row.tracking_options,
      }))
    )

    const { error: exercisesError } = await supabase
      .from('scheduled_workout_exercises')
      .insert(exerciseRows)

    if (exercisesError) {
      await supabase
        .from('client_scheduled_workouts')
        .delete()
        .in(
          'id',
          createdWorkouts.map((row) => row.id)
        )
      return { success: false, error: exercisesError.message }
    }
  }

  revalidateClientCalendar(clientId)
  return {
    success: true,
    copiedCount: targetDates.length,
    skippedCount,
  }
}
