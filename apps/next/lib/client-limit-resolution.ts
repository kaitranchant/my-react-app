import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachSubscriptionContext } from '@/lib/subscription-entitlements'
import type { Database } from 'app/types/database'

type DbClient = SupabaseClient<Database>

/**
 * After leaving/deleting a facility, coaches without Growth/Scale fall back to
 * their personal plan limit (usually Starter). Flag them when over that limit.
 */
export async function syncClientLimitResolutionFlag(
  supabase: DbClient,
  coachId: string
): Promise<void> {
  const context = await getCoachSubscriptionContext(supabase, coachId)
  const overLimit =
    context.clientLimit != null &&
    context.billableClientCount > context.clientLimit

  await supabase
    .from('profiles')
    .update({ needs_client_limit_resolution: overLimit })
    .eq('id', coachId)
}

export async function markCoachesForClientLimitResolution(
  coachIds: string[]
): Promise<void> {
  const admin = createAdminClient()
  if (!admin || coachIds.length === 0) return

  const uniqueIds = Array.from(new Set(coachIds))
  for (const coachId of uniqueIds) {
    await syncClientLimitResolutionFlag(admin, coachId)
  }
}
