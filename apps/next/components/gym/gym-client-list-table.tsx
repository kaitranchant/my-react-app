import { Badge } from '@/components/ui/badge'
import { PersonRow } from '@/components/ui/person-row'
import { GymClientPrimaryCoachCell } from '@/components/gym/gym-client-primary-coach-select'
import type { GymCoachOption } from '@/lib/gym-coach-options'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatSessionCompliance } from '@/lib/compliance'
import type { GymClientListItem } from '@/lib/gym-metrics'

type GymClientListTableProps = {
  clients: GymClientListItem[]
  showCoachColumn?: boolean
  emptyMessage?: string
  gymId?: string
  coachOptions?: GymCoachOption[]
  canAssignPrimaryCoach?: boolean
}

export function GymClientListTable({
  clients,
  showCoachColumn = true,
  emptyMessage = 'No shared clients yet. Coaches can add clients from the Manage tab or from each client profile.',
  gymId,
  coachOptions = [],
  canAssignPrimaryCoach = false,
}: GymClientListTableProps) {
  if (clients.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-5 text-sm sm:px-5">
        {emptyMessage}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          {showCoachColumn ? <TableHead>Primary coach</TableHead> : null}
          <TableHead className="text-right">Attendance</TableHead>
          <TableHead className="text-right">Completion</TableHead>
          <TableHead className="text-right">Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.clientId}>
            <TableCell>
              <div className="flex items-center gap-2">
                <PersonRow
                  name={client.clientName}
                  avatarUrl={client.avatarUrl}
                  href={`/clients/${client.clientId}`}
                />
                {client.isGymCoachMember ? (
                  <Badge variant="secondary">Coach</Badge>
                ) : null}
              </div>
            </TableCell>
            {showCoachColumn ? (
              <TableCell>
                <GymClientPrimaryCoachCell
                  gymId={gymId}
                  clientId={client.clientId}
                  coachId={client.coachId}
                  coachName={client.coachName}
                  coachAvatarUrl={client.coachAvatarUrl}
                  coaches={coachOptions}
                  canAssign={
                    canAssignPrimaryCoach && !client.isGymCoachMember
                  }
                />
              </TableCell>
            ) : null}
            <TableCell className="text-right tabular-nums">
              {client.attendanceRate === null
                ? '—'
                : `${client.attendanceRate}%`}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatSessionCompliance(client.sessionCompletion)}
            </TableCell>
            <TableCell className="text-right">
              {client.issueCount > 0 ? (
                <Badge variant="warning" className="tabular-nums">
                  {client.issueCount}
                </Badge>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
