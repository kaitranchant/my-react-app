import {
  fetchCoachNavBadges,
  type CoachNavBadges,
} from '@/lib/dashboard-queries'
import type { createClient } from '@/lib/supabase/server'

export type CoachNotificationItem = {
  id: string
  title: string
  description: string
  href: string
  kind:
    | 'message'
    | 'form_review'
    | 'check_in'
    | 'overload'
    | 'invite'
    | 'workout'
  priority: 'high' | 'normal'
  timestamp?: string
}

export async function fetchCoachNotificationItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  prefetchedBadges?: CoachNavBadges
): Promise<CoachNotificationItem[]> {
  const [
    badges,
    pendingCheckInsCountResult,
    pendingInvitesResult,
    recentFormReviews,
    recentCheckIns,
    recentWorkouts,
  ] = await Promise.all([
    prefetchedBadges ?? fetchCoachNavBadges(supabase, coachId),
    supabase
      .from('client_check_ins')
      .select('*', { count: 'exact', head: true })
      .is('reviewed_at', null)
      .eq('submitted_by', 'client'),
    supabase
      .from('clients')
      .select('id, full_name, updated_at')
      .eq('coach_id', coachId)
      .eq('invite_status', 'pending')
      .eq('is_coach_self', false)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('client_form_reviews')
      .select('id, title, created_at, clients(full_name)')
      .is('reviewed_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('client_check_ins')
      .select('id, updated_at, clients(full_name)')
      .is('reviewed_at', null)
      .eq('submitted_by', 'client')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('client_scheduled_workouts')
      .select(
        'id, name, completed_at, updated_at, client_id, clients!inner(full_name, coach_id, is_coach_self)'
      )
      .eq('clients.coach_id', coachId)
      .eq('clients.is_coach_self', false)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5),
  ])

  const items: CoachNotificationItem[] = []
  const seen = new Set<string>()

  function push(item: CoachNotificationItem) {
    if (seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }

  if (badges.inboxUnread > 0) {
    push({
      id: 'inbox-unread',
      title: `${badges.inboxUnread} unread message${badges.inboxUnread === 1 ? '' : 's'}`,
      description: 'Reply from your inbox or a client profile.',
      href: '/messages',
      kind: 'message',
      priority: 'high',
    })
  }

  if (badges.pendingFormReviews > 0) {
    push({
      id: 'form-review-queue',
      title: `${badges.pendingFormReviews} form review${badges.pendingFormReviews === 1 ? '' : 's'} awaiting feedback`,
      description: 'Review lift photos and videos from clients.',
      href: '/form-review',
      kind: 'form_review',
      priority: 'high',
    })
  }

  const pendingCheckInCount = pendingCheckInsCountResult.count ?? 0
  if (pendingCheckInCount > 0) {
    push({
      id: 'check-in-queue',
      title: `${pendingCheckInCount} check-in${pendingCheckInCount === 1 ? '' : 's'} to review`,
      description: 'Clients submitted wellness updates for your review.',
      href: '/check-ins',
      kind: 'check_in',
      priority: 'high',
    })
  }

  if (badges.pendingProgressiveOverload > 0) {
    push({
      id: 'overload-queue',
      title: `${badges.pendingProgressiveOverload} load increase${badges.pendingProgressiveOverload === 1 ? '' : 's'} to approve`,
      description: 'Review suggested weight bumps from last week.',
      href: '/progressive-overload',
      kind: 'overload',
      priority: 'high',
    })
  }

  for (const invite of pendingInvitesResult.data ?? []) {
    const client = invite as { id: string; full_name: string; updated_at: string }
    push({
      id: `invite-${client.id}`,
      title: `${client.full_name} has not accepted their invite`,
      description: 'Resend the portal invite from their client profile.',
      href: `/clients/${client.id}`,
      kind: 'invite',
      priority: 'normal',
      timestamp: client.updated_at,
    })
  }

  for (const review of recentFormReviews.data ?? []) {
    const client = review.clients as { full_name: string } | null
    push({
      id: `form-review-${review.id}`,
      title: client?.full_name ?? 'Client',
      description: review.title?.trim()
        ? `Submitted "${review.title}" for form review`
        : 'Submitted a new form review',
      href: '/form-review',
      kind: 'form_review',
      priority: 'normal',
      timestamp: review.created_at,
    })
  }

  for (const checkIn of recentCheckIns.data ?? []) {
    const client = checkIn.clients as { full_name: string } | null
    push({
      id: `check-in-${checkIn.id}`,
      title: client?.full_name ?? 'Client',
      description: 'Submitted a check-in awaiting your review',
      href: '/check-ins',
      kind: 'check_in',
      priority: 'normal',
      timestamp: checkIn.updated_at,
    })
  }

  for (const workout of recentWorkouts.data ?? []) {
    const client = workout.clients as { full_name: string } | null
    push({
      id: `workout-${workout.id}`,
      title: client?.full_name ?? 'Client',
      description: `Completed ${workout.name}`,
      href: `/clients/${workout.client_id}`,
      kind: 'workout',
      priority: 'normal',
      timestamp: workout.completed_at ?? workout.updated_at,
    })
  }

  return items.slice(0, 12)
}

export function countCoachNotificationItems(
  items: CoachNotificationItem[]
): number {
  return items.filter((item) => item.priority === 'high').length
}
