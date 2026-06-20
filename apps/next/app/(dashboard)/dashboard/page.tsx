import { createClient } from '@/lib/supabase/server'
import { toDateKey } from '@/lib/calendar'
import {
  buildActionItems,
  buildActivityFeed,
  buildCheckInActivityFeed,
  calcWorkoutCompletionRate,
  getGreeting,
  getWeekRange,
  mergeActivityFeed,
  type TodaySession,
} from '@/lib/dashboard'
import { ActionItems } from '@/components/dashboard/action-items'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { TodaysSchedule } from '@/components/dashboard/todays-schedule'
import { getGymsForCoach } from '@/lib/gym-access'
import type { Client } from 'app/types/database'

export const metadata = {
  title: 'Dashboard — Coaching App',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = toDateKey(new Date())
  const { start: weekStart, end: weekEnd } = getWeekRange()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachGyms = user ? await getGymsForCoach(user.id) : []

  const [{ data: profile }, { data: clients }, { data: todayWorkouts }, { data: weekWorkouts }, { data: recentWorkouts }, { data: weekCheckIns }, { count: pendingCheckInsCount }, { data: recentCheckIns }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .single(),
      supabase
        .from('clients')
        .select('id, full_name, status, invite_status, is_coach_self')
        .eq('is_coach_self', false)
        .order('full_name'),
      supabase
        .from('client_scheduled_workouts')
        .select(
          'id, name, status, scheduled_date, started_at, client_id, clients!inner(full_name, is_coach_self)'
        )
        .eq('scheduled_date', today)
        .eq('clients.is_coach_self', false)
        .order('started_at', { ascending: true, nullsFirst: true })
        .order('name'),
      supabase
        .from('client_scheduled_workouts')
        .select('status, client_id, clients!inner(is_coach_self)')
        .eq('clients.is_coach_self', false)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd),
      supabase
        .from('client_scheduled_workouts')
        .select(
          'id, name, status, completed_at, started_at, updated_at, client_id, clients!inner(full_name, is_coach_self)'
        )
        .eq('clients.is_coach_self', false)
        .in('status', ['completed', 'in_progress', 'skipped'])
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('client_check_ins')
        .select('client_id')
        .gte('check_in_date', weekStart)
        .lte('check_in_date', weekEnd),
      supabase
        .from('client_check_ins')
        .select('*', { count: 'exact', head: true })
        .is('reviewed_at', null)
        .eq('submitted_by', 'client'),
      supabase
        .from('client_check_ins')
        .select('id, client_id, updated_at, created_at, clients(full_name)')
        .order('updated_at', { ascending: false })
        .limit(8),
    ])

  const coachName =
    profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Coach'
  const firstName = coachName.split(' ')[0]

  const allClients = (clients ?? []) as Pick<
    Client,
    'id' | 'full_name' | 'status' | 'invite_status'
  >[]
  const activeClients = allClients.filter((c) => c.status === 'active')
  const pausedClients = allClients.filter((c) => c.status === 'paused').length
  const pendingInvites = allClients.filter(
    (c) => c.invite_status === 'pending'
  ).length

  const sessions: TodaySession[] = (todayWorkouts ?? []).map((w) => {
    const client = w.clients as { full_name: string } | null
    return {
      id: w.id,
      name: w.name,
      status: w.status,
      scheduled_date: w.scheduled_date,
      started_at: w.started_at,
      client_id: w.client_id,
      clientName: client?.full_name ?? 'Unknown client',
    }
  })

  const weekWorkoutList = weekWorkouts ?? []
  const completionRate = calcWorkoutCompletionRate(weekWorkoutList)
  const skippedThisWeek = weekWorkoutList.filter(
    (w) => w.status === 'skipped'
  ).length

  const activeClientIdsWithWorkout = new Set(
    weekWorkoutList
      .filter((w) => w.status === 'completed' || w.status === 'in_progress')
      .map((w) => w.client_id)
  )
  const clientsWithoutWorkoutThisWeek = activeClients.filter(
    (c) => !activeClientIdsWithWorkout.has(c.id)
  ).length

  const activeClientIdsWithCheckIn = new Set(
    (weekCheckIns ?? []).map((checkIn) => checkIn.client_id)
  )
  const clientsWithoutCheckInThisWeek = activeClients.filter(
    (c) => !activeClientIdsWithCheckIn.has(c.id)
  ).length

  const actionItems = buildActionItems({
    clients: allClients as Client[],
    pendingInvites,
    clientsWithoutWorkoutThisWeek,
    skippedThisWeek,
    pendingCheckIns: pendingCheckInsCount ?? 0,
    clientsWithoutCheckInThisWeek,
  })

  const activityItems = mergeActivityFeed(
    buildActivityFeed(
      (recentWorkouts ?? []).map((w) => {
        const client = w.clients as { full_name: string } | null
        return {
          id: w.id,
          name: w.name,
          status: w.status,
          completed_at: w.completed_at,
          started_at: w.started_at,
          updated_at: w.updated_at,
          client_id: w.client_id,
          clientName: client?.full_name ?? 'Unknown client',
        }
      })
    ),
    buildCheckInActivityFeed(
      (recentCheckIns ?? []).map((checkIn) => {
        const client = checkIn.clients as { full_name: string } | null
        return {
          id: checkIn.id,
          client_id: checkIn.client_id,
          updated_at: checkIn.updated_at,
          created_at: checkIn.created_at,
          clientName: client?.full_name ?? 'Unknown client',
        }
      })
    )
  )

  const sessionCount = sessions.length
  const greeting = getGreeting()
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const summary =
    sessionCount > 0
      ? `${sessionCount} session${sessionCount === 1 ? '' : 's'} on your calendar today.`
      : activeClients.length > 0
        ? 'Your calendar is clear today — a great time to plan ahead for your clients.'
        : 'Welcome! Add your first client to start building their program.'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative space-y-5">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">
              {todayLabel}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting}, {firstName}
            </h1>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
              {summary}
            </p>
          </div>
          <QuickActions
            clients={activeClients}
            gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
          />
        </div>
      </section>

      <DashboardStats
        activeClients={activeClients.length}
        totalClients={allClients.length}
        pausedClients={pausedClients}
        completionRate={completionRate}
        weekWorkoutCount={weekWorkoutList.length}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <TodaysSchedule sessions={sessions} />
        <ActionItems items={actionItems} />
      </div>

      <ActivityFeed items={activityItems} />
    </div>
  )
}
