import Link from 'next/link'
import { Activity, PauseCircle, TrendingUp, Users } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getCompletionRateStatusLevel,
  statusTextClass,
} from '@/lib/status-colors'
import { cn } from '@/lib/utils'

type DashboardStatsProps = {
  activeClients: number
  totalClients: number
  pausedClients: number
  completionRate: number | null
  weekWorkoutCount: number
}

type StatCardProps = {
  label: string
  value: string
  hint: string
  href?: string
  valueClassName?: string
  className?: string
}

function StatCard({
  label,
  value,
  hint,
  href,
  valueClassName,
  className,
}: StatCardProps) {
  const card = (
    <Card
      className={cn(
        'gap-0 py-0',
        href && 'transition-colors group-hover:border-brand/40',
        className
      )}
    >
      <CardContent className="space-y-1 px-4 py-4 sm:px-5 sm:py-5">
        <p className="section-header text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-2xl font-semibold tracking-tight sm:text-3xl',
            valueClassName
          )}
        >
          {value}
        </p>
        <p className="helper-text">{hint}</p>
      </CardContent>
    </Card>
  )

  if (!href) {
    return card
  }

  return (
    <Link href={href} className="group block">
      {card}
    </Link>
  )
}

export function DashboardStats({
  activeClients,
  totalClients,
  pausedClients,
  completionRate,
  weekWorkoutCount,
}: DashboardStatsProps) {
  const completionDisplay =
    completionRate !== null ? `${completionRate}%` : '—'
  const completionHint =
    weekWorkoutCount > 0
      ? `${weekWorkoutCount} session${weekWorkoutCount === 1 ? '' : 's'} this week`
      : 'No sessions this week'
  const completionStatus = getCompletionRateStatusLevel(
    completionRate,
    weekWorkoutCount
  )
  const completionValueClass =
    completionStatus === 'warning'
      ? statusTextClass.warning
      : completionStatus === 'success'
        ? statusTextClass.success
        : 'text-brand'
  const completionBarClass =
    completionStatus === 'warning'
      ? 'bg-status-warning'
      : completionStatus === 'success'
        ? 'bg-status-success'
        : 'bg-brand'

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <StatCard
          label="Completion rate"
          value={completionDisplay}
          hint={completionHint}
          valueClassName={completionValueClass}
        />
        <StatCard
          label="Active clients"
          value={String(activeClients)}
          hint="In your care"
          href="/clients?status=active"
        />
        <StatCard
          label="Total clients"
          value={String(totalClients)}
          hint="On your roster"
          href="/clients"
        />
        <StatCard
          label="On pause"
          value={String(pausedClients)}
          hint="Temporarily paused"
          href="/clients?status=paused"
          valueClassName={pausedClients > 0 ? undefined : 'text-muted-foreground'}
        />
      </div>

      <div className="hidden items-stretch gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand/15 from-brand/5 gap-0 bg-gradient-to-br to-transparent py-0 sm:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pt-5 pb-3">
            <div className="space-y-2">
              <CardTitle className="text-muted-foreground">
                Session completion
              </CardTitle>
              <div
                className={cn(
                  'text-4xl font-semibold tracking-tight sm:text-5xl',
                  completionValueClass
                )}
              >
                {completionDisplay}
              </div>
              <p className="helper-text">{completionHint}</p>
            </div>
            <div className="bg-brand/10 text-brand flex size-11 items-center justify-center rounded-xl">
              <TrendingUp className="size-5" />
            </div>
          </CardHeader>
          {completionRate !== null && (
            <CardContent className="px-5 pb-5">
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    completionBarClass
                  )}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </CardContent>
          )}
        </Card>

        <Link href="/clients?status=active" className="group block h-full min-h-0">
          <Card className="h-full gap-0 py-0 transition-colors group-hover:border-brand/40">
            <CardHeader className="flex h-full flex-row items-start justify-between space-y-0 px-5 pt-5 pb-5">
              <div className="space-y-2">
                <CardTitle className="text-muted-foreground">
                  Active clients
                </CardTitle>
                <div className="text-3xl font-semibold tracking-tight">
                  {activeClients}
                </div>
                <p className="helper-text">Currently in your care</p>
              </div>
              <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-xl">
                <Activity className="size-[18px]" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <div className="grid h-full gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
          <Link href="/clients" className="group block h-full min-h-0">
            <Card className="h-full gap-0 py-0 transition-colors group-hover:border-brand/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-4">
                <div className="space-y-1">
                  <CardTitle className="helper-text font-medium">
                    Total clients
                  </CardTitle>
                  <div className="text-2xl font-semibold tracking-tight">
                    {totalClients}
                  </div>
                </div>
                <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                  <Users className="size-4" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/clients?status=paused" className="group block h-full min-h-0">
            <Card className="h-full gap-0 py-0 transition-colors group-hover:border-brand/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-4">
                <div className="space-y-1">
                  <CardTitle className="helper-text font-medium">On pause</CardTitle>
                  <div className="text-muted-foreground text-2xl font-semibold tracking-tight">
                    {pausedClients}
                  </div>
                </div>
                <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                  <PauseCircle className="size-4" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </>
  )
}
