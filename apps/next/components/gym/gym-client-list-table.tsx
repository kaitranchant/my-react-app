import { Badge } from '@/components/ui/badge'
import { PersonRow } from '@/components/ui/person-row'
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
}

export function GymClientListTable({
  clients,
  showCoachColumn = true,
  emptyMessage = 'No shared clients yet. Coaches can add clients from the Manage tab or from each client profile.',
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
          {showCoachColumn ? <TableHead>Coach</TableHead> : null}
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
              <TableCell className="text-muted-foreground">
                {client.coachName}
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
