/**
 * Seed reproducible E2E test data via Supabase service role.
 * Run: yarn workspace next-app seed:e2e
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in apps/next/.env.local (Project Settings → API).
 */
import { createClient } from '@supabase/supabase-js'
import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const COACH_EMAIL = process.env.E2E_COACH_EMAIL ?? 'e2e-coach@coaching-app.test'
const COACH_PASSWORD = process.env.E2E_COACH_PASSWORD ?? 'TestPassword123!'
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL ?? 'e2e-client@coaching-app.test'
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD ?? 'TestPassword123!'
const PROGRAM_NAME = 'E2E Test Program'
const CLIENT_NAME = 'E2E Test Client'
const EXERCISE_NAME = 'E2E Squat'
const WORKOUT_NAME = 'E2E Day 1 Workout'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Add SUPABASE_SERVICE_ROLE_KEY to apps/next/.env.local (Supabase Dashboard → Project Settings → API → service_role).'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((user) => user.email === email) ?? null
}

async function ensureUser({ email, password, fullName, role }) {
  const existing = await findUserByEmail(email)
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { full_name: fullName, role },
    })
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })
  if (error) throw error
  return data.user.id
}

async function main() {
  console.log('Seeding E2E data…')

  const coachId = await ensureUser({
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    fullName: 'E2E Coach',
    role: 'coach',
  })

  const clientUserId = await ensureUser({
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
    fullName: CLIENT_NAME,
    role: 'client',
  })

  await supabase
    .from('profiles')
    .update({ role: 'coach', full_name: 'E2E Coach' })
    .eq('id', coachId)
  await supabase
    .from('profiles')
    .update({ role: 'client', full_name: CLIENT_NAME })
    .eq('id', clientUserId)

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)
    .eq('email', CLIENT_EMAIL)
    .maybeSingle()

  let clientId = existingClient?.id

  if (clientId) {
    await supabase
      .from('clients')
      .update({
        full_name: CLIENT_NAME,
        user_id: clientUserId,
        invite_status: 'accepted',
        status: 'active',
      })
      .eq('id', clientId)
  } else {
    const { data: inserted, error } = await supabase
      .from('clients')
      .insert({
        coach_id: coachId,
        full_name: CLIENT_NAME,
        email: CLIENT_EMAIL,
        user_id: clientUserId,
        invite_status: 'accepted',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    clientId = inserted.id
  }

  let exerciseId
  const { data: existingExercise } = await supabase
    .from('exercises')
    .select('id')
    .eq('coach_id', coachId)
    .eq('name', EXERCISE_NAME)
    .maybeSingle()

  if (existingExercise) {
    exerciseId = existingExercise.id
  } else {
    const { data: inserted, error } = await supabase
      .from('exercises')
      .insert({
        coach_id: coachId,
        name: EXERCISE_NAME,
        muscle_group: 'Legs',
      })
      .select('id')
      .single()
    if (error) throw error
    exerciseId = inserted.id
  }

  let programId
  const { data: existingProgram } = await supabase
    .from('programs')
    .select('id')
    .eq('coach_id', coachId)
    .eq('name', PROGRAM_NAME)
    .maybeSingle()

  if (existingProgram) {
    programId = existingProgram.id
  } else {
    const { data: inserted, error } = await supabase
      .from('programs')
      .insert({
        coach_id: coachId,
        name: PROGRAM_NAME,
        description: 'Automated E2E test program',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    programId = inserted.id
  }

  let programWorkoutId
  const { data: existingProgramWorkout } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('program_id', programId)
    .eq('day_offset', 0)
    .maybeSingle()

  if (existingProgramWorkout) {
    programWorkoutId = existingProgramWorkout.id
    await supabase
      .from('program_scheduled_workouts')
      .update({ name: WORKOUT_NAME })
      .eq('id', programWorkoutId)
  } else {
    const { data: inserted, error } = await supabase
      .from('program_scheduled_workouts')
      .insert({
        coach_id: coachId,
        program_id: programId,
        day_offset: 0,
        name: WORKOUT_NAME,
      })
      .select('id')
      .single()
    if (error) throw error
    programWorkoutId = inserted.id
  }

  const { data: existingProgramExercise } = await supabase
    .from('program_scheduled_workout_exercises')
    .select('id')
    .eq('program_scheduled_workout_id', programWorkoutId)
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (!existingProgramExercise) {
    const { error } = await supabase
      .from('program_scheduled_workout_exercises')
      .insert({
        program_scheduled_workout_id: programWorkoutId,
        exercise_id: exerciseId,
        sort_order: 0,
        sets: '3',
        reps: '10',
      })
    if (error) throw error
  }

  const startDate = todayKey()

  const { data: existingAssignment } = await supabase
    .from('program_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('program_id', programId)
    .eq('status', 'active')
    .maybeSingle()

  if (!existingAssignment) {
    const { error } = await supabase.from('program_assignments').insert({
      coach_id: coachId,
      client_id: clientId,
      program_id: programId,
      start_date: startDate,
      status: 'active',
    })
    if (error) throw error
  } else {
    await supabase
      .from('program_assignments')
      .update({ start_date: startDate })
      .eq('id', existingAssignment.id)
  }

  const { data: existingScheduled } = await supabase
    .from('client_scheduled_workouts')
    .select('id')
    .eq('client_id', clientId)
    .eq('scheduled_date', startDate)
    .maybeSingle()

  let scheduledWorkoutId = existingScheduled?.id

  if (scheduledWorkoutId) {
    await supabase
      .from('workout_log_sets')
      .delete()
      .eq('scheduled_workout_id', scheduledWorkoutId)
    await supabase
      .from('client_scheduled_workouts')
      .update({
        name: WORKOUT_NAME,
        status: 'scheduled',
        started_at: null,
        completed_at: null,
      })
      .eq('id', scheduledWorkoutId)
  } else {
    const { data: inserted, error } = await supabase
      .from('client_scheduled_workouts')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        scheduled_date: startDate,
        name: WORKOUT_NAME,
        status: 'scheduled',
      })
      .select('id')
      .single()
    if (error) throw error
    scheduledWorkoutId = inserted.id
  }

  const { data: existingScheduledExercise } = await supabase
    .from('scheduled_workout_exercises')
    .select('id')
    .eq('scheduled_workout_id', scheduledWorkoutId)
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (!existingScheduledExercise) {
    const { error } = await supabase.from('scheduled_workout_exercises').insert({
      scheduled_workout_id: scheduledWorkoutId,
      exercise_id: exerciseId,
      sort_order: 0,
      sets: '3',
      reps: '10',
    })
    if (error) throw error
  }

  console.log('E2E seed complete.')
  console.log(`  Coach:  ${COACH_EMAIL}`)
  console.log(`  Client: ${CLIENT_EMAIL}`)
  console.log(`  Program: ${PROGRAM_NAME} (assigned from ${startDate})`)
  console.log(`  Client ID: ${clientId}`)
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
