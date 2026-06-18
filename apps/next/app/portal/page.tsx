import { redirect } from 'next/navigation'

import { getPortalCalendarMonthData } from '@/app/portal/actions'
import { PortalCalendarPanel } from '@/components/portal/portal-calendar-panel'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { UserMenu } from '@/components/dashboard/user-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { coerceDateKey, parseDateKey, toDateKey } from '@/lib/calendar'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type {
  CalendarDaySummary,
  ClientScheduledWorkoutWithExercises,
} from 'app/types/database'

export const metadata = {
  title: 'My program — Coaching App',
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; action?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') {
    redirect('/dashboard')
  }

  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let activeProgram: {
    name: string
    description: string | null
    start_date: string | null
  } | null = null

  if (clientRecord?.id) {
    const { data: assignment } = await supabase
      .from('program_assignments')
      .select('start_date, program:programs(name, description)')
      .eq('client_id', clientRecord.id)
      .eq('status', 'active')
      .maybeSingle()

    if (assignment?.program && !Array.isArray(assignment.program)) {
      activeProgram = {
        name: assignment.program.name,
        description: assignment.program.description,
        start_date: assignment.start_date,
      }
    }
  }

  const name =
    clientRecord?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Client'

  const avatarUrl = clientRecord?.avatar_url ?? profile?.avatar_url
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const selectedDate = coerceDateKey(params.date) ?? toDateKey(new Date())
  const selectedDateObj = parseDateKey(selectedDate)
  const initialYear = selectedDateObj.getFullYear()
  const initialMonth = selectedDateObj.getMonth()

  let calendarDays: CalendarDaySummary[] = []
  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null

  if (clientRecord?.id) {
    const result = await getPortalCalendarMonthData(
      initialYear,
      initialMonth,
      selectedDate
    )
    if (result.success) {
      calendarDays = result.data.days
      selectedWorkout = result.data.selectedWorkout
    }
  }

  const initialAction =
    params.action === 'log' ? ('log' as const) : null

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <header className="bg-background/80 sticky top-0 z-10 flex h-16 items-center justify-between border-b px-4 backdrop-blur-sm sm:px-6">
        <BrandLogo />
        <UserMenu
          name={name}
          email={user.email ?? ''}
          avatarUrl={avatarUrl}
        />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-10">
        <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
          <div className="relative space-y-4">
            <ClientAvatarUpload
              name={name}
              avatarUrl={avatarUrl}
              forClientPortal
              size="md"
            />
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                {todayLabel}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome, {name}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                View your schedule and log workouts from your calendar below.
              </p>
            </div>
          </div>
        </section>

        {activeProgram && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Your program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed">
              <p className="font-medium">{activeProgram.name}</p>
              {activeProgram.description && (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {activeProgram.description}
                </p>
              )}
              {activeProgram.start_date && (
                <p className="text-muted-foreground text-xs">
                  Started{' '}
                  {new Date(`${activeProgram.start_date}T12:00:00`).toLocaleDateString(
                    undefined,
                    { month: 'short', day: 'numeric', year: 'numeric' }
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!clientRecord ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
              Your account is not linked to a client profile yet. Ask your coach
              to send you an invite link so you can see your schedule and log
              workouts.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Your calendar
              </h2>
              <p className="text-muted-foreground text-sm">
                Tap a day to view your session, then log sets when you are ready.
              </p>
            </div>
            <PortalCalendarPanel
              clientId={clientRecord.id}
              initialYear={initialYear}
              initialMonth={initialMonth}
              initialSelectedDate={selectedDate}
              initialDays={calendarDays}
              initialWorkout={selectedWorkout}
              initialAction={initialAction}
              initialActionDate={selectedDate}
            />
          </section>
        )}
      </main>
    </div>
  )
}
