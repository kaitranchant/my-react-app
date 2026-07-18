import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultCoachPreferences } from '@/lib/coach-preferences'
import {
  buildClientOnboardingProgress,
  getFirstCheckInPeriodEnd,
  isClientOnboardingComplete,
  isFirstCheckInDue,
  shouldShowClientOnboardingChecklist,
} from '@/lib/client-onboarding'
import type { Client } from 'app/types/database'

const baseClient: Client = {
  id: 'client-1',
  coach_id: 'coach-1',
  user_id: 'user-1',
  full_name: 'Alex Client',
  email: 'alex@example.com',
  phone: null,
  status: 'active',
  invite_status: 'accepted',
  invite_token: null,
  invite_expires_at: null,
  goal: null,
  notes: null,
  avatar_url: null,
  coaching_type: null,
  is_coach_self: false,
  gym_id: null,
  leaderboard_opt_out: false,
  biological_sex: null,
  invite_accepted_at: '2026-06-16T12:00:00.000Z',
  onboarding_automation_at: null,
  stripe_customer_id: null,
  weekly_session_target: null,
  progressive_overload_enabled: true,
  onboarding_assessment_notes: null,
  onboarding_milestone_overrides: {},
  created_at: '2026-06-10T12:00:00.000Z',
  updated_at: '2026-06-16T12:00:00.000Z',
}

test('marks first check-in due after the first period ends', () => {
  const periodEnd = getFirstCheckInPeriodEnd(
    baseClient.invite_accepted_at!,
    defaultCoachPreferences
  )

  assert.equal(
    isFirstCheckInDue(
      baseClient.invite_accepted_at,
      [],
      defaultCoachPreferences,
      periodEnd
    ),
    true
  )

  assert.equal(
    isFirstCheckInDue(
      baseClient.invite_accepted_at,
      [],
      defaultCoachPreferences,
      '2026-06-15'
    ),
    false
  )
})

test('builds onboarding progress from client activity', () => {
  const progress = buildClientOnboardingProgress({
    client: baseClient,
    hasProgram: true,
    checkIns: [{ check_in_date: '2026-06-20' }],
    workouts: [{ status: 'completed' }],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-24',
  })

  assert.deepEqual(progress, {
    inviteAccepted: true,
    programAssigned: true,
    firstCheckInDue: true,
    firstWorkoutLogged: true,
    assessmentNotesRecorded: false,
  })
  assert.equal(isClientOnboardingComplete(progress), false)
})

test('marks assessment notes recorded when notes are saved', () => {
  const progress = buildClientOnboardingProgress({
    client: {
      ...baseClient,
      onboarding_assessment_notes: 'Knee history, strong squat pattern.',
    },
    hasProgram: true,
    checkIns: [{ check_in_date: '2026-06-20' }],
    workouts: [{ status: 'completed' }],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-24',
  })

  assert.equal(progress.assessmentNotesRecorded, true)
  assert.equal(isClientOnboardingComplete(progress), true)
})

test('marks assessment notes recorded when a structured assessment exists', () => {
  const progress = buildClientOnboardingProgress({
    client: baseClient,
    hasProgram: true,
    checkIns: [{ check_in_date: '2026-06-20' }],
    workouts: [{ status: 'completed' }],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-24',
    assessmentCount: 1,
  })

  assert.equal(progress.assessmentNotesRecorded, true)
  assert.equal(isClientOnboardingComplete(progress), true)
})

test('shows checklist for accepted clients still onboarding', () => {
  const progress = buildClientOnboardingProgress({
    client: baseClient,
    hasProgram: false,
    checkIns: [],
    workouts: [],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-24',
  })

  assert.equal(shouldShowClientOnboardingChecklist(baseClient, progress), true)
})

test('applies coach milestone overrides over auto status', () => {
  const progress = buildClientOnboardingProgress({
    client: {
      ...baseClient,
      onboarding_milestone_overrides: {
        programAssigned: true,
        firstWorkoutLogged: true,
        assessmentNotesRecorded: true,
      },
    },
    hasProgram: false,
    checkIns: [],
    workouts: [],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-15',
  })

  assert.deepEqual(progress, {
    inviteAccepted: true,
    programAssigned: true,
    firstCheckInDue: false,
    firstWorkoutLogged: true,
    assessmentNotesRecorded: true,
  })
})

test('allows coach to uncheck an auto-complete milestone', () => {
  const progress = buildClientOnboardingProgress({
    client: {
      ...baseClient,
      onboarding_assessment_notes: 'Notes saved',
      onboarding_milestone_overrides: {
        assessmentNotesRecorded: false,
      },
    },
    hasProgram: true,
    checkIns: [{ check_in_date: '2026-06-20' }],
    workouts: [{ status: 'completed' }],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-24',
  })

  assert.equal(progress.assessmentNotesRecorded, false)
  assert.equal(isClientOnboardingComplete(progress), false)
  assert.equal(shouldShowClientOnboardingChecklist(baseClient, progress), true)
})

test('ignores excluded milestones from the coach template', () => {
  const progress = buildClientOnboardingProgress({
    client: baseClient,
    hasProgram: false,
    checkIns: [],
    workouts: [],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-15',
  })

  const template = {
    programAssigned: false,
    firstCheckInDue: false,
    firstWorkoutLogged: false,
    assessmentNotesRecorded: false,
  }

  assert.equal(isClientOnboardingComplete(progress, template), true)
  assert.equal(
    shouldShowClientOnboardingChecklist(baseClient, progress, template),
    false
  )
})

test('shows checklist when an included template milestone is incomplete', () => {
  const progress = buildClientOnboardingProgress({
    client: baseClient,
    hasProgram: false,
    checkIns: [],
    workouts: [],
    coachPreferences: defaultCoachPreferences,
    todayKey: '2026-06-15',
  })

  const template = {
    inviteAccepted: true,
    programAssigned: true,
    firstCheckInDue: false,
    firstWorkoutLogged: false,
    assessmentNotesRecorded: false,
  }

  assert.equal(isClientOnboardingComplete(progress, template), false)
  assert.equal(
    shouldShowClientOnboardingChecklist(baseClient, progress, template),
    true
  )
})
