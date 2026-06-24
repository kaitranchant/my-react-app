'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Users,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
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
import { FilterPills } from '@/components/ui/filter-pills'
import { PersonRow } from '@/components/ui/person-row'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CoachTeam } from '@/lib/attendance'
import {
  buildComplianceSummary,
  filterComplianceRows,
  formatDaysSinceSession,
  formatSessionCompliance,
  getComplianceIssueTone,
  parseComplianceFilter,
  parseComplianceSort,
  sortComplianceRows,
  type ComplianceClientRow,
  type ComplianceSort,
} from '@/lib/compliance'
import { cn } from '@/lib/utils'

type GymTab = {
  id: string
  name: string
}

type ComplianceDashboardProps = {
  rows: ComplianceClientRow[]
  gyms: GymTab[]
  teams: CoachTeam[]
  checkInPeriodLabel: string
  initialClientId?: string | null
}

function SummaryStat({
  label,
  value,
  tone = 'default',
  className,
}: {
  label: string
  value: number
  tone?: 'default' | 'warning' | 'success'
  className?: string
}) {
  return (
    <div className={cn('space-y-0.5 sm:space-y-1', className)}>
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          'text-xl font-semibold tabular-nums sm:text-2xl',
          tone === 'warning' && value > 0 && 'text-status-warning-foreground',
          tone === 'success' && 'text-status-success-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ComplianceIssueList({ issues }: { issues: ComplianceClientRow['issues'] }) {
  if (issues.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No open compliance flags.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li key={`${issue.kind}-${issue.label}`}>
          <Link
            href={issue.href}
            className={cn(
              'block rounded-lg border-l-[3px] px-3 py-2 text-sm transition-colors hover:bg-muted/50',
              getComplianceIssueTone(issue.priority)
            )}
          >
            {issue.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ComplianceClientActions({ clientId }: { clientId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/messages?client=${clientId}`}>
          <MessageSquare className="size-3.5" />
          Message
        </Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link href={`/clients/${clientId}`}>View client</Link>
      </Button>
    </div>
  )
}

function ComplianceMobileCard({
  row,
  expanded,
  onToggle,
}: {
  row: ComplianceClientRow
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="w-full px-4 py-4 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          {expanded ? (
            <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <PersonRow
              as="div"
              name={row.clientName}
              avatarUrl={row.avatarUrl}
              href={`/clients/${row.clientId}`}
              stopLinkPropagation
              badges={
                row.issueCount > 0 ? (
                  <Badge variant="secondary">{row.issueCount} open</Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-status-success/10 text-status-success-foreground"
                  >
                    On track
                  </Badge>
                )
              }
            />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">This week</dt>
                <dd>{formatSessionCompliance(row.sessionCompliance)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Missed (7d)</dt>
                <dd>{row.missedWorkouts7d > 0 ? row.missedWorkouts7d : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Last active</dt>
                <dd>{formatDaysSinceSession(row.daysSinceLastSession)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Messages</dt>
                <dd>{row.unreadMessages > 0 ? row.unreadMessages : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </button>
      {expanded ? (
        <div className="space-y-4 border-t bg-muted/20 px-4 py-5">
          <ComplianceIssueList issues={row.issues} />
          <ComplianceClientActions clientId={row.clientId} />
        </div>
      ) : null}
    </div>
  )
}

export function ComplianceDashboard({
  rows,
  gyms,
  teams,
  checkInPeriodLabel,
  initialClientId = null,
}: ComplianceDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filter = parseComplianceFilter(searchParams.get('filter') ?? undefined)
  const sort = parseComplianceSort(searchParams.get('sort') ?? undefined)

  const filteredRows = filterComplianceRows(rows, filter)
  const visibleRows = sortComplianceRows(filteredRows, sort)
  const summary = buildComplianceSummary(rows)

  const [expandedClientId, setExpandedClientId] = React.useState<string | null>(
    initialClientId
  )

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No active clients in this scope"
            description="Add clients or change the gym or team filter to see compliance here."
            action={{ label: 'Add a client', href: '/clients?add=1' }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4 py-4 sm:gap-6 sm:py-5 lg:grid-cols-4 xl:grid-cols-5">
          <SummaryStat
            label="Need attention"
            value={summary.clientsNeedingAttention}
            tone="warning"
          />
          <SummaryStat
            label="Missed workouts (7d)"
            value={summary.missedWorkouts7d}
            tone="warning"
          />
          <SummaryStat
            label="Unread messages"
            value={summary.unreadMessages}
            tone="warning"
          />
          <SummaryStat
            label="Check-ins to review"
            value={summary.pendingCheckInReviews}
            tone="warning"
          />
          <SummaryStat
            label="On track"
            value={summary.totalClients - summary.clientsNeedingAttention}
            tone="success"
            className="col-span-2 sm:col-span-1"
          />
        </CardContent>
      </Card>

      <AttendanceScopeTabs gyms={gyms} teams={teams} />

      <Card>
        <CardHeader className="gap-3 border-b px-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="space-y-1">
            <CardTitle>Client compliance</CardTitle>
            <CardDescription className="hidden sm:block">
              Missed sessions, check-ins, messages, load flags, and inactivity
              across your roster. Check-in cadence: {checkInPeriodLabel}.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <FilterPills
              value={filter}
              options={[
                { value: 'all', label: 'All clients' },
                {
                  value: 'needs_attention',
                  label: 'Needs attention',
                },
              ]}
              onChange={(value) =>
                updateParam('filter', value === 'all' ? null : value)
              }
            />
            <Select
              value={sort}
              onValueChange={(value: ComplianceSort) =>
                updateParam('sort', value === 'issues' ? null : value)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issues">Most issues</SelectItem>
                <SelectItem value="missed">Most missed</SelectItem>
                <SelectItem value="inactive">Least active</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          {visibleRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="bg-status-success/10 text-status-success-foreground flex size-12 items-center justify-center rounded-xl">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Everyone is on track in this view</p>
                <p className="text-muted-foreground text-sm">
                  Switch to all clients or change the gym or team filter.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Open issues</TableHead>
                      <TableHead>This week</TableHead>
                      <TableHead>Missed (7d)</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((row) => (
                      <TableRow key={row.clientId}>
                        <TableCell className="max-w-[220px]">
                          <PersonRow
                            as="div"
                            name={row.clientName}
                            avatarUrl={row.avatarUrl}
                            href={`/clients/${row.clientId}`}
                          />
                        </TableCell>
                        <TableCell>
                          {row.issueCount > 0 ? (
                            <div className="space-y-2">
                              <Badge variant="secondary">
                                {row.issueCount} open
                              </Badge>
                              <ComplianceIssueList issues={row.issues.slice(0, 3)} />
                              {row.issues.length > 3 ? (
                                <p className="text-muted-foreground text-xs">
                                  +{row.issues.length - 3} more
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              On track
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatSessionCompliance(row.sessionCompliance)}
                        </TableCell>
                        <TableCell>
                          {row.missedWorkouts7d > 0 ? (
                            <span className="text-status-warning-foreground font-medium">
                              {row.missedWorkouts7d}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDaysSinceSession(row.daysSinceLastSession)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ComplianceClientActions clientId={row.clientId} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 px-4 pb-4 md:hidden">
                {visibleRows.map((row) => (
                  <ComplianceMobileCard
                    key={row.clientId}
                    row={row}
                    expanded={expandedClientId === row.clientId}
                    onToggle={() =>
                      setExpandedClientId((current) =>
                        current === row.clientId ? null : row.clientId
                      )
                    }
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {summary.elevatedLoadClients > 0 || summary.injuryFlagClients > 0 ? (
        <Card className="border-status-warning/25 bg-status-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="text-status-warning-foreground size-4" />
              Load and wellness flags
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex flex-wrap gap-4 text-sm">
            {summary.elevatedLoadClients > 0 ? (
              <Link href="/load" className="text-foreground hover:text-brand">
                {summary.elevatedLoadClients} client
                {summary.elevatedLoadClients === 1 ? '' : 's'} with elevated
                ACWR
              </Link>
            ) : null}
            {summary.injuryFlagClients > 0 ? (
              <Link href="/check-ins" className="text-foreground hover:text-brand">
                {summary.injuryFlagClients} client
                {summary.injuryFlagClients === 1 ? '' : 's'} flagged pain
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
