import { parseDateKey } from '@/lib/calendar'
import {
  getCheckInPeriodBounds,
} from '@/lib/check-in-cadence'
import {
  getCoachDateKey,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import type { CheckInFrequency, Client, ClientCheckIn } from 'app/types/database'

export type ClientOnboardingProgress = {
  inviteAccepted: boolean
  programAssigned: boolean
  firstCheckInDue: boolean
  firstWorkoutLogged: boolean
  assessmentNotesRecorded: boolean
}

export function hasOnboardingAssessmentNotes(notes: string | null | undefined): boolean {
  return Boolean(notes?.trim())
}

export function getInviteAcceptedAt(client: Client): string | null {
  if (client.invite_status !== 'accepted') {
    return null
  }

  return client.invite_accepted_at ?? client.updated_at
}

export function getFirstCheckInPeriodEnd(
  inviteAcceptedAt: string,
  coachPreferences: CoachPreferences
): string {
  const acceptedKey = getCoachDateKey(
    coachPreferences.timezone,
    new Date(inviteAcceptedAt)
  )

  const { end } = getCheckInPeriodBounds(
    coachPreferences.defaultCheckInFrequency,
    coachPreferences.weekStartsOn,
    coachPreferences.timezone,
    parseDateKey(acceptedKey)
  )

  return end
}

export function isFirstCheckInDue(
  inviteAcceptedAt: string | null,
  checkIns: Pick<ClientCheckIn, 'check_in_date'>[],
  coachPreferences: CoachPreferences,
  todayKey = getCoachDateKey(coachPreferences.timezone)
): boolean {
  if (checkIns.length > 0) {
    return true
  }

  if (!inviteAcceptedAt) {
    return false
  }

  return todayKey >= getFirstCheckInPeriodEnd(inviteAcceptedAt, coachPreferences)
}

export function hasLoggedFirstWorkout(
  workouts: { status: string }[]
): boolean {
  return workouts.some((workout) => workout.status === 'completed')
}

export function buildClientOnboardingProgress(input: {
  client: Client
  hasProgram: boolean
  checkIns: Pick<ClientCheckIn, 'check_in_date'>[]
  workouts: { status: string }[]
  coachPreferences: CoachPreferences
  todayKey?: string
}): ClientOnboardingProgress {
  const inviteAcceptedAt = getInviteAcceptedAt(input.client)

  return {
    inviteAccepted: input.client.invite_status === 'accepted',
    programAssigned: input.hasProgram,
    firstCheckInDue: isFirstCheckInDue(
      inviteAcceptedAt,
      input.checkIns,
      input.coachPreferences,
      input.todayKey
    ),
    firstWorkoutLogged: hasLoggedFirstWorkout(input.workouts),
    assessmentNotesRecorded: hasOnboardingAssessmentNotes(
      input.client.onboarding_assessment_notes
    ),
  }
}

export function isClientOnboardingComplete(
  progress: ClientOnboardingProgress
): boolean {
  return (
    progress.inviteAccepted &&
    progress.programAssigned &&
    progress.firstCheckInDue &&
    progress.firstWorkoutLogged &&
    progress.assessmentNotesRecorded
  )
}

export function shouldShowClientOnboardingChecklist(
  client: Client,
  progress: ClientOnboardingProgress
): boolean {
  if (client.is_coach_self || client.status !== 'active') {
    return false
  }

  if (!progress.inviteAccepted) {
    return false
  }

  return !isClientOnboardingComplete(progress)
}

export function getCheckInDueStepLabel(
  frequency: CheckInFrequency,
  done: boolean
): string {
  if (done) {
    return 'First check-in due'
  }

  switch (frequency) {
    case 'daily':
      return 'First daily check-in due'
    case 'weekly':
      return 'First weekly check-in due'
    case 'biweekly':
      return 'First bi-weekly check-in due'
    default:
      return 'First check-in due'
  }
}
