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
const GYM_COACH_EMAIL =
  process.env.E2E_GYM_COACH_EMAIL ?? 'e2e-gym-coach@coaching-app.test'
const GYM_COACH_PASSWORD =
  process.env.E2E_GYM_COACH_PASSWORD ?? 'TestPassword123!'
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL ?? 'e2e-client@coaching-app.test'
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD ?? 'TestPassword123!'
const PROGRAM_NAME = 'E2E Test Program'
const CLIENT_NAME = 'E2E Test Client'
const EXERCISE_NAME = 'E2E Squat'
const BENCH_EXERCISE_NAME = 'E2E Bench Press'
const DEADLIFT_EXERCISE_NAME = 'E2E Deadlift'
const TEAM_NAME = 'E2E Leaderboard Team'
const TEAMMATE_NAME = 'E2E Teammate'
const TEAMMATE_EMAIL = 'e2e-teammate@coaching-app.test'
const WORKOUT_NAME = 'E2E Day 1 Workout'
const MEAL_PLAN_NAME = 'E2E Test Meal Plan'
const MEAL_PLAN_MEAL_NAME = 'E2E Test Breakfast'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Add SUPABASE_SERVICE_ROLE_KEY to apps/next/.env.local (Supabase Dashboard → Project Settings → API → service_role).'
  )
  process.exit(1)
}

const PRODUCTION_URL_PATTERNS = [
  /^https:\/\/[a-z0-9]+\.supabase\.co$/i,
]

function looksLikeProductionSupabaseUrl(supabaseUrl) {
  if (!PRODUCTION_URL_PATTERNS.some((pattern) => pattern.test(supabaseUrl))) {
    return false
  }
  if (
    process.env.E2E_ALLOW_PRODUCTION_SEED === '1' ||
    process.env.NODE_ENV === 'test'
  ) {
    return false
  }
  return !supabaseUrl.includes('localhost') && !supabaseUrl.includes('127.0.0.1')
}

if (looksLikeProductionSupabaseUrl(url)) {
  console.error(
    'Refusing to run E2E seed against a hosted Supabase project.\n' +
      'Point NEXT_PUBLIC_SUPABASE_URL at local/staging, or set E2E_ALLOW_PRODUCTION_SEED=1 to override.'
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

function dateKeyDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
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

async function resetFormReviews(clientId) {
  const { data: reviews } = await supabase
    .from('client_form_reviews')
    .select('storage_path')
    .eq('client_id', clientId)

  if (reviews?.length) {
    await supabase.storage
      .from('form-reviews')
      .remove(reviews.map((review) => review.storage_path))
  }

  await supabase.from('client_form_reviews').delete().eq('client_id', clientId)
}

async function resetGymState({ coachId, gymCoachId, clientId }) {
  await supabase.from('clients').update({ gym_id: null }).eq('id', clientId)

  const { data: ownedGyms } = await supabase
    .from('gyms')
    .select('id')
    .eq('created_by', coachId)

  if (ownedGyms?.length) {
    await supabase
      .from('gyms')
      .delete()
      .in(
        'id',
        ownedGyms.map((gym) => gym.id)
      )
  }

  await supabase.from('gym_members').delete().eq('coach_id', coachId)
  await supabase.from('gym_members').delete().eq('coach_id', gymCoachId)
  await supabase.from('gym_invites').delete().eq('email', GYM_COACH_EMAIL)
}

async function ensureExercise(coachId, name, muscleGroup) {
  const { data: existingExercise } = await supabase
    .from('exercises')
    .select('id')
    .eq('coach_id', coachId)
    .eq('name', name)
    .maybeSingle()

  if (existingExercise) {
    return existingExercise.id
  }

  const { data: inserted, error } = await supabase
    .from('exercises')
    .insert({
      coach_id: coachId,
      name,
      muscle_group: muscleGroup,
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

async function ensureE2EScheduling(coachId, clientId) {
  await supabase.from('coaching_appointments').delete().eq('client_id', clientId)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      session_booking_enabled: true,
      default_session_duration_minutes: 60,
      booking_buffer_minutes: 0,
      booking_min_notice_hours: 0,
      booking_max_days_ahead: 60,
      default_session_location: 'E2E Studio',
      booking_requires_session_pack: false,
    })
    .eq('id', coachId)

  if (profileError) throw profileError

  await supabase.from('coach_availability_rules').delete().eq('coach_id', coachId)

  const rules = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    coach_id: coachId,
    day_of_week: day,
    start_time: '09:00:00',
    end_time: '17:00:00',
  }))

  const { error: rulesError } = await supabase
    .from('coach_availability_rules')
    .insert(rules)

  if (rulesError) throw rulesError
}

async function ensureE2ENutritionProfile(coachId, clientId) {
  await supabase.from('client_nutrition_logs').delete().eq('client_id', clientId)

  const { error } = await supabase.from('client_nutrition_profiles').upsert(
    {
      client_id: clientId,
      coach_id: coachId,
      calories_kcal: 2100,
      protein_g: 150,
      dietary_restrictions: null,
    },
    { onConflict: 'client_id' }
  )
  if (error) throw error
}

