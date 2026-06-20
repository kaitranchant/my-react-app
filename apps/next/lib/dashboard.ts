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
  kind: 'workout' | 'check_in'
  workoutName?: string
  status?: ClientScheduledWorkout['status']
  timestamp: string
}

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
}: {
  clients: Client[]
  pendingInvites: number
  clientsWithoutWorkoutThisWeek: number
  skippedThisWeek: number
  pendingCheckIns?: number
  clientsWithoutCheckInThisPeriod?: number
  checkInPeriodLabel?: string
}): ActionItem[] {
  const items: ActionItem[] = []

  if (pendingCheckIns > 0) {
    items.push({
      id: 'pending-check-ins',
      message: `${pendingCheckIns} client check-in${pendingCheckIns === 1 ? '' : 's'} awaiting review`,
      href: '/check-ins',
      priority: 'high',
    })
  }

  if (clientsWithoutCheckInThisPeriod > 0) {
    items.push({
      id: 'no-check-in',
      message: `${clientsWithoutCheckInThisPeriod} active client${clientsWithoutCheckInThisPeriod === 1 ? '' : 's'} ha${clientsWithoutCheckInThisPeriod === 1 ? 's' : 've'}n't checked in ${checkInPeriodLabel}`,
      href: '/check-ins',
      priority: 'medium',
    })
  }

  if (clientsWithoutWorkoutThisWeek > 0) {
    items.push({
      id: 'no-workout',
      message: `${clientsWithoutWorkoutThisWeek} active client${clientsWithoutWorkoutThisWeek === 1 ? '' : 's'} ha${clientsWithoutWorkoutThisWeek === 1 ? 's' : 've'}n't logged a workout this week`,
      href: '/clients',
      priority: 'high',
    })
  }

  if (skippedThisWeek > 0) {
    items.push({
      id: 'skipped',
      message: `${skippedThisWeek} scheduled workout${skippedThisWeek === 1 ? '' : 's'} skipped this week`,
      href: '/clients',
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

export function mergeActivityFeed(
  workouts: ActivityItem[],
  checkIns: ActivityItem[],
  limit = 8
): ActivityItem[] {
  return [...workouts, ...checkIns]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit)
}

export function formatActivityMessage(item: ActivityItem): string {
  if (item.kind === 'check_in') {
    return 'submitted a check-in'
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
  if (item.kind === 'check_in') {
    return `/clients/${item.clientId}?tab=progress&section=check-ins`
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
