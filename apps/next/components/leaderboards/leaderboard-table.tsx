import { Medal, Trophy, Users } from 'lucide-react'

import { LeaderboardSparkline } from '@/components/leaderboards/leaderboard-sparkline'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatRankChangeLabel,
  getLeaderboardMetricConfig,
  getTopThreeRowClassName,
  type LeaderboardRow,
} from '@/lib/leaderboard'
import { getRankChangeBadgeClass } from '@/lib/status-colors'
import type { LeaderboardMetric } from '@/lib/validations/leaderboard'
import { cn } from '@/lib/utils'

type LeaderboardTableProps = {
  rows: LeaderboardRow[]
  metric: LeaderboardMetric
  exerciseName?: string | null
  teamName?: string
  periodLabel?: string
  showWeightClass?: boolean
  readOnly?: boolean
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  if (rank === 1) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
        <Trophy className="size-4" aria-hidden />
        <span className="sr-only">Rank 1</span>
      </span>
    )
  }

  if (rank === 2) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-400/20 text-slate-700 ring-1 ring-slate-400/30 dark:text-slate-300">
        <Medal className="size-4" aria-hidden />
        <span className="sr-only">Rank 2</span>
      </span>
    )
  }

  if (rank === 3) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-orange-700/15 text-orange-800 ring-1 ring-orange-600/25 dark:text-orange-300">
        <Medal className="size-4" aria-hidden />
        <span className="sr-only">Rank 3</span>
      </span>
    )
  }

  return (
    <span className="text-muted-foreground inline-flex size-8 items-center justify-center text-sm font-medium">
      {rank}
    </span>
  )
}

function RankChangeBadge({
  rankChange,
  rankDelta,
}: {
  rankChange: LeaderboardRow['rankChange']
  rankDelta: LeaderboardRow['rankDelta']
}) {
  const label = formatRankChangeLabel(rankChange, rankDelta)
  if (!label) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        'ml-2 text-[10px] font-semibold tracking-wide',
        getRankChangeBadgeClass(rankChange)
      )}
    >
      {label}
    </Badge>
  )
}

export function LeaderboardTable({
  rows,
  metric,
  exerciseName,
  teamName,
  periodLabel,
  showWeightClass = false,
  readOnly = false,
}: LeaderboardTableProps) {
  const metricConfig = getLeaderboardMetricConfig(metric)
  const rankedCount = rows.filter((row) => row.rank != null).length
  const title = teamName ? `${teamName} leaderboard` : 'Roster leaderboard'

  let description = `${rankedCount} athlete${rankedCount === 1 ? '' : 's'} ranked by ${metricConfig.label.toLowerCase()}`
  if (periodLabel) {
    description += ` · ${periodLabel.toLowerCase()}`
  }
  if (metricConfig.needsExercise) {
    description += ` · ${exerciseName}`
  } else if (exerciseName && metric === 'relative_strength') {
    description += ` · ${exerciseName}`
  }
  description += '.'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No athletes ranked yet"
            description={
              readOnly
                ? 'Log workouts and PRs to appear on the leaderboard once your coach enables rankings.'
                : 'Add active clients and log workouts or PRs to populate this leaderboard.'
            }
            action={
              readOnly
                ? { label: 'Log a workout', href: '/portal/workouts' }
                : { label: 'View clients', href: '/clients' }
            }
            className="px-6 pb-6"
          />
        ) : (
          <>
            <div className="space-y-3 px-4 pb-4 md:hidden">
              {rows.map((row) => (
                <Card key={row.clientId} className="py-0 shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <RankBadge rank={row.rank} />
                      <RankChangeBadge
                        rankChange={row.rankChange}
                        rankDelta={row.rankDelta}
                      />
                    </div>
                    <PersonRow
                      name={row.clientName}
                      avatarUrl={row.avatarUrl}
                      href={readOnly ? undefined : `/clients/${row.clientId}`}
                    />
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        {showWeightClass && row.weightClass ? (
                          <Badge variant="secondary" className="mb-2">
                            {row.weightClass}
                          </Badge>
                        ) : null}
                        <p className="text-muted-foreground text-xs">
                          {metricConfig.valueLabel}
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {row.displayValue}
                        </p>
                      </div>
                      {metric === 'strength' || metric === 'relative_strength'
                        ? row.trendValues.length > 0 && (
                            <LeaderboardSparkline values={row.trendValues} />
                          )
                        : null}
                    </div>
                    {row.detail ? (
                      <p className="text-muted-foreground text-sm">{row.detail}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Table className="hidden md:table">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-16 pl-6">Rank</TableHead>
                <TableHead>Athlete</TableHead>
                {showWeightClass ? <TableHead>Class</TableHead> : null}
                <TableHead>{metricConfig.valueLabel}</TableHead>
                <TableHead className="pr-6">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.clientId}
                  className={getTopThreeRowClassName(row.rank)}
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center">
                      <RankBadge rank={row.rank} />
                      <RankChangeBadge
                        rankChange={row.rankChange}
                        rankDelta={row.rankDelta}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <PersonRow
                      name={row.clientName}
                      avatarUrl={row.avatarUrl}
                      href={readOnly ? undefined : `/clients/${row.clientId}`}
                    />
                  </TableCell>
                  {showWeightClass ? (
                    <TableCell>
                      {row.weightClass ? (
                        <Badge variant="secondary">{row.weightClass}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="font-semibold tabular-nums">
                    {row.displayValue}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">
                          {row.detail ?? '—'}
                        </p>
                      </div>
                      {metric === 'strength' || metric === 'relative_strength'
                        ? row.trendValues.length > 0 && (
                            <LeaderboardSparkline values={row.trendValues} />
                          )
                        : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
