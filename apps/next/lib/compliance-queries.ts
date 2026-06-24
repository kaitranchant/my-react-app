import { addDaysToDateKey } from '@/lib/calendar'
import type { AttendanceClientRow } from '@/lib/attendance'
import {
  buildComplianceRows,
  type ComplianceClientInput,
  type ComplianceClientRow,
  type ComplianceWorkoutRow,
} from '@/lib/compliance'
import { fetchCoachInbox } from '@/lib/message-inbox'
import { fetchCoachDashboardLoadAlerts } from '@/lib/load-queries'
import type { createClient } from '@/lib/supabase/server'

type WorkoutQueryRow = {
  client_id: string
  scheduled_date: string
  status: string
  completed_at: string | null
}

export async function fetchComplianceDashboardRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clients: AttendanceClientRow[],
  options: {
    coachId: string
    todayKey: string
    weekStart: string
    weekEnd: string
    checkInPeriodStart: string
    checkInPeriodEnd: string
    checkInPeriodLabel: string
  }
): Promise<ComplianceClientRow[]> {
  if (clients.length === 0) {
    return []
  }

  const clientIds = clients.map((client) => client.id)
  const lookbackStart = addDaysToDateKey(options.todayKey, -56)

  const [
    workoutsResult,
    periodCheckInsResult,
    pendingCheckInsResult,
    pendingFormReviewsResult,
    inbox,
    loadAlerts,
  ] = await Promise.all([
    supabase
      .from('client_scheduled_workouts')
      .select('client_id, scheduled_date, status, completed_at')
      .in('client_id', clientIds)
      .gte('scheduled_date', lookbackStart),
    supabase
      .from('client_check_ins')
      .select('client_id')
      .in('client_id', clientIds)
      .gte('check_in_date', options.checkInPeriodStart)
      .lte('check_in_date', options.checkInPeriodEnd),
    supabase
      .from('client_check_ins')
      .select('client_id')
      .in('client_id', clientIds)
      .is('reviewed_at', null)
      .eq('submitted_by', 'client'),
    supabase
      .from('client_form_reviews')
      .select('client_id')
      .eq('coach_id', options.coachId)
      .is('reviewed_at', null)
      .in('client_id', clientIds),
    fetchCoachInbox(supabase, options.coachId),
    fetchCoachDashboardLoadAlerts(
      supabase,
      clients.map((client) => ({
        id: client.id,
        full_name: client.full_name,
      }))
    ),
  ])

  const workoutsByClientId = new Map<string, ComplianceWorkoutRow[]>()
  for (const row of (workoutsResult.data ?? []) as WorkoutQueryRow[]) {
    const existing = workoutsByClientId.get(row.client_id) ?? []
    existing.push({
      scheduled_date: String(row.scheduled_date).slice(0, 10),
      status: row.status,
      completed_at: row.completed_at,
    })
    workoutsByClientId.set(row.client_id, existing)
  }

  const checkInPeriodClientIds = new Set(
    (periodCheckInsResult.data ?? []).map((row) => row.client_id as string)
  )

  const pendingCheckInsByClientId = new Map<string, number>()
  for (const row of pendingCheckInsResult.data ?? []) {
    const clientId = row.client_id as string
    pendingCheckInsByClientId.set(
      clientId,
      (pendingCheckInsByClientId.get(clientId) ?? 0) + 1
    )
  }

  const pendingFormReviewsByClientId = new Map<string, number>()
  for (const row of pendingFormReviewsResult.data ?? []) {
    const clientId = row.client_id as string
    pendingFormReviewsByClientId.set(
      clientId,
      (pendingFormReviewsByClientId.get(clientId) ?? 0) + 1
    )
  }

  const unreadByClientId = new Map(
    inbox.conversations.map((conversation) => [
      conversation.clientId,
      conversation.unreadCount,
    ])
  )

  const loadContextByClientId = new Map(
    loadAlerts.clientContexts.map((context) => [context.clientId, context])
  )

  const scopedClientIds = new Set(clientIds)
  const inputs: ComplianceClientInput[] = clients.map((client) => ({
    clientId: client.id,
    clientName: client.full_name,
    avatarUrl: client.avatar_url,
    workouts: workoutsByClientId.get(client.id) ?? [],
    hasCheckInThisPeriod: checkInPeriodClientIds.has(client.id),
    pendingCheckInReviews: pendingCheckInsByClientId.get(client.id) ?? 0,
    unreadMessages: unreadByClientId.get(client.id) ?? 0,
    pendingFormReviews: pendingFormReviewsByClientId.get(client.id) ?? 0,
    loadContext: loadContextByClientId.get(client.id) ?? null,
  }))

  return buildComplianceRows(
    inputs.filter((input) => scopedClientIds.has(input.clientId)),
    {
      todayKey: options.todayKey,
      weekStart: options.weekStart,
      weekEnd: options.weekEnd,
      checkInPeriodLabel: options.checkInPeriodLabel,
    }
  )
}