async function ensureE2EMealPlanTemplate(coachId, clientId) {
  await supabase.from('meal_plan_assignments').delete().eq('client_id', clientId)
  await supabase.from('client_food_diary_entries').delete().eq('client_id', clientId)

  let mealPlanId
  const { data: existingPlan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('coach_id', coachId)
    .eq('name', MEAL_PLAN_NAME)
    .is('client_id', null)
    .maybeSingle()

  if (existingPlan) {
    mealPlanId = existingPlan.id
    await supabase
      .from('meal_plans')
      .update({ status: 'active' })
      .eq('id', mealPlanId)
  } else {
    const { data: inserted, error } = await supabase
      .from('meal_plans')
      .insert({
        coach_id: coachId,
        name: MEAL_PLAN_NAME,
        description: 'Automated E2E meal plan template',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    mealPlanId = inserted.id
  }

  const { data: existingDays } = await supabase
    .from('meal_plan_days')
    .select('id')
    .eq('meal_plan_id', mealPlanId)

  for (const day of existingDays ?? []) {
    await supabase.from('meal_plan_meals').delete().eq('meal_plan_day_id', day.id)
    await supabase.from('meal_plan_days').delete().eq('id', day.id)
  }

  let dayId
  const { data: insertedDay, error: dayError } = await supabase
    .from('meal_plan_days')
    .insert({
      meal_plan_id: mealPlanId,
      day_offset: 0,
    })
    .select('id')
    .single()
  if (dayError) throw dayError
  dayId = insertedDay.id

  const { data: existingMeal } = await supabase
    .from('meal_plan_meals')
    .select('id')
    .eq('meal_plan_day_id', dayId)
    .eq('name', MEAL_PLAN_MEAL_NAME)
    .maybeSingle()

  if (!existingMeal) {
    const { error } = await supabase.from('meal_plan_meals').insert({
      meal_plan_day_id: dayId,
      sort_order: 0,
      meal_type: 'breakfast',
      name: MEAL_PLAN_MEAL_NAME,
      description: 'Oats and eggs for E2E testing',
      calories_kcal: 450,
      protein_g: 25,
      carbs_g: 50,
      fat_g: 15,
    })
    if (error) throw error
  }
}

async function ensureScheduledExercise({
  scheduledWorkoutId,
  exerciseId,
  sortOrder,
}) {
  const { data: existingScheduledExercise } = await supabase
    .from('scheduled_workout_exercises')
    .select('id')
    .eq('scheduled_workout_id', scheduledWorkoutId)
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (existingScheduledExercise) {
    return existingScheduledExercise.id
  }

  const { data: inserted, error } = await supabase
    .from('scheduled_workout_exercises')
    .insert({
      scheduled_workout_id: scheduledWorkoutId,
      exercise_id: exerciseId,
      sort_order: sortOrder,
      sets: '3',
      reps: '5',
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
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

  const gymCoachId = await ensureUser({
    email: GYM_COACH_EMAIL,
    password: GYM_COACH_PASSWORD,
    fullName: 'E2E Gym Coach',
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
    .update({
      role: 'coach',
      full_name: 'E2E Coach',
      // Teams/nutrition/scheduling features are plan-gated; keep the E2E coach entitled.
      subscription_plan: 'scale',
      subscription_status: 'active',
    })
    .eq('id', coachId)
  await supabase
    .from('profiles')
    .update({ role: 'coach', full_name: 'E2E Gym Coach' })
    .eq('id', gymCoachId)
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

  await resetGymState({ coachId, gymCoachId, clientId })

  const startDate = todayKey()

  await supabase.from('client_progress_photos').delete().eq('client_id', clientId)
  await supabase.from('client_check_ins').delete().eq('client_id', clientId)
  await supabase.from('exercise_pr_records').delete().eq('client_id', clientId)
  await resetFormReviews(clientId)

  let exerciseId = await ensureExercise(coachId, EXERCISE_NAME, 'Legs')
  const benchExerciseId = await ensureExercise(
    coachId,
    BENCH_EXERCISE_NAME,
    'Chest'
  )
  const deadliftExerciseId = await ensureExercise(
    coachId,
    DEADLIFT_EXERCISE_NAME,
    'Back'
  )

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

  const squatScheduledExerciseId = await ensureScheduledExercise({
    scheduledWorkoutId,
    exerciseId,
    sortOrder: 0,
  })
  const benchScheduledExerciseId = await ensureScheduledExercise({
    scheduledWorkoutId,
    exerciseId: benchExerciseId,
    sortOrder: 1,
  })
  const deadliftScheduledExerciseId = await ensureScheduledExercise({
    scheduledWorkoutId,
    exerciseId: deadliftExerciseId,
    sortOrder: 2,
  })

  await supabase
    .from('clients')
    .update({
      biological_sex: 'male',
      leaderboard_opt_out: false,
    })
    .eq('id', clientId)

  const achievedAt = `${startDate}T12:00:00.000Z`
  await supabase.from('exercise_pr_records').delete().eq('client_id', clientId)

  const prRows = [
    {
      client_id: clientId,
      coach_id: coachId,
      exercise_id: exerciseId,
      record_type: 'e1rm',
      e1rm: 315,
      weight: 275,
      reps: 3,
      scheduled_workout_id: scheduledWorkoutId,
      scheduled_exercise_id: squatScheduledExerciseId,
      achieved_at: achievedAt,
    },
    {
      client_id: clientId,
      coach_id: coachId,
      exercise_id: benchExerciseId,
      record_type: 'e1rm',
      e1rm: 225,
      weight: 205,
      reps: 3,
      scheduled_workout_id: scheduledWorkoutId,
      scheduled_exercise_id: benchScheduledExerciseId,
      achieved_at: achievedAt,
    },
    {
      client_id: clientId,
      coach_id: coachId,
      exercise_id: deadliftExerciseId,
      record_type: 'e1rm',
      e1rm: 405,
      weight: 365,
      reps: 3,
      scheduled_workout_id: scheduledWorkoutId,
      scheduled_exercise_id: deadliftScheduledExerciseId,
      achieved_at: achievedAt,
    },
  ]

  for (const row of prRows) {
    const { error } = await supabase.from('exercise_pr_records').insert(row)
    if (error) throw error
  }

  const { error: bodyweightCheckInError } = await supabase
    .from('client_check_ins')
    .insert({
      client_id: clientId,
      coach_id: coachId,
      check_in_date: dateKeyDaysAgo(7),
      weight: 200,
      submitted_by: 'client',
      reviewed_at: achievedAt,
    })
  if (bodyweightCheckInError) throw bodyweightCheckInError

  let teamId
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .eq('name', TEAM_NAME)
    .maybeSingle()

  if (existingTeam) {
    teamId = existingTeam.id
    await supabase
      .from('teams')
      .update({
        squat_exercise_id: exerciseId,
        bench_exercise_id: benchExerciseId,
        deadlift_exercise_id: deadliftExerciseId,
      })
      .eq('id', teamId)
  } else {
    const { data: insertedTeam, error } = await supabase
      .from('teams')
      .insert({
        coach_id: coachId,
        name: TEAM_NAME,
        description: 'Automated E2E leaderboard team',
        squat_exercise_id: exerciseId,
        bench_exercise_id: benchExerciseId,
        deadlift_exercise_id: deadliftExerciseId,
      })
      .select('id')
      .single()
    if (error) throw error
    teamId = insertedTeam.id
  }

  const { data: existingMembership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existingMembership) {
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId,
      client_id: clientId,
    })
    if (error) throw error
  }

  // Second roster member so team assessment specs can score multiple athletes.
  const { data: existingTeammate } = await supabase
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)
    .eq('email', TEAMMATE_EMAIL)
    .maybeSingle()

  let teammateId = existingTeammate?.id
  if (teammateId) {
    await supabase
      .from('clients')
      .update({ full_name: TEAMMATE_NAME, status: 'active' })
      .eq('id', teammateId)
  } else {
    const { data: insertedTeammate, error } = await supabase
      .from('clients')
      .insert({
        coach_id: coachId,
        full_name: TEAMMATE_NAME,
        email: TEAMMATE_EMAIL,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    teammateId = insertedTeammate.id
  }

  const { data: existingTeammateMembership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('client_id', teammateId)
    .maybeSingle()

  if (!existingTeammateMembership) {
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId,
      client_id: teammateId,
    })
    if (error) throw error
  }

  // Reset team assessment runs so specs start from a clean slate.
  await supabase
    .from('client_assessments')
    .delete()
    .not('team_assessment_session_id', 'is', null)
    .in('client_id', [clientId, teammateId])
  await supabase.from('team_assessment_sessions').delete().eq('team_id', teamId)

  await ensureE2EMealPlanTemplate(coachId, clientId)
  await ensureE2ENutritionProfile(coachId, clientId)
  await ensureE2EScheduling(coachId, clientId)

  console.log('E2E seed complete.')
  console.log(`  Coach:     ${COACH_EMAIL}`)
  console.log(`  Gym coach: ${GYM_COACH_EMAIL}`)
  console.log(`  Client:    ${CLIENT_EMAIL}`)
  console.log(`  Program: ${PROGRAM_NAME} (assigned from ${startDate})`)
  console.log(`  Team: ${TEAM_NAME}`)
  console.log(`  Meal plan template: ${MEAL_PLAN_NAME}`)
  console.log(`  Scheduling: self-booking enabled, Mon–Sun 09:00–17:00`)
  console.log(`  Client ID: ${clientId}`)
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
