'use client'

import * as React from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Users } from 'lucide-react'

import { LoadSparkline } from '@/components/load/load-sparkline'
import { VolumeBarChart } from '@/components/load/volume-bar-chart'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PersonRow } from '@/components/ui/person-row'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  buildAcwrAlerts,
  buildLoadSummaryCounts,
  formatMetricDelta,
  formatMetricValue,
  getAcwrBadgeClass,
  getDateRangeBounds,
  getReadinessDotClass,
  sumMetricInRange,
  type LoadDateRange,
  type LoadMetric,
} from '@/lib/load-analytics'
import { statusTextClass } from '@/lib/status-colors'
import type { ClientLoadSummary } from '@/lib/load-queries'
import { cn } from '@/lib/utils'
import type { WeightUnit } from 'app/types/database'

type LoadDashboardProps = {
  summaries: ClientLoadSummary[]
  initialClientId?: string | null
  weightUnit?: WeightUnit
}

function getMetricRows(summary: ClientLoadSummary, metric: LoadMetric) {
  switch (metric) {
    case 'sessions':
      return summary.sessionRows
    case 'time':
      return summary.timeRows
    default:
      return summary.tonnageRows
  }
}

function getWeeklyBuckets(summary: ClientLoadSummary, metric: LoadMetric) {
  switch (metric) {
    case 'sessions':
      return summary.weeklySessions
    case 'time':
      return summary.weeklyTime
    default:
      return summary.weeklyTonnage
  }
}

function getPriorRangeBounds(range: LoadDateRange) {
  if (range === 'this_week') return getDateRangeBounds('last_week')
  if (range === 'last_week') {
    const lastWeek = getDateRangeBounds('last_week')
    const start = new Date(`${lastWeek.start}T12:00:00`)
    start.setDate(start.getDate() - 7)
    const end = new Date(`${lastWeek.start}T12:00:00`)
    end.setDate(end.getDate() - 1)
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: 'Prior week',
    }
  }
  return null
}

function countSessionCompliance(
  workouts: ClientLoadSummary['workouts'],
  start: string,
  end: string
) {
  const inRange = workouts.filter(
    (workout) =>
      workout.scheduled_date >= start && workout.scheduled_date <= end
  )
  return {
    completed: inRange.filter((workout) => workout.status === 'completed').length,
    planned: inRange.filter((workout) => workout.status !== 'skipped').length,
  }
}

