import { Suspense } from 'react'

import { ComplianceDashboard } from '@/components/compliance/compliance-dashboard'
import { ComplianceDashboardSkeleton } from '@/components/compliance/compliance-dashboard-skeleton'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  fetchAttendanceClients,
  fetchCoachTeams,
  parseAttendanceScope,
} from '@/lib/attendance'
import {
  getCheckInPeriodBounds,
  getCheckInPeriodLabel,
} from '@/lib/check-in-cadence'
import {
  defaultCoachPreferences,
  getCoachDateKey,
  getWeekRange,
} from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchComplianceDashboardRows } from '@/lib/compliance-queries'
import {
  filterComplianceRows,
  parseComplianceFilter,
  parseComplianceSort,
  sortComplianceRows,
} from '@/lib/compliance'
import { getGymsForCoach } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Compliance — Coaching App',
}

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string
    team?: string
    filter?: string
    sort?: string
    client?: string
  }>
}) {
  const {
    scope: scopeParam,
    team: teamParam,
    filter: filterParam,
    sort: sortParam,
    client: clientParam,
  } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : defaultCoachPreferences

  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const coachTeams = user ? await fetchCoachTeams(supabase, user.id) : []
  const scope = parseAttendanceScope(
    scopeParam,
    teamParam,
    coachGymIds,
    coachGyms,
    coachTeams
  )

  const todayKey = getCoachDateKey(coachPreferences.timezone)
  const { start: weekStart, end: weekEnd } = getWeekRange(
    coachPreferences.weekStartsOn,
    coachPreferences.timezone
  )
  const { start: checkInPeriodStart, end: checkInPeriodEnd } =
    getCheckInPeriodBounds(
      coachPreferences.defaultCheckInFrequency,
      coachPreferences.weekStartsOn,
      coachPreferences.timezone
    )
  const checkInPeriodLabel = getCheckInPeriodLabel(
    coachPreferences.defaultCheckInFrequency
  )

  const clients = user
    ? await fetchAttendanceClients(supabase, {
        scope,
        coachGymIds,
        userId: user.id,
      })
    : []

  const rows = user
    ? await fetchComplianceDashboardRows(supabase, clients, {
        coachId: user.id,
        todayKey,
        weekStart,
        weekEnd,
        checkInPeriodStart,
        checkInPeriodEnd,
        checkInPeriodLabel,
      })
    : []

  const filter = parseComplianceFilter(filterParam)
  const visibleCount = sortComplianceRows(
    filterComplianceRows(rows, filter),
    parseComplianceSort(sortParam)
  ).length

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Compliance"
        description="One place to see who needs a nudge — missed workouts, overdue check-ins, unread messages, and load flags."
      >
        {visibleCount > 0 && filter === 'needs_attention' ? (
          <span className="bg-status-warning/10 text-status-warning-foreground rounded-full px-3 py-1 text-xs font-medium">
            {visibleCount} client{visibleCount === 1 ? '' : 's'} need attention
          </span>
        ) : null}
      </PageHeader>

      <Suspense fallback={<ComplianceDashboardSkeleton />}>
        <ComplianceDashboard
          rows={rows}
          gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
          teams={coachTeams}
          checkInPeriodLabel={checkInPeriodLabel}
          initialClientId={clientParam ?? null}
        />
      </Suspense>
    </div>
  )
}
