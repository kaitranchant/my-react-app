import type {
  TeamEventAttendanceStatus,
  TeamEventMemberStatus,
} from 'app/types/database'

export type TeamEventAttendanceSnapshot = {
  clientId: string
  attendanceStatus: TeamEventAttendanceStatus | null
  hadStatusRow: boolean
}

export function buildTeamEventAttendanceSnapshot(
  memberClientIds: string[],
  memberStatuses: (Pick<TeamEventMemberStatus, 'client_id' | 'attendance_status'>)[]
): TeamEventAttendanceSnapshot[] {
  return memberClientIds.map((clientId) => {
    const row = memberStatuses.find((status) => status.client_id === clientId)
    return {
      clientId,
      attendanceStatus: row?.attendance_status ?? null,
      hadStatusRow: Boolean(row),
    }
  })
}