function formatLastActive(days: number | null): string {
  if (days == null) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function getLoadRowMetrics(
  summary: ClientLoadSummary,
  metric: LoadMetric,
  dateRange: LoadDateRange
) {
  const rangeBounds = getDateRangeBounds(dateRange)
  const priorBounds = getPriorRangeBounds(dateRange)
  const metricRows = getMetricRows(summary, metric)
  const weeklyBuckets = getWeeklyBuckets(summary, metric)
  const currentValue = sumMetricInRange(
    metricRows,
    rangeBounds.start,
    rangeBounds.end
  )
  const previousValue = priorBounds
    ? sumMetricInRange(metricRows, priorBounds.start, priorBounds.end)
    : dateRange === 'rolling_4'
      ? currentValue / 4
      : 0
  const sessionCounts = countSessionCompliance(
    summary.workouts,
    rangeBounds.start,
    rangeBounds.end
  )

  return {
    rangeBounds,
    priorBounds,
    metricRows,
    weeklyBuckets,
    currentValue,
    previousValue,
    sessionCounts,
  }
}

function metricColumnLabelFor(metric: LoadMetric) {
  return metric === 'tonnage'
    ? 'Tonnage'
    : metric === 'sessions'
      ? 'Sessions'
      : 'Time'
}

type LoadClientExpandedPanelProps = {
  summary: ClientLoadSummary
  metric: LoadMetric
  metricColumnLabel: string
  weeklyBuckets: ReturnType<typeof getWeeklyBuckets>
  weightUnit: WeightUnit
}

function LoadClientExpandedPanel({
  summary,
  metric,
  metricColumnLabel,
  weeklyBuckets,
  weightUnit,
}: LoadClientExpandedPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-3 text-sm font-medium">
          8-week {metricColumnLabel.toLowerCase()} trend
        </p>
        <VolumeBarChart
          buckets={weeklyBuckets}
          metric={metric}
          weightUnit={weightUnit}
        />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">Recent PRs</p>
        {summary.recentPrs.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {summary.recentPrs.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  {pr.exerciseName} · {pr.label}
                </span>
                <span className="text-muted-foreground text-xs">{pr.date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No PRs recorded yet.</p>
        )}
      </div>
    </div>
  )
}

type LoadClientMobileCardProps = {
  summary: ClientLoadSummary
  metric: LoadMetric
  metricColumnLabel: string
  rangeLabel: string
  expanded: boolean
  onToggle: () => void
  weeklyBuckets: ReturnType<typeof getWeeklyBuckets>
  currentValue: number
  previousValue: number
  sessionCounts: ReturnType<typeof countSessionCompliance>
  weightUnit: WeightUnit
}

function LoadClientMobileCard({
  summary,
  metric,
  metricColumnLabel,
  rangeLabel,
  expanded,
  onToggle,
  weeklyBuckets,
  currentValue,
  previousValue,
  sessionCounts,
  weightUnit,
}: LoadClientMobileCardProps) {
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
              name={summary.clientName}
              avatarUrl={summary.avatarUrl}
              href={`/clients/${summary.clientId}`}
              stopLinkPropagation
            />
            <div className="flex items-center gap-3">
              <LoadSparkline buckets={weeklyBuckets} />
              <Badge
                variant="secondary"
                className={cn(getAcwrBadgeClass(summary.acwrRiskLevel))}
              >
                {summary.acwrLabel}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">
                  {rangeLabel} {metricColumnLabel.toLowerCase()}
                </dt>
                <dd className="font-medium">
                  {formatMetricValue(metric, currentValue, weightUnit)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Change</dt>
                <dd className="text-muted-foreground">
                  {formatMetricDelta(
                    metric,
                    currentValue,
                    previousValue,
                    weightUnit
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Last active</dt>
                <dd className="text-muted-foreground">
                  {formatLastActive(summary.daysSinceLastSession)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Sessions</dt>
                <dd>
                  {sessionCounts.planned > 0
                    ? `${sessionCounts.completed}/${sessionCounts.planned}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Readiness</dt>
                <dd>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2.5 rounded-full',
                        getReadinessDotClass(summary.readinessVariant)
                      )}
                      title={summary.readinessLabel}
                    />
                    <span className="text-muted-foreground text-xs">
                      {summary.readinessLabel}
                    </span>
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Injury</dt>
                <dd>
                  {summary.hasInjuryFlag ? (
                    <AlertTriangle
                      className="size-4 text-red-600"
                      aria-label="Pain flagged in recent check-in"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </button>
      {expanded ? (
        <div className="border-t bg-muted/20 px-4 py-5">
          <LoadClientExpandedPanel
            summary={summary}
            metric={metric}
            metricColumnLabel={metricColumnLabel}
            weeklyBuckets={weeklyBuckets}
            weightUnit={weightUnit}
          />
        </div>
      ) : null}
    </div>
  )
}

export function LoadDashboard({
  summaries,
  initialClientId = null,
  weightUnit = 'lbs',
}: LoadDashboardProps) {
  const [expandedClientId, setExpandedClientId] = React.useState<string | null>(
    initialClientId
  )
  const [metric, setMetric] = React.useState<LoadMetric>('tonnage')
  const [dateRange, setDateRange] = React.useState<LoadDateRange>('this_week')

  const rangeBounds = getDateRangeBounds(dateRange)

  const summaryCounts = buildLoadSummaryCounts(
    summaries.map((summary) => summary.acwrRiskLevel)
  )
  const alerts = buildAcwrAlerts(
    summaries.map((summary) => ({
      clientName: summary.clientName,
      acwrRatio: summary.acwrRatio,
      riskLevel: summary.acwrRiskLevel,
    }))
  )

  if (summaries.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No active clients in this scope"
            description="Add clients or change the gym or team filter to see load data here."
            action={{ label: 'Add a client', href: '/clients?add=1' }}
          />
        </CardContent>
      </Card>
    )
  }

  const metricColumnLabel = metricColumnLabelFor(metric)

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm">
          <span className="font-medium">
            {summaryCounts.total} client{summaryCounts.total === 1 ? '' : 's'}
          </span>
          <span className={statusTextClass.success}>
            {summaryCounts.optimal} in optimal range
          </span>
          <span className={statusTextClass.warning}>
            {summaryCounts.borderline} borderline
          </span>
          <span className={statusTextClass.danger}>
            {summaryCounts.undertraining} undertraining
          </span>
          <span className={statusTextClass.danger}>
            {summaryCounts.overreaching} overreaching
          </span>
          {summaryCounts.unknown > 0 && (
            <span className="text-muted-foreground">
              {summaryCounts.unknown} need more data
            </span>
          )}
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card className="border-status-warning/30 bg-status-warning/5">
          <CardContent className="space-y-2 py-4">
            {alerts.map((alert) => (
              <div
                key={alert}
                className="text-status-warning-foreground flex items-start gap-2 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Client load roster</CardTitle>
            <CardDescription>
              ACWR optimal range is 0.8–1.3. Green = optimal, amber =
              borderline, red = undertraining or overreaching.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select
              value={metric}
              onValueChange={(value) => setMetric(value as LoadMetric)}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tonnage">Tonnage</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
                <SelectItem value="time">Total time</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value as LoadDateRange)}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="last_week">Last week</SelectItem>
                <SelectItem value="rolling_4">Last 4 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="space-y-3 px-4 pb-4 md:hidden">
            {summaries.map((summary) => {
              const expanded = expandedClientId === summary.clientId
              const {
                rangeBounds: rowRangeBounds,
                weeklyBuckets,
                currentValue,
                previousValue,
                sessionCounts,
              } = getLoadRowMetrics(summary, metric, dateRange)

              return (
                <LoadClientMobileCard
                  key={summary.clientId}
                  summary={summary}
                  metric={metric}
                  metricColumnLabel={metricColumnLabel}
                  rangeLabel={rowRangeBounds.label}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedClientId((current) =>
                      current === summary.clientId ? null : summary.clientId
                    )
                  }
                  weeklyBuckets={weeklyBuckets}
                  currentValue={currentValue}
                  previousValue={previousValue}
                  sessionCounts={sessionCounts}
                  weightUnit={weightUnit}
                />
              )
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px] pl-6">Trend</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>{rangeBounds.label} {metricColumnLabel.toLowerCase()}</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>ACWR</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Injury</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => {
                  const expanded = expandedClientId === summary.clientId
                  const {
                    weeklyBuckets,
                    currentValue,
                    previousValue,
                    sessionCounts,
                  } = getLoadRowMetrics(summary, metric, dateRange)

                  return (
                    <React.Fragment key={summary.clientId}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedClientId((current) =>
                            current === summary.clientId
                              ? null
                              : summary.clientId
                          )
                        }
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            {expanded ? (
                              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                            ) : (
                              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                            )}
                            <div className="min-w-[72px]">
                              <LoadSparkline buckets={weeklyBuckets} />
                              <span className="text-muted-foreground mt-1 block text-[10px]">
                                View trend
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PersonRow
                            name={summary.clientName}
                            avatarUrl={summary.avatarUrl}
                            href={`/clients/${summary.clientId}`}
                            stopLinkPropagation
                          />
                        </TableCell>
                        <TableCell>
                          {formatMetricValue(metric, currentValue, weightUnit)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatMetricDelta(
                            metric,
                            currentValue,
                            previousValue,
                            weightUnit
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              getAcwrBadgeClass(summary.acwrRiskLevel)
                            )}
                          >
                            {summary.acwrLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatLastActive(summary.daysSinceLastSession)}
                        </TableCell>
                        <TableCell>
                          {sessionCounts.planned > 0
                            ? `${sessionCounts.completed}/${sessionCounts.planned}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'size-2.5 rounded-full',
                                getReadinessDotClass(summary.readinessVariant)
                              )}
                              title={summary.readinessLabel}
                            />
                            <span className="text-muted-foreground text-xs">
                              {summary.readinessLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {summary.hasInjuryFlag ? (
                            <AlertTriangle
                              className="size-4 text-red-600"
                              aria-label="Pain flagged in recent check-in"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/20 px-6 py-5">
                            <LoadClientExpandedPanel
                              summary={summary}
                              metric={metric}
                              metricColumnLabel={metricColumnLabel}
                              weeklyBuckets={weeklyBuckets}
                              weightUnit={weightUnit}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
