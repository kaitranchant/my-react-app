import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getMonthDateRange, getWeekDayLabels, toDateKey } from '@/lib/calendar'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import type { ClientWorkoutActivity } from '@/lib/client-metrics'
import { fetchClientLoadMetrics } from '@/lib/load-queries'
import { fetchGoalProgressContext } from '@/lib/goal-progress-context'
import { isCoachSelfClient } from '@/lib/coach-self'
import { getGymsForCoach, isPrimaryCoach } from '@/lib/gym-access'
import { fetchClientFormReviews } from '@/app/(dashboard)/form-review/actions'
import { attachSignedUrlsToPhotos, countPhotosByCheckInId } from '@/lib/progress-photos'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientAccountBanner } from '@/components/clients/client-account-banner'
import { ClientQuickActions } from '@/components/clients/client-quick-actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { ClientTeamBadges } from '@/components/teams/client-team-badges'
import {
  ClientGymMemberBadge,
  ClientGymShareMenu,
} from '@/components/gym/client-gym-share-toggle'
import { ClientSharedBanner } from '@/components/gym/client-gym-badge'
import { ClientCoachingTypeBadge } from '@/components/clients/client-coaching-type-badge'
import { StatusBadge } from '@/components/clients/status-badge'
import { ClientDetailBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
  ClientCheckIn,
  ClientInbodyScan,
  ClientGoal,
  ClientMessage,
  ClientScheduledWorkoutWithExercises,
  ClientTeamMembership,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ tab?: string; section?: string; action?: string; date?: string }>
}) {
  const { clientId } = await params
  const { tab: initialTab } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const selectedDate = toDateKey(today)
  const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month)
  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : defaultCoachPreferences
  const weekDateKeys = getWeekDayLabels(coachPreferences.weekStartsOn).map(
    (day) => day.dateKey
  )
  const weekStart = weekDateKeys[0]
  const weekEnd = weekDateKeys[weekDateKeys.length - 1]
  const streakStart = toDateKey(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)
  )

  const [
    { data },
    { data: assignmentData },
    { data: programsData },
    monthResult,
    weekResult,
    selectedResult,
    exercisesResult,
    workoutsResult,
    recentWorkoutsResult,
    streakWorkoutsResult,
    checkInsResult,
    messagesResult,
    progressPhotosResult,
    inbodyScansResult,
    clientGoalsResult,
    teamMembershipsResult,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status), team:teams(id, name)')
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
    supabase
      .from('client_scheduled_workouts')
      .select(
        'id, name, status, scheduled_date, started_at, completed_at, updated_at'
      )
      .eq('client_id', clientId)
      .in('status', ['completed', 'in_progress', 'skipped'])
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('client_scheduled_workouts')
      .select('status, scheduled_date, completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('scheduled_date', streakStart)
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('client_check_ins')
      .select('*')
      .eq('client_id', clientId)
      .order('check_in_date', { ascending: false })
      .limit(50),
    supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('client_progress_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('client_inbody_scans')
      .select('*')
      .eq('client_id', clientId)
      .order('scan_date', { ascending: false })
      .limit(50),
    supabase
      .from('client_goals')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('team_members')
      .select('team:teams(id, name)')
      .eq('client_id', clientId),
  ])

  if (!data) {
    notFound()
  }

  if (isCoachSelfClient(data as Client)) {
    redirect('/my-workouts')
  }

  const client = data as Client
  const viewerIsPrimaryCoach = user
    ? isPrimaryCoach(user.id, client)
    : false

  let primaryCoachName: string | null = null
  if (!viewerIsPrimaryCoach) {
    const { data: primaryCoach } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', client.coach_id)
      .maybeSingle()

    primaryCoachName =
      primaryCoach?.full_name ??
      primaryCoach?.business_name ??
      'Primary coach'
  }

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
  const recentWorkouts = (recentWorkoutsResult.data ??
    []) as ClientWorkoutActivity[]
  const streakWorkouts = (streakWorkoutsResult.data ??
    []) as ClientWorkoutActivity[]
  const checkIns = (checkInsResult.data ?? []) as ClientCheckIn[]
  const messages = (messagesResult.data ?? []) as ClientMessage[]
  const messagesSchemaError = messagesResult.error?.message ?? null
  const progressPhotos = await attachSignedUrlsToPhotos(
    supabase,
    progressPhotosResult.data ?? []
  )
  const formReviews = await fetchClientFormReviews(clientId)
  const inbodyScans = (inbodyScansResult.data ?? []) as ClientInbodyScan[]
  const clientGoals = (clientGoalsResult.data ?? []) as ClientGoal[]
  const goalsSchemaError = clientGoalsResult.error?.message ?? null
  const teamMemberships = ((teamMembershipsResult.data ?? []) as {
    team: { id: string; name: string } | null
  }[])
    .filter((row) => row.team)
    .map((row) => ({ team: row.team! })) as ClientTeamMembership[]
  const photosByCheckInId = progressPhotos.reduce<
    Record<string, typeof progressPhotos>
  >((accumulator, photo) => {
    if (!photo.check_in_id) return accumulator
    const existing = accumulator[photo.check_in_id] ?? []
    existing.push(photo)
    accumulator[photo.check_in_id] = existing
    return accumulator
  }, {})
  const photoCounts = countPhotosByCheckInId(progressPhotos)
  const loadMetrics = await fetchClientLoadMetrics(supabase, clientId)
  const goalProgressContext = await fetchGoalProgressContext(supabase, clientId)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Suspense fallback={null}>
        <ClientDetailBreadcrumbs
          clientId={clientId}
          clientName={client.full_name}
        />
      </Suspense>

      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ClientAvatar
              name={client.full_name}
              avatarUrl={client.avatar_url}
              size="lg"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="page-title">
                  {client.full_name}
                </h1>
                <StatusBadge status={client.status} />
              </div>
              {client.email && (
                <p className="helper-text">{client.email}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {client.coaching_type && (
                  <ClientCoachingTypeBadge coachingType={client.coaching_type} />
                )}
                <ClientTeamBadges memberships={teamMemberships} />
                {!viewerIsPrimaryCoach && coachGyms.length > 0 ? (
                  <ClientGymMemberBadge client={client} gyms={coachGyms} />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClientQuickActions clientId={client.id} />
            <ClientFormDialog
              client={client}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" />
                  Edit
                </Button>
              }
            />
            {coachGyms.length > 0 ? (
              <ClientGymShareMenu
                client={client}
                gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
                isPrimaryCoach={viewerIsPrimaryCoach}
              />
            ) : null}
          </div>
        </div>
      </section>

      {!viewerIsPrimaryCoach && primaryCoachName ? (
        <ClientSharedBanner primaryCoachName={primaryCoachName} />
      ) : null}

      <ClientAccountBanner client={client} />

      <Suspense fallback={null}>
        <ClientDetailTabs
          client={client}
          activeAssignment={activeAssignment}
          availablePrograms={availablePrograms}
          weekSessions={weekSessions}
          recentWorkouts={recentWorkouts}
          streakWorkouts={streakWorkouts}
          checkIns={checkIns}
          messages={messages}
          messagesSchemaError={messagesSchemaError}
          progressPhotos={progressPhotos}
          formReviews={formReviews}
          inbodyScans={inbodyScans}
          clientGoals={clientGoals}
          goalsSchemaError={goalsSchemaError}
          goalProgressContext={goalProgressContext}
          goalExercises={exercises}
          photoCounts={photoCounts}
          photosByCheckInId={photosByCheckInId}
          loadMetrics={{
            thisWeekVolume: loadMetrics.thisWeekVolume,
            volumeDeltaLabel: loadMetrics.volumeDeltaLabel,
            acwrLabel: loadMetrics.acwrLabel,
            acwrVariant: loadMetrics.acwrVariant,
          }}
          recentPrs={loadMetrics.recentPrs}
          coachPreferences={coachPreferences}
          initialTab={initialTab}
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
      </Suspense>
    </div>
  )
}
