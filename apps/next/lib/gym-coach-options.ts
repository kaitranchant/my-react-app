import type { GymMemberWithProfile } from 'app/types/database'

export type GymCoachOption = {
  coachId: string
  coachName: string
  avatarUrl: string | null
}

export function gymMembersToCoachOptions(
  members: GymMemberWithProfile[]
): GymCoachOption[] {
  return members.map((member) => ({
    coachId: member.coach_id,
    coachName:
      member.profile?.full_name?.trim() ||
      member.profile?.business_name?.trim() ||
      'Coach',
    avatarUrl: member.profile?.avatar_url ?? null,
  }))
}
