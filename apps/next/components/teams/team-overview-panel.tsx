'use client'

import Link from 'next/link'
import { Activity, CalendarCheck, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatCompetitionCountdown,
  formatCompetitionDate,
} from '@/lib/team-labels'
import type {
  Team,
  TeamActivityItem,
  TeamMemberPerformance,
  TeamPerformanceSummary,
} from 'app/types/database'

type TeamOverviewPanelProps = {
  team: Pick<Team, 'next_competition_name' | 'next_competition_date'>
  performance: TeamPerformanceSummary
  activity: TeamActivityItem[]
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-4 py-4">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}

function activityIcon(type: TeamActivityItem['type']) {
  if (type === 'workout') return Activity
  if (type === 'check_in') return CalendarCheck
  return Trophy
}

export function TeamOverviewPanel({
  team,
  performance,
  activity,
}: TeamOverviewPanelProps) {
  return (
    <div className="space-y-4">
      {team.next_competition_date && (
        <Card className="border-brand/20 from-brand/5 gap-0 bg-gradient-to-r to-transparent py-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Competition countdown
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight">
                {formatCompetitionCountdown(
                  team.next_competition_date,
                  team.next_competition_name
                )}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatCompetitionDate(team.next_competition_date)}
              </p>
            </div>
            <Trophy className="text-brand size-8 opacity-80" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Avg completion"
          value={
            performance.avgCompletionRate !== null
              ? `${performance.avgCompletionRate}%`
              : '—'
          }
          hint="This week across team members"
        />
        <StatCard
          label="On track"
          value={String(performance.onTrackCount)}
          hint="Meeting completion & load targets"
        />
        <StatCard
          label="Needs attention"
          value={String(performance.behindCount)}
          hint="Low completion or high ACWR"
        />
        <StatCard
          label="Team ACWR"
          value={performance.avgAcwrLabel}
          hint="Average acute:chronic workload ratio"
        />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <p className="text-muted-foreground px-5 py-6 text-sm">
              Team activity will appear here when members log workouts, submit
              check-ins, or hit PRs.
            </p>
          ) : (
            <ul className="divide-y">
              {activity.map((item) => {
                const Icon = activityIcon(item.type)
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-5 py-3 text-sm"
                  >
                    <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p>
                        <Link
                          href={`/clients/${item.clientId}`}
                          className="hover:text-brand font-medium transition-colors"
                        >
                          {item.clientName}
                        </Link>{' '}
                        <span className="text-muted-foreground">{item.label}</span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {performance.members.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/30 px-5 py-4">
            <CardTitle className="text-sm font-medium">Member status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {performance.members.map((member) => (
                <MemberStatusRow key={member.clientId} member={member} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MemberStatusRow({ member }: { member: TeamMemberPerformance }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <Link
        href={`/clients/${member.clientId}`}
        className="hover:text-brand font-medium transition-colors"
      >
        {member.clientName}
      </Link>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {member.completionRate !== null
            ? `${member.completionRate}% complete`
            : 'No sessions'}
        </span>
        <span className="text-muted-foreground">· {member.lastActiveLabel}</span>
        <span className="text-muted-foreground">· ACWR {member.acwrLabel}</span>
        <Badge variant={member.onTrack ? 'success' : 'warning'}>
          {member.onTrack ? 'On track' : 'Needs attention'}
        </Badge>
      </div>
    </li>
  )
}
