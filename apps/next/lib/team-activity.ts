import { toDateKey } from '@/lib/calendar'
import { getLastActiveLabel } from '@/lib/client-metrics'
import type { createClient } from '@/lib/supabase/server'
import type { TeamActivityItem } from 'app/types/database'

export async function fetchTeamActivityFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  members: { id: string; full_name: string }[],
  limit = 12
): Promise<TeamActivityItem[]> {
  if (members.length === 0) return []

  const clientIds = members.map((member) => member.id)
  const nameById = new Map(members.map((member) => [member.id, member.full_name]))

  const [workoutsResult, checkInsResult, prsResult] = await Promise.all([
    supabase
      .from('client_scheduled_workouts')
      .select('id, client_id, name, status, completed_at, updated_at')
      .in('client_id', clientIds)
      .in('status', ['completed', 'in_progress'])
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('client_check_ins')
      .select('id, client_id, check_in_date, created_at')
      .in('client_id', clientIds)
      .order('check_in_date', { ascending: false })
      .limit(limit),
    supabase
      .from('exercise_pr_records')
      .select('id, client_id, e1rm, achieved_at, exercise:exercises(name)')
      .in('client_id', clientIds)
      .order('achieved_at', { ascending: false })
      .limit(limit),
  ])

  const items: TeamActivityItem[] = []

  for (const workout of workoutsResult.data ?? []) {
    const timestamp = workout.completed_at ?? workout.updated_at
    items.push({
      id: `workout-${workout.id}`,
      type: 'workout',
      clientId: workout.client_id,
      clientName: nameById.get(workout.client_id) ?? 'Client',
      label:
        workout.status === 'completed'
          ? `Completed ${workout.name}`
          : `Started ${workout.name}`,
      timestamp,
    })
  }

  for (const checkIn of checkInsResult.data ?? []) {
    items.push({
      id: `checkin-${checkIn.id}`,
      type: 'check_in',
      clientId: checkIn.client_id,
      clientName: nameById.get(checkIn.client_id) ?? 'Client',
      label: 'Submitted check-in',
      timestamp: checkIn.created_at,
    })
  }

  for (const pr of prsResult.data ?? []) {
    const exercise = pr.exercise as { name: string } | null
    items.push({
      id: `pr-${pr.id}`,
      type: 'pr',
      clientId: pr.client_id,
      clientName: nameById.get(pr.client_id) ?? 'Client',
      label: exercise?.name
        ? `New PR — ${exercise.name}${pr.e1rm ? ` (${pr.e1rm} lb e1RM)` : ''}`
        : 'New personal record',
      timestamp: pr.achieved_at,
    })
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit)
}

export async function fetchMemberLastActiveLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds: string[]
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {}
  if (clientIds.length === 0) return labels

  const { data } = await supabase
    .from('client_scheduled_workouts')
    .select('id, name, client_id, status, scheduled_date, started_at, completed_at, updated_at')
    .in('client_id', clientIds)
    .in('status', ['completed', 'in_progress', 'skipped'])
    .order('updated_at', { ascending: false })

  const byClient = new Map<string, typeof data>()
  for (const row of data ?? []) {
    const existing = byClient.get(row.client_id) ?? []
    if (existing.length < 12) existing.push(row)
    byClient.set(row.client_id, existing)
  }

  for (const clientId of clientIds) {
    labels[clientId] = getLastActiveLabel(byClient.get(clientId) ?? [])
  }

  return labels
}

export function parseDateKeyDaysBetween(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T12:00:00`)
  const end = new Date(`${endKey}T12:00:00`)
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000)
}
