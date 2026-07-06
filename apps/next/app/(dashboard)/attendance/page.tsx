import { Suspense } from 'react'

import { AttendanceContent } from '@/components/attendance/attendance-content'
import { attendanceScopeSuspenseKey } from '@/components/attendance/attendance-content'
import { AttendanceContentSkeleton } from '@/components/attendance/attendance-content-skeleton'
import { AttendanceDateNav } from '@/components/attendance/attendance-date-nav'
import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { fetchCoachTeams, isValidAttendanceDate } from '@/lib/attendance'
import { getCoachDateKey } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { getGymsForCoach } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionGate } from '@/lib/subscription-server'
import { parseAttendanceViewMode } from '@/lib/validations/attendance'

export const metadata = {
  title: 'Attendance — Coaching App',
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string
    scope?: string
    team?: string
    view?: string
  }>
}) {
  const gate = await getSubscriptionGate('attendance')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Attendance"
          description="Daily roll call and weekly attendance across clients and teams."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const coachPreferences = await getCoachPreferencesForUser(user.id)
  const today = getCoachDateKey(coachPreferences?.timezone ?? 'auto')
  const date = isValidAttendanceDate(resolvedSearchParams.date)
    ? resolvedSearchParams.date
    : today
  const view = parseAttendanceViewMode(resolvedSearchParams.view)
  const weekStartsOn = coachPreferences?.weekStartsOn ?? 'monday'

  const [coachGyms, coachTeams] = await Promise.all([
    getGymsForCoach(user.id),
    fetchCoachTeams(supabase, user.id),
  ])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Attendance"
        description="Mark daily client presence, review weekly patterns, and manage team event roll call."
      />

      <AttendanceDateNav
        date={date}
        today={today}
        view={view}
        weekStartsOn={weekStartsOn}
      />

      <PageFilterPersistence
        pageKey="attendance"
        filterKeys={['scope', 'team', 'view']}
      />
      <div className="space-y-3">
        <AttendanceScopeTabs gyms={coachGyms} teams={coachTeams} />
        <ClearPageFilters
          pageKey="attendance"
          filterKeys={['scope', 'team']}
        />
      </div>

      <Suspense
        key={attendanceScopeSuspenseKey(resolvedSearchParams)}
        fallback={<AttendanceContentSkeleton />}
      >
        <AttendanceContent
          searchParams={resolvedSearchParams}
          userId={user.id}
          coachGyms={coachGyms}
          coachTeams={coachTeams}
          date={date}
          view={view}
          weekStartsOn={weekStartsOn}
          today={today}
        />
      </Suspense>
    </div>
  )
}
