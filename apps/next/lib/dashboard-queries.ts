import { cache } from 'react'

import { fetchCoachInboxUnreadCount } from '@/lib/message-inbox'
import { countPendingProgressiveOverloadSuggestions } from '@/lib/progressive-overload'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import type { createClient } from '@/lib/supabase/server'

export type CoachNavBadges = {
  inboxUnread: number
  pendingFormReviews: number
  pendingProgressiveOverload: number
}

async function fetchPendingFormReviewCountImpl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('client_form_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .is('reviewed_at', null)

  if (error) {
    return 0
  }

  return count ?? 0
}

export const fetchPendingFormReviewCount = cache(fetchPendingFormReviewCountImpl)

async function fetchCoachNavBadgesImpl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string
): Promise<CoachNavBadges> {
  const coachPreferences = await getCoachPreferencesForUser(coachId)

  const [pendingFormReviews, inboxUnread, pendingProgressiveOverload] =
    await Promise.all([
      fetchPendingFormReviewCount(supabase, coachId),
      fetchCoachInboxUnreadCount(supabase, coachId),
      countPendingProgressiveOverloadSuggestions(
        supabase,
        coachId,
        coachPreferences
      ),
    ])

  return {
    pendingFormReviews,
    inboxUnread,
    pendingProgressiveOverload,
  }
}

export const fetchCoachNavBadges = cache(fetchCoachNavBadgesImpl)
