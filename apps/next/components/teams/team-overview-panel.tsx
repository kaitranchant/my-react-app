'use client'

import Link from 'next/link'
import { Activity, CalendarCheck, Trophy } from 'lucide-react'

import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  TeamActivityItem,
  TeamMemberPerformance,
  TeamPerformanceSummary,
} from 'app/types/database'

type TeamOverviewPanelProps = {
  teamId: string
  performance: TeamPerformanceSummary
  activity: TeamActivityItem[]
  memberAvatars?: Record<string, string | null | undefined>
}

type GroupedActivityItem = {
  id: string
  type: TeamActivityItem['type']
  clientId: string
  clientName: string
  label: string
  timestamps: string[]
  count: number
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
      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight sm:mt-1 sm:text-2xl">
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs sm:mt-1">{hint}</p>
      </CardContent>
    </Card>
  )
}

function activityIcon(type: TeamActivityItem['type']) {
  if (type === 'workout') return Activity
  if (type === 'check_in') return CalendarCheck
  return Trophy
}

function groupConsecutiveActivity(items: TeamActivityItem[]): GroupedActivityItem[] {
  const groups: GroupedActivityItem[] = []

  for (const item of items) {
    const last = groups[groups.length - 1]
    if (
      last &&
      last.clientId === item.clientId &&
      last.type === item.type &&
      last.label === item.label
    ) {
      last.timestamps.push(item.timestamp)
      last.count += 1
      continue
    }

    groups.push({
      id: item.id,
      type: item.type,
      clientId: item.clientId,
      clientName: item.clientName,
      label: item.label,
      timestamps: [item.timestamp],
      count: 1,
    })
  }

  return groups
}

function formatGroupedActivityLabel(item: GroupedActivityItem): string {
  if (item.count === 1) return item.label

  if (item.type === 'check_in' && item.label === 'Submitted check-in') {
    return `submitted ${item.count} check-ins`
  }

  const lower = item.label.charAt(0).toLowerCase() + item.label.slice(1)
  return `${lower} (${item.count}×)`
}

function formatActivityTimeRange(timestamps: string[]): string {
  const sorted = [...timestamps].sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime()
  )
  const start = sorted[0]
  const end = sorted[sorted.length - 1]

  const datePart = new Date(start).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  if (sorted.length === 1) {
    const time = new Date(start).toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${datePart} · ${time}`
  }

  const startTime = new Date(start).toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const endTime = new Date(end).toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${datePart} · ${startTime}–${endTime}`
}

export function TeamOverviewPanel({
  teamId,
  performance,
  activity,
  memberAvatars = {},
}: TeamOverviewPanelProps) {
  const groupedActivity = groupConsecutiveActivity(activity)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Avg completion"
          value={
            performance.avgCompletionRate !== null
              ? `${performance.avgCompletionRate}%`
              : '—'
          }
          hint="This week"
        />
        <StatCard
          label="On track"
          value={String(performance.onTrackCount)}
          hint="Meeting targets"
        />
        <StatCard
          label="Needs attention"
          value={String(performance.behindCount)}
          hint="Low completion"
        />
        <StatCard
          label="Team ACWR"
          value={performance.avgAcwrLabel}
          hint={
            performance.avgAcwrLabel === '—'
              ? 'Needs more data'
              : 'Avg workload ratio'
          }
        />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
          <CardTitle className="text-muted-foreground text-sm font-semibold">
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {groupedActivity.length === 0 ? (
            <p className="text-muted-foreground px-4 py-5 text-sm sm:px-5 sm:py-6">
              Team activity will appear here when members log workouts, submit
              check-ins, or hit PRs.
            </p>
          ) : (
            <ul className="divide-y">
              {groupedActivity.map((item) => {
                const Icon = activityIcon(item.type)
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3"
                  >
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    <p className="min-w-0 flex-1 truncate text-sm">
                      <Link
                        href={`/clients/${item.clientId}`}
                        className="hover:text-brand font-medium transition-colors"
                      >
                        {item.clientName}
                      </Link>{' '}
                      <span className="text-muted-foreground">
                        {formatGroupedActivityLabel(item)}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {formatActivityTimeRange(item.timestamps)}
                      </span>
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {performance.members.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-muted-foreground text-sm font-semibold">
                Member status
              </CardTitle>
              <Link
                href={`/teams/${teamId}?tab=members`}
                className="text-brand text-xs font-medium hover:underline"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {performance.members.map((member) => (
                <MemberStatusRow
                  key={member.clientId}
                  member={member}
                  avatarUrl={memberAvatars[member.clientId]}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MemberStatusRow({
  member,
  avatarUrl,
}: {
  member: TeamMemberPerformance
  avatarUrl?: string | null
}) {
  const meta = [
    member.completionRate !== null
      ? `${member.completionRate}% complete`
      : 'No sessions',
    member.lastActiveLabel === 'No activity yet' ? 'No activity' : member.lastActiveLabel,
    `ACWR ${member.acwrLabel}`,
  ].join(' · ')

  return (
    <li className="flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
      <ClientAvatar
        name={member.clientName}
        avatarUrl={avatarUrl}
        size="sm"
        className="shrink-0"
      />
      <p className="min-w-0 flex-1 truncate text-sm">
        <Link
          href={`/clients/${member.clientId}`}
          className="hover:text-brand font-medium transition-colors"
        >
          {member.clientName}
        </Link>
        <span className="text-muted-foreground"> · {meta}</span>
      </p>
      <Badge
        variant={member.onTrack ? 'success' : 'warning'}
        className="shrink-0 text-xs"
      >
        {member.onTrack ? 'On track' : 'Attention'}
      </Badge>
    </li>
  )
}
