'use server'

import { revalidatePath } from 'next/cache'

import { getMonthDateRange } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/server'
import {
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
  ScheduledWorkoutStatus,
} from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateScheduledWorkoutResult =
  | { success: true; workoutId: string }
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
  revalidatePath('/portal')
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
        exercise:exercises(id, name, muscle_group, equipment)
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
        .select('id, scheduled_date, name, status')
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

  const { data: lastExercise } = await supabase
    .from('scheduled_workout_exercises')
    .select('sort_order')
    .eq('scheduled_workout_id', workoutId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (lastExercise?.sort_order ?? -1) + 1

  const { error } = await supabase.from('scheduled_workout_exercises').insert({
    scheduled_workout_id: workoutId,
    exercise_id: parsed.data.exerciseId,
    sort_order: sortOrder,
    ...prescriptionValuesToDbRow(parsed.data),
  })

  if (error) {
    return { success: false, error: error.message }
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
    .update(prescriptionValuesToDbRow(parsed.data))
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
