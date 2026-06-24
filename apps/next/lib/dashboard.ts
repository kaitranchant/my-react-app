import { toDateKey } from '@/lib/calendar'
import { getWeekRange as resolveWeekRange } from '@/lib/coach-preferences'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { Client, ClientCheckIn, ClientScheduledWorkout } from 'app/types/database'

export type TodaySession = Pick<
  ClientScheduledWorkout,
  'id' | 'name' | 'status' | 'scheduled_date' | 'started_at' | 'client_id'
> & {
  clientName: string
}

export type ActivityItem = {
  id: string
  clientId: string
  clientName: string
  kind: 'workout' | 'check_in' | 'form_review'
  workoutName?: string
  formReviewTitle?: string | null
  status?: ClientScheduledWorkout['status']
  timestamp: string
  groupedCount?: number
  groupedClientIds?: string[]
}

const ACTIVITY_GROUP_WINDOW_MS = 15 * 60 * 1000

export type ActionItem = {
  id: string
  message: string
  href: string
  priority: 'high' | 'medium' | 'low'
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getWeekRange(
  weekStartsOn: CoachPreferences['weekStartsOn'] = 'monday',
  timezone: CoachPreferences['timezone'] = 'auto'
): { start: string; end: string } {
  return resolveWeekRange(weekStartsOn, timezone)
}

export function calcWorkoutCompletionRate(
  workouts: Pick<ClientScheduledWorkout, 'status'>[]
): number | null {
  if (workouts.length === 0) return null
  const completed = workouts.filter((w) => w.status === 'completed').length
  return Math.round((completed / workouts.length) * 100)
}

export function buildActionItems({
  clients,
  pendingInvites,
  clientsWithoutWorkoutThisWeek,
  skippedThisWeek,
  pendingCheckIns = 0,
  clientsWithoutCheckInThisPeriod = 0,
  checkInPeriodLabel = 'this week',
  pendingFormReviews = 0,
  elevatedLoadClients = 0,
  injuryFlagClients = 0,
  unreadMessages = 0,
}: {
  clients: Client[]
  pendingInvites: number
  clientsWithoutWorkoutThisWeek: number
  skippedThisWeek: number
  pendingCheckIns?: number
  clientsWithoutCheckInThisPeriod?: number
  checkInPeriodLabel?: string
  pendingFormReviews?: number
  elevatedLoadClients?: number
  injuryFlagClients?: number
  unreadMessages?: number
}): ActionItem[] {
  const items: ActionItem[] = []

  if (injuryFlagClients > 0) {
    items.push({
      id: 'injury-flags',
      message: `${injuryFlagClients} client${injuryFlagClients === 1 ? '' : 's'} flagged pain in a recent check-in`,
      href: '/check-ins',
      priority: 'high',
    })
  }

  if (pendingFormReviews > 0) {
    items.push({
      id: 'pending-form-reviews',
      message: `${pendingFormReviews} form review${pendingFormReviews === 1 ? '' : 's'} awaiting feedback`,
      href: '/form-review',
      priority: 'high',
    })
  }

  if (pendingCheckIns > 0) {
    items.push({
      id: 'pending-check-ins',
      message: `${pendingCheckIns} client check-in${pendingCheckIns === 1 ? '' : 's'} awaiting review`,
      href: '/check-ins',
      priority: 'high',
    })
  }

  if (elevatedLoadClients > 0) {
    items.push({
      id: 'elevated-load',
      message: `${elevatedLoadClients} athlete${elevatedLoadClients === 1 ? '' : 's'} with elevated training load (ACWR)`,
      href: '/load',
      priority: 'high',
    })
  }

  if (unreadMessages > 0) {
    items.push({
      id: 'unread-messages',
      message: `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}`,
      href: '/messages',
      priority: 'medium',
    })
  }

  if (clientsWithoutCheckInThisPeriod > 0) {
    items.push({
      id: 'no-check-in',
      message: `${clientsWithoutCheckInThisPeriod} active client${clientsWithoutCheckInThisPeriod === 1 ? '' : 's'} ha${clientsWithoutCheckInThisPeriod === 1 ? 's' : 've'}n't checked in ${checkInPeriodLabel}`,
      href: '/compliance?filter=needs_attention',
      priority: 'medium',
    })
  }

  if (clientsWithoutWorkoutThisWeek > 0) {
    items.push({
      id: 'no-workout',
      message: `${clientsWithoutWorkoutThisWeek} active client${clientsWithoutWorkoutThisWeek === 1 ? '' : 's'} ha${clientsWithoutWorkoutThisWeek === 1 ? 's' : 've'}n't logged a workout this week`,
      href: '/compliance?filter=needs_attention',
      priority: 'high',
    })
  }

  if (skippedThisWeek > 0) {
    items.push({
      id: 'skipped',
      message: `${skippedThisWeek} scheduled workout${skippedThisWeek === 1 ? '' : 's'} skipped this week`,
      href: '/compliance?filter=needs_attention',
      priority: 'high',
    })
  }

  if (pendingInvites > 0) {
    items.push({
      id: 'invites',
      message: `${pendingInvites} client invite${pendingInvites === 1 ? '' : 's'} awaiting signup`,
      href: '/clients?status=active',
      priority: 'medium',
    })
  }

  const noPlanClients = clients.filter(
    (c) => c.status === 'active' && c.invite_status === 'not_invited'
  ).length
  if (noPlanClients > 0) {
    items.push({
      id: 'no-account',
      message: `${noPlanClients} active client${noPlanClients === 1 ? '' : 's'} without a portal account`,
      href: '/clients',
      priority: 'medium',
    })
  }

  const pausedClients = clients.filter((c) => c.status === 'paused').length
  if (pausedClients > 0) {
    items.push({
      id: 'paused',
      message: `${pausedClients} client${pausedClients === 1 ? '' : 's'} currently paused`,
      href: '/clients?status=paused',
      priority: 'low',
    })
  }

  return items
}

export function buildActivityFeed(
  workouts: (Pick<
    ClientScheduledWorkout,
    'id' | 'name' | 'status' | 'completed_at' | 'started_at' | 'updated_at' | 'client_id'
  > & { clientName: string })[]
): ActivityItem[] {
  return workouts
    .filter((w) => w.status !== 'scheduled')
    .map((w) => ({
      id: w.id,
      clientId: w.client_id,
      clientName: w.clientName,
      kind: 'workout' as const,
      workoutName: w.name,
      status: w.status,
      timestamp: w.completed_at ?? w.started_at ?? w.updated_at,
    }))
}

export function buildCheckInActivityFeed(
  checkIns: (Pick<
    ClientCheckIn,
    'id' | 'client_id' | 'updated_at' | 'created_at'
  > & { clientName: string })[]
): ActivityItem[] {
  return checkIns.map((checkIn) => ({
    id: checkIn.id,
    clientId: checkIn.client_id,
    clientName: checkIn.clientName,
    kind: 'check_in' as const,
    timestamp: checkIn.updated_at ?? checkIn.created_at,
  }))
}

export function buildFormReviewActivityFeed(
  reviews: {
    id: string
    client_id: string
    title: string | null
    created_at: string
    clientName: string
  }[]
): ActivityItem[] {
  return reviews.map((review) => ({
    id: review.id,
    clientId: review.client_id,
    clientName: review.clientName,
    kind: 'form_review' as const,
    formReviewTitle: review.title,
    timestamp: review.created_at,
  }))
}

export function mergeActivityFeed(
  ...feeds: ActivityItem[][]
): ActivityItem[] {
  const limit = 8

  const sorted = feeds
    .flat()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

  return groupRapidActivityItems(sorted).slice(0, limit)
}

function getActivityGroupKey(item: ActivityItem): string {
  if (item.kind === 'workout') {
    return `workout:${item.status ?? 'unknown'}`
  }

  return item.kind
}

function formatGroupedClientNames(names: string[]): string {
  const uniqueNames = Array.from(new Set(names))

  if (uniqueNames.length === 1) {
    return uniqueNames[0]!
  }

  if (uniqueNames.length === 2) {
    return `${uniqueNames[0]} and ${uniqueNames[1]}`
  }

  return `${uniqueNames.slice(0, -1).join(', ')}, and ${uniqueNames.at(-1)}`
}

function createGroupedActivityItem(cluster: ActivityItem[]): ActivityItem {
  const newest = cluster[0]!
  const groupedClientIds = Array.from(new Set(cluster.map((item) => item.clientId)))

  return {
    ...newest,
    id: `group-${newest.kind}-${cluster.map((item) => item.id).join('-')}`,
    clientId: newest.clientId,
    clientName: formatGroupedClientNames(cluster.map((item) => item.clientName)),
    groupedCount: cluster.length,
    groupedClientIds,
    timestamp: newest.timestamp,
  }
}

export function groupRapidActivityItems(items: ActivityItem[]): ActivityItem[] {
  if (items.length < 2) {
    return items
  }

  const grouped: ActivityItem[] = []
  let index = 0

  while (index < items.length) {
    const cluster = [items[index]!]
    const clusterStart = new Date(items[index]!.timestamp).getTime()
    const groupKey = getActivityGroupKey(items[index]!)
    let nextIndex = index + 1

    while (nextIndex < items.length) {
      const candidate = items[nextIndex]!
      const elapsed = clusterStart - new Date(candidate.timestamp).getTime()

      if (
        getActivityGroupKey(candidate) === groupKey &&
        elapsed <= ACTIVITY_GROUP_WINDOW_MS
      ) {
        cluster.push(candidate)
        nextIndex += 1
        continue
      }

      break
    }

    grouped.push(
      cluster.length === 1 ? cluster[0]! : createGroupedActivityItem(cluster)
    )
    index = nextIndex
  }

  return grouped
}

export function formatActivityMessage(item: ActivityItem): string {
  const groupedCount = item.groupedCount ?? 1
  const groupedClientCount = item.groupedClientIds?.length ?? 1
  const isGrouped = groupedCount > 1

  if (item.kind === 'check_in') {
    if (!isGrouped) {
      return 'submitted a check-in'
    }

    if (groupedClientCount === 1) {
      return `submitted ${groupedCount} check-ins`
    }

    return 'each submitted a check-in'
  }

  if (item.kind === 'form_review') {
    if (!isGrouped) {
      const title = item.formReviewTitle?.trim()
      return title ? `submitted form review: ${title}` : 'submitted a form review'
    }

    if (groupedClientCount === 1) {
      return `submitted ${groupedCount} form reviews`
    }

    return 'each submitted a form review'
  }

  if (isGrouped) {
    if (groupedClientCount === 1) {
      switch (item.status) {
        case 'completed':
          return `completed ${groupedCount} workouts`
        case 'in_progress':
          return `started ${groupedCount} workouts`
        case 'skipped':
          return `skipped ${groupedCount} workouts`
        default:
          return `updated ${groupedCount} workouts`
      }
    }

    switch (item.status) {
      case 'completed':
        return 'each completed a workout'
      case 'in_progress':
        return 'each started a workout'
      case 'skipped':
        return 'each skipped a workout'
      default:
        return 'each updated a workout'
    }
  }

  switch (item.status) {
    case 'completed':
      return `completed ${item.workoutName}`
    case 'in_progress':
      return `started ${item.workoutName}`
    case 'skipped':
      return `skipped ${item.workoutName}`
    default:
      return `updated ${item.workoutName}`
  }
}

export function getActivityHref(item: ActivityItem): string {
  const isGrouped = (item.groupedCount ?? 1) > 1

  if (item.kind === 'check_in') {
    return isGrouped
      ? '/check-ins'
      : `/clients/${item.clientId}?tab=progress&section=check-ins`
  }

  if (item.kind === 'form_review') {
    return '/form-review'
  }

  if (isGrouped) {
    return '/clients'
  }

  return `/clients/${item.clientId}`
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatSessionTime(startedAt: string | null): string {
  if (!startedAt) return 'Anytime'
  return new Date(startedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
