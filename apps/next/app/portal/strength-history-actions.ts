'use server'

import { getCoachPreferencesForCoachId } from '@/lib/coach-preferences-server'
import { requirePortalClientContext } from '@/lib/portal-client'
import {
  fetchStrengthHistoryForExercise,
  type StrengthHistoryTrend,
} from '@/lib/strength-history'

export type StrengthHistoryActionResult =
  | { success: true; trend: StrengthHistoryTrend }
  | { success: false; error: string }

export async function getPortalStrengthHistoryTrend(
  exerciseId: string
): Promise<StrengthHistoryActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const coachPreferences = await getCoachPreferencesForCoachId(ctx.client.coach_id)
  const trend = await fetchStrengthHistoryForExercise(
    ctx.supabase,
    ctx.client.id,
    exerciseId,
    coachPreferences.weightUnit
  )

  return { success: true, trend }
}
