import { Activity, PauseCircle, TrendingUp, Users } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type DashboardStatsProps = {
  activeClients: number
  totalClients: number
  pausedClients: number
  completionRate: number | null
  weekWorkoutCount: number
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
      ? `${weekWorkoutCount} session${weekWorkoutCount === 1 ? '' : 's'} scheduled this week`
      : 'No sessions scheduled this week'

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-brand/15 from-brand/5 gap-0 bg-gradient-to-br to-transparent py-0 sm:col-span-2 lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pt-5 pb-3">
          <div className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Session completion
            </CardTitle>
            <div className="text-brand text-4xl font-semibold tracking-tight sm:text-5xl">
              {completionDisplay}
            </div>
            <p className="text-muted-foreground text-xs">{completionHint}</p>
          </div>
          <div className="bg-brand/10 text-brand flex size-11 items-center justify-center rounded-xl">
            <TrendingUp className="size-5" />
          </div>
        </CardHeader>
        {completionRate !== null && (
          <CardContent className="px-5 pb-5">
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-brand h-full rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pt-5 pb-5">
          <div className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Active clients
            </CardTitle>
            <div className="text-3xl font-semibold tracking-tight">
              {activeClients}
            </div>
            <p className="text-muted-foreground text-xs">
              Currently in your care
            </p>
          </div>
          <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-xl">
            <Activity className="size-[18px]" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                Total clients
              </CardTitle>
              <div className="text-2xl font-semibold tracking-tight">
                {totalClients}
              </div>
            </div>
            <div className={cn('bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg')}>
              <Users className="size-4" />
            </div>
          </CardHeader>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                On pause
              </CardTitle>
              <div className="text-muted-foreground text-2xl font-semibold tracking-tight">
                {pausedClients}
              </div>
            </div>
            <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
              <PauseCircle className="size-4" />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
