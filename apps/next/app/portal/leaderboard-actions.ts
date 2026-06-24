'use server'

import { revalidatePath } from 'next/cache'

import { requirePortalClientContext } from '@/lib/portal-client'
import type { BiologicalSex } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidateLeaderboardPaths() {
  revalidatePath('/portal/account')
  revalidatePath('/portal/leaderboards')
  revalidatePath('/leaderboards')
  revalidatePath('/portal', 'layout')
}

export async function updateMyBiologicalSex(
  biologicalSex: BiologicalSex | null
): Promise<ActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { error } = await ctx.supabase
    .from('clients')
    .update({ biological_sex: biologicalSex })
    .eq('id', ctx.client.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateLeaderboardPaths()
  return { success: true }
}
