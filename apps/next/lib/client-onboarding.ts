import { parseDateKey } from '@/lib/calendar'
import {
  getCheckInPeriodBounds,
} from '@/lib/check-in-cadence'
import {
  getCoachDateKey,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import type { CheckInFrequency, Client, ClientCheckIn, Json } from 'app/types/database'

export type ClientOnboardingMilestoneKey = keyof ClientOnboardingProgress

export type ClientOnboardingProgress = {
  inviteAccepted: boolean
  programAssigned: boolean
  firstCheckInDue: boolean
  firstWorkoutLogged: boolean
  assessmentNotesRecorded: boolean
}

export type ClientOnboardingMilestoneOverrides = Partial<
  Record<ClientOnboardingMilestoneKey, boolean>
>

/** false = excluded from the coach's template; missing/true = included. */
export type ClientOnboardingMilestoneTemplate = Partial<
  Record<ClientOnboardingMilestoneKey, boolean>
>

export const CLIENT_ONBOARDING_MILESTONE_KEYS = [
  'inviteAccepted',
  'programAssigned',
  'firstCheckInDue',
  'firstWorkoutLogged',
  'assessmentNotesRecorded',
] as const satisfies readonly ClientOnboardingMilestoneKey[]

export const CLIENT_ONBOARDING_MILESTONE_OPTIONS: Array<{
  key: ClientOnboardingMilestoneKey
  label: string
  description: string
}> = [
  {
    key: 'inviteAccepted',
    label: 'Invite accepted',
    description: 'Client joined the portal.',
  },
  {
    key: 'programAssigned',
    label: 'Assign program',
    description: 'Give them a training plan to follow.',
  },
  {
    key: 'firstCheckInDue',
    label: 'First check-in due',
    description: 'Their first check-in period has arrived.',
  },
  {
    key: 'firstWorkoutLogged',
    label: 'First workout logged',
    description: 'Client completed their first session.',
  },
  {
    key: 'assessmentNotesRecorded',
    label: 'Assessment notes',
    description: 'Jot down observations from the initial assessment.',
  },
]

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

export function parseOnboardingMilestoneOverrides(
  value: Json | null | undefined
): ClientOnboardingMilestoneOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const overrides: ClientOnboardingMilestoneOverrides = {}
  for (const key of CLIENT_ONBOARDING_MILESTONE_KEYS) {
    const entry = value[key]
    if (typeof entry === 'boolean') {
      overrides[key] = entry
    }
  }
  return overrides
}

export function parseOnboardingMilestoneTemplate(
  value: Json | null | undefined
): ClientOnboardingMilestoneTemplate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const template: ClientOnboardingMilestoneTemplate = {}
  for (const key of CLIENT_ONBOARDING_MILESTONE_KEYS) {
    const entry = value[key]
    if (typeof entry === 'boolean') {
      template[key] = entry
    }
  }
  return template
}

export function isOnboardingMilestoneIncluded(
  template: ClientOnboardingMilestoneTemplate | null | undefined,
  key: ClientOnboardingMilestoneKey
): boolean {
  return template?.[key] !== false
}

export function getIncludedOnboardingMilestones(
  template: ClientOnboardingMilestoneTemplate | null | undefined
): ClientOnboardingMilestoneKey[] {
  return CLIENT_ONBOARDING_MILESTONE_KEYS.filter((key) =>
    isOnboardingMilestoneIncluded(template, key)
  )
}

export function serializeOnboardingMilestoneTemplate(
  template: ClientOnboardingMilestoneTemplate
): Record<ClientOnboardingMilestoneKey, boolean> {
  const serialized = {} as Record<ClientOnboardingMilestoneKey, boolean>
  for (const key of CLIENT_ONBOARDING_MILESTONE_KEYS) {
    serialized[key] = isOnboardingMilestoneIncluded(template, key)
  }
  return serialized
}

export function applyOnboardingMilestoneOverrides(
  auto: ClientOnboardingProgress,
  overrides: ClientOnboardingMilestoneOverrides
): ClientOnboardingProgress {
  return {
    inviteAccepted: overrides.inviteAccepted ?? auto.inviteAccepted,
    programAssigned: overrides.programAssigned ?? auto.programAssigned,
    firstCheckInDue: overrides.firstCheckInDue ?? auto.firstCheckInDue,
    firstWorkoutLogged: overrides.firstWorkoutLogged ?? auto.firstWorkoutLogged,
    assessmentNotesRecorded:
      overrides.assessmentNotesRecorded ?? auto.assessmentNotesRecorded,
  }
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

  const auto: ClientOnboardingProgress = {
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

  return applyOnboardingMilestoneOverrides(
    auto,
    parseOnboardingMilestoneOverrides(input.client.onboarding_milestone_overrides)
  )
}

export function isClientOnboardingComplete(
  progress: ClientOnboardingProgress,
  template?: ClientOnboardingMilestoneTemplate | null
): boolean {
  const included = getIncludedOnboardingMilestones(template)
  if (included.length === 0) {
    return true
  }

  return included.every((key) => progress[key])
}

export function shouldShowClientOnboardingChecklist(
  client: Client,
  progress: ClientOnboardingProgress,
  template?: ClientOnboardingMilestoneTemplate | null
): boolean {
  if (client.is_coach_self || client.status !== 'active') {
    return false
  }

  // Use raw invite status so unchecking the invite milestone does not hide the list.
  if (client.invite_status !== 'accepted') {
    return false
  }

  if (getIncludedOnboardingMilestones(template).length === 0) {
    return false
  }

  return !isClientOnboardingComplete(progress, template)
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
