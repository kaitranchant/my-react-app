import Link from 'next/link'
import { Activity, PauseCircle, UserPlus, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Dashboard — Coaching App',
}

type Stat = {
  label: string
  value: number
  icon: typeof Users
  hint: string
  iconClass: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('status')

  const total = clients?.length ?? 0
  const active = clients?.filter((c) => c.status === 'active').length ?? 0
  const paused = clients?.filter((c) => c.status === 'paused').length ?? 0

  const stats: Stat[] = [
    {
      label: 'Total clients',
      value: total,
      icon: Users,
      hint: 'All clients on your roster',
      iconClass: 'bg-foreground/5 text-foreground',
    },
    {
      label: 'Active',
      value: active,
      icon: Activity,
      hint: 'Currently training with you',
      iconClass: 'bg-brand/10 text-brand',
    },
    {
      label: 'Paused',
      value: paused,
      icon: PauseCircle,
      hint: 'Temporarily on hold',
      iconClass: 'bg-muted text-muted-foreground',
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description="Your coaching business at a glance."
      >
        <Button asChild>
          <Link href="/clients">
            <UserPlus className="size-4" />
            Manage clients
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="gap-0 py-0">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pt-5 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {stat.label}
                  </CardTitle>
                  <div className="text-4xl font-bold tracking-tight">
                    {stat.value}
                  </div>
                </div>
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-sm',
                    stat.iconClass
                  )}
                >
                  <Icon className="size-[18px]" />
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground px-5 pb-5 text-xs">
                {stat.hint}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Your foundation is ready. More tools are on the way.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm leading-relaxed">
          {total === 0 ? (
            <p>
              You have no clients yet.{' '}
              <Link
                href="/clients"
                className="text-brand font-semibold underline-offset-4 hover:underline"
              >
                Add your first client
              </Link>{' '}
              to get rolling.
            </p>
          ) : (
            <p>
              You are managing {total} client{total === 1 ? '' : 's'}. Workouts,
              check-ins, progress photos and more are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
