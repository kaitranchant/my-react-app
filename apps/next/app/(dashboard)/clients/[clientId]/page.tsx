import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getMonthDateRange, getWeekDayLabels, toDateKey } from '@/lib/calendar'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientAccountCard } from '@/components/clients/client-account-card'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { StatusBadge } from '@/components/clients/status-badge'
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const selectedDate = toDateKey(today)
  const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month)
  const weekDateKeys = getWeekDayLabels().map((day) => day.dateKey)
  const weekStart = weekDateKeys[0]
  const weekEnd = weekDateKeys[weekDateKeys.length - 1]

  const [
    { data },
    { data: assignmentData },
    { data: programsData },
    monthResult,
    weekResult,
    selectedResult,
    exercisesResult,
    workoutsResult,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('programs')
      .select('id, name, status')
      .order('name', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select('id, scheduled_date, name, status, started_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select('id, scheduled_date, name, status, started_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select(
        `
        *,
        exercises:scheduled_workout_exercises(
          *,
          exercise:exercises(id, name, muscle_group, equipment)
        )
      `
      )
      .eq('client_id', clientId)
      .eq('scheduled_date', selectedDate)
      .maybeSingle(),
    supabase
      .from('exercises')
      .select('id, name, muscle_group, external_id')
      .eq('status', 'active')
      .order('name', { ascending: true }),
    supabase
      .from('workouts')
      .select('id, name, status')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
  ])

  if (!data) {
    notFound()
  }

  const client = data as Client
  const activeAssignment = assignmentData
    ? (assignmentData as ClientProgramAssignment)
    : null
  const availablePrograms = (programsData ?? []) as Pick<
    Program,
    'id' | 'name' | 'status'
  >[]

  const calendarSchemaError = monthResult.error?.message ?? null
  const monthDays = (monthResult.data ?? []) as CalendarDaySummary[]
  const weekSessions = (weekResult.data ?? []) as CalendarDaySummary[]

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selectedResult.data) {
    const exercises = (selectedResult.data.exercises ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
    selectedWorkout = {
      ...selectedResult.data,
      exercises,
    } as ClientScheduledWorkoutWithExercises
  }

  const exercises = (exercisesResult.data ?? []) as Pick<
    Exercise,
    'id' | 'name' | 'muscle_group' | 'external_id'
  >[]
  const libraryWorkouts = (workoutsResult.data ?? []) as Pick<
    Workout,
    'id' | 'name' | 'status'
  >[]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Link
        href="/clients"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to clients
      </Link>

      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ClientAvatarUpload
              clientId={client.id}
              name={client.full_name}
              avatarUrl={client.avatar_url}
              size="lg"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {client.full_name}
                </h1>
                <StatusBadge status={client.status} />
              </div>
              {client.email && (
                <p className="text-muted-foreground text-sm">{client.email}</p>
              )}
            </div>
          </div>
          <ClientFormDialog
            client={client}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" />
                Edit
              </Button>
            }
          />
        </div>
      </section>

      <ClientAccountCard client={client} />

      <ClientDetailTabs
        client={client}
        activeAssignment={activeAssignment}
        availablePrograms={availablePrograms}
        weekSessions={weekSessions}
        calendar={{
          schemaError: calendarSchemaError,
          year,
          month,
          selectedDate,
          days: monthDays,
          selectedWorkout,
          exercises,
          libraryWorkouts,
        }}
      />
    </div>
  )
}
