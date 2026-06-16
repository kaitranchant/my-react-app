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

export const metadata = {
  title: 'Dashboard — Coaching App',
}

type Stat = {
  label: string
  value: number
  icon: typeof Users
  hint: string
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
    },
    {
      label: 'Active',
      value: active,
      icon: Activity,
      hint: 'Currently training with you',
    },
    {
      label: 'Paused',
      value: paused,
      icon: PauseCircle,
      hint: 'Temporarily on hold',
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Your coaching business at a glance.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients">
            <UserPlus className="size-4" />
            Manage clients
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{stat.value}</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {stat.hint}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            This is your foundation. More tools are on the way.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {total === 0 ? (
            <p>
              You have no clients yet.{' '}
              <Link
                href="/clients"
                className="text-foreground font-medium underline-offset-4 hover:underline"
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
