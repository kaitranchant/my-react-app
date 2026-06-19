import { assignProgramToClient } from '@/app/(dashboard)/library/programs/actions'
import type { AssignProgramValues } from '@/lib/validations/program'

export type TeamMemberAssignResult = {
  succeeded: string[]
  failed: { clientId: string; error: string }[]
  totalScheduled: number
  totalSkipped: number
}

export async function assignProgramToTeamMembers(
  teamId: string,
  values: AssignProgramValues,
  clientIds: string[]
): Promise<TeamMemberAssignResult> {
  const succeeded: string[] = []
  const failed: { clientId: string; error: string }[] = []
  let totalScheduled = 0
  let totalSkipped = 0

  for (const clientId of clientIds) {
    const result = await assignProgramToClient(clientId, values, teamId)
    if (result.success) {
      succeeded.push(clientId)
      totalScheduled += result.scheduledCount
      totalSkipped += result.skippedCount
    } else {
      failed.push({ clientId, error: result.error })
    }
  }

  return { succeeded, failed, totalScheduled, totalSkipped }
}
