'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Download,
  EyeOff,
  Gauge,
  TrendingUp,
  Users,
} from 'lucide-react'

import { GymCoachFilter } from '@/components/gym/gym-coach-filter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PersonRow } from '@/components/ui/person-row'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatGymMetricsCsv,
  filterGymDashboardByCoach,
  type GymClientListItem,
  type GymCoachMetrics,
  type GymOwnerDashboard,
} from '@/lib/gym-metrics'
import { formatSessionCompliance } from '@/lib/compliance'
import { cn } from '@/lib/utils'

type GymOverviewPanelProps = {
  gymId: string
  gymName: string
  dashboard: GymOwnerDashboard
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'warning' | 'success'
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p
          className={cn(
            'mt-0.5 text-xl font-semibold tracking-tight sm:mt-1 sm:text-2xl',
            tone === 'warning' && value !== '—' && 'text-status-warning-foreground',
            tone === 'success' && value !== '—' && 'text-status-success-foreground'
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs sm:mt-1">{hint}</p>
      </CardContent>
    </Card>
  )
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

function coachLabel(
  coach: GymCoachMetrics,
  index: number,
  anonymize: boolean
): string {
  if (anonymize) {
    return `Coach ${String.fromCharCode(65 + index)}`
  }
  return coach.coachName
}

export function GymOverviewPanel({
  gymId,
  gymName,
  dashboard,
}: GymOverviewPanelProps) {
  const [anonymize, setAnonymize] = React.useState(false)
  const [selectedCoachId, setSelectedCoachId] = React.useState<string | null>(
    null
  )
  const filteredDashboard = React.useMemo(
    () => filterGymDashboardByCoach(dashboard, selectedCoachId),
    [dashboard, selectedCoachId]
  )
  const { summary, coaches, clients, hasSharedClients } = filteredDashboard
  const selectedCoach = coaches.find((coach) => coach.coachId === selectedCoachId)
  const scopeQuery = `scope=${gymId}`

  function handleExportCsv() {
    const csv = formatGymMetricsCsv(filteredDashboard, { anonymize, gymName })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const monthSlug = summary.monthLabel.toLowerCase().replace(/\s+/g, '-')
    link.href = url
    link.download = `${gymName.toLowerCase().replace(/\s+/g, '-')}-stats-${monthSlug}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!hasSharedClients) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Users}
          title="No shared clients yet"
          description="Gym metrics appear once coaches share clients or teams with the gym. Ask coaches to add clients from their profiles or use the Manage tab to share your own."
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coach roster</CardTitle>
            <CardDescription>
              {summary.totalCoaches} coach
              {summary.totalCoaches === 1 ? '' : 'es'} in this gym
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <CoachComparisonTable
              coaches={coaches}
              anonymize={anonymize}
              showEmptyState
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {summary.monthLabel}
          {selectedCoach
            ? ` · ${selectedCoach.coachName}'s shared clients`
            : ' · shared gym clients only'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <GymCoachFilter
        coaches={coaches}
        selectedCoachId={selectedCoachId}
        onChange={setSelectedCoachId}
      />

      {selectedCoach && summary.totalActiveClients === 0 ? (
        <EmptyState
          icon={Users}
          title="No shared clients for this coach"
          description={`${selectedCoach.coachName} has not shared any clients with the gym yet.`}
        />
      ) : (
        <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Active clients"
          value={String(summary.totalActiveClients)}
          hint={
            selectedCoach
              ? `${selectedCoach.coachName}'s roster`
              : `Across ${summary.totalCoaches} coaches`
          }
        />
        <StatCard
          label="Attendance rate"
          value={formatPercent(summary.attendanceRate)}
          hint={`${summary.monthLabel} roll-call`}
          tone={
            summary.attendanceRate !== null && summary.attendanceRate < 70
              ? 'warning'
              : 'default'
          }
        />
        <StatCard
          label="Session completion"
          value={formatPercent(summary.sessionCompletionRate)}
          hint="This week"
          tone={
            summary.sessionCompletionRate !== null &&
            summary.sessionCompletionRate >= 70
              ? 'success'
              : 'default'
          }
        />
        <StatCard
          label="Needs attention"
          value={String(summary.clientsNeedingAttention)}
          hint="Compliance flags"
          tone={summary.clientsNeedingAttention > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Elevated load"
          value={String(summary.elevatedLoadClients)}
          hint="ACWR alerts"
          tone={summary.elevatedLoadClients > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Injury flags"
          value={String(summary.injuryFlagClients)}
          hint="Recent check-ins"
          tone={summary.injuryFlagClients > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Revenue"
          value="—"
          hint="Stripe integration coming soon"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/compliance?${scopeQuery}`}>
            <AlertTriangle className="size-4" />
            Compliance
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/attendance?${scopeQuery}`}>
            <Activity className="size-4" />
            Attendance
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/load?${scopeQuery}`}>
            <Gauge className="size-4" />
            Load
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/leaderboards?${scopeQuery}`}>
            <TrendingUp className="size-4" />
            Leaderboards
          </Link>
        </Button>
      </div>
        </>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Coach comparison</CardTitle>
              <CardDescription>
                Side-by-side performance across shared clients
              </CardDescription>
            </div>
            <Button
              type="button"
              variant={anonymize ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAnonymize((value) => !value)}
            >
              <EyeOff className="size-4" />
              Anonymize
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <CoachComparisonTable
            coaches={coaches}
            anonymize={anonymize}
            selectedCoachId={selectedCoachId}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
          <CardTitle className="text-base">Shared clients</CardTitle>
          <CardDescription>
            Clients shared with this gym by member coaches
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <GymClientListTable
            clients={clients}
            showCoachColumn={!selectedCoachId}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function GymClientListTable({
  clients,
  showCoachColumn,
}: {
  clients: GymClientListItem[]
  showCoachColumn: boolean
}) {
  if (clients.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-5 text-sm sm:px-5">
        No shared clients yet. Coaches can add clients from the Manage tab or
        from each client profile.
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
              <PersonRow
                name={client.clientName}
                avatarUrl={client.avatarUrl}
                href={`/clients/${client.clientId}`}
              />
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

function CoachComparisonTable({
  coaches,
  anonymize,
  selectedCoachId = null,
  showEmptyState = false,
}: {
  coaches: GymCoachMetrics[]
  anonymize: boolean
  selectedCoachId?: string | null
  showEmptyState?: boolean
}) {
  if (coaches.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-5 text-sm sm:px-5">
        No coaches in this gym yet.
      </p>
    )
  }

  const hasAnyClients = coaches.some((coach) => coach.activeClients > 0)

  if (showEmptyState && !hasAnyClients) {
    return (
      <p className="text-muted-foreground px-4 py-5 text-sm sm:px-5">
        Active client counts will appear here once coaches share clients with
        the gym.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Coach</TableHead>
          <TableHead className="text-right">Clients</TableHead>
          <TableHead className="text-right">Attendance</TableHead>
          <TableHead className="text-right">Completion</TableHead>
          <TableHead className="text-right">Attention</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Load</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Injury</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coaches.map((coach, index) => (
          <TableRow
            key={coach.coachId}
            className={cn(
              selectedCoachId === coach.coachId && 'bg-brand/5'
            )}
          >
            <TableCell className="font-medium">
              {coachLabel(coach, index, anonymize)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {coach.activeClients}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(coach.attendanceRate)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(coach.sessionCompletionRate)}
            </TableCell>
            <TableCell className="text-right">
              {coach.clientsNeedingAttention > 0 ? (
                <Badge variant="warning" className="tabular-nums">
                  {coach.clientsNeedingAttention}
                </Badge>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {coach.elevatedLoadClients}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {coach.injuryFlagClients}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
