import { fetchCoachInbox } from '@/lib/message-inbox'
import type { createClient } from '@/lib/supabase/server'

export type CoachNavBadges = {
  inboxUnread: number
  pendingFormReviews: number
}

export async function fetchPendingFormReviewCount(
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

export async function fetchCoachNavBadges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string
): Promise<CoachNavBadges> {
  const [pendingFormReviews, inbox] = await Promise.all([
    fetchPendingFormReviewCount(supabase, coachId),
    fetchCoachInbox(supabase, coachId),
  ])

  return {
    pendingFormReviews,
    inboxUnread: inbox.totalUnread,
  }
}
