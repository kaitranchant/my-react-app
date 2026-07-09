import { createClient } from '@/lib/supabase/server'
import {
  attendanceScopeSuspenseKey,
  fetchAttendanceDateData,
  fetchAttendanceScopeData,
} from '@/lib/attendance-page-data'
import { AttendanceInteractiveBody } from '@/components/attendance/attendance-interactive-body'
import type { CoachTeam } from '@/lib/attendance'
import type { AttendanceViewMode } from '@/lib/validations/attendance'
import type { WeekStartsOn } from 'app/types/database'

type AttendanceContentProps = {
  searchParams: {
    scope?: string
    team?: string
  }
  userId: string
  coachGyms: { id: string; name: string }[]
  coachTeams: CoachTeam[]
  gymInvitedOnly?: boolean
  date: string
  view: AttendanceViewMode
  weekStartsOn: WeekStartsOn
  today: string
}

export async function AttendanceContent({
  searchParams,
  userId,
  coachGyms,
  coachTeams,
  gymInvitedOnly = false,
  date,
  view,
  weekStartsOn,
  today,
}: AttendanceContentProps) {
  const supabase = await createClient()
  const scopeData = await fetchAttendanceScopeData({
    supabase,
    userId,
    coachGyms,
    coachTeams,
    scopeParam: searchParams.scope,
    teamParam: searchParams.team,
    gymInvitedOnly,
  })
  const dateData = await fetchAttendanceDateData({
    supabase,
    userId,
    date,
    view,
    weekStartsOn,
    scopeData,
  })

  return (
    <AttendanceInteractiveBody
      scopeData={scopeData}
      initialDateData={dateData}
      date={date}
      view={view}
      weekStartsOn={weekStartsOn}
      userId={userId}
      today={today}
    />
  )
}

export { attendanceScopeSuspenseKey }
