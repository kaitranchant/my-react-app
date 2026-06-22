'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientNotesEditor } from '@/components/clients/client-notes-editor'
import { ClientOverview } from '@/components/clients/client-overview'
import { ClientCalendarPanel } from '@/components/calendar/client-calendar-panel'
import { ClientProgramsPanel } from '@/components/programs/client-programs-panel'
import { ClientCheckInsPanel } from '@/components/check-ins/client-check-ins-panel'
import { ClientInbodyPanel } from '@/components/inbody/client-inbody-panel'
import { ClientGoalsPanel } from '@/components/goals/client-goals-panel'
import { ClientProgressPhotosPanel } from '@/components/progress-photos/client-progress-photos-panel'
import { ClientFormReviewsPanel } from '@/components/form-review/form-review-review-card'
import { CoachClientMessagesPanel } from '@/components/messages/coach-client-messages-panel'
import type { RecentPrHighlight } from '@/lib/pr-records'
import type { ClientWorkoutActivity } from '@/lib/client-metrics'
import { coerceDateKey } from '@/lib/calendar'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  ClientCheckIn,
  ClientInbodyScan,
  ClientGoal,
  ClientMessage,
  ClientProgressPhotoWithUrl,
  ClientFormReviewWithClient,
  Exercise,
  Program,
  Workout,
} from 'app/types/database'

const MAIN_TABS = ['overview', 'training', 'progress', 'messages'] as const
type MainTab = (typeof MAIN_TABS)[number]

const TRAINING_SECTIONS = ['calendar', 'programs'] as const
type TrainingSection = (typeof TRAINING_SECTIONS)[number]

const PROGRESS_SECTIONS = [
  'goals',
  'check-ins',
  'inbody',
  'progress-photos',
  'form-reviews',
] as const
type ProgressSection = (typeof PROGRESS_SECTIONS)[number]

const LEGACY_TABS = [
  'calendar',
  'programs',
  'check-ins',
  'progress-photos',
  'form-reviews',
  'inbody',
  'goals',
  'notes',
] as const

const VALID_CALENDAR_ACTIONS = ['log', 'schedule'] as const
type CalendarAction = (typeof VALID_CALENDAR_ACTIONS)[number]

function resolveMainTab(tab: string | null): MainTab {
  if (tab && MAIN_TABS.includes(tab as MainTab)) {
    return tab as MainTab
  }
  if (tab === 'calendar' || tab === 'programs') {
    return 'training'
  }
  if (
    tab === 'check-ins' ||
    tab === 'progress-photos' ||
    tab === 'form-reviews' ||
    tab === 'inbody' ||
    tab === 'goals'
  ) {
    return 'progress'
  }
  if (tab === 'notes') {
    return 'overview'
  }
  return 'overview'
}

function resolveTrainingSection(
  tab: string | null,
  section: string | null
): TrainingSection {
  if (section && TRAINING_SECTIONS.includes(section as TrainingSection)) {
    return section as TrainingSection
  }
  if (tab === 'programs') {
    return 'programs'
  }
  return 'calendar'
}

function resolveProgressSection(
  tab: string | null,
  section: string | null
): ProgressSection {
  if (section && PROGRESS_SECTIONS.includes(section as ProgressSection)) {
    return section as ProgressSection
  }
  if (
    tab === 'check-ins' ||
    tab === 'progress-photos' ||
    tab === 'form-reviews' ||
    tab === 'inbody' ||
    tab === 'goals'
  ) {
    return tab as ProgressSection
  }
  return 'goals'
}

function progressSectionForUrl(section: ProgressSection): string | null {
  return section === 'goals' ? null : section
}

function isLegacyTab(tab: string | null): boolean {
  return (
    tab !== null &&
    LEGACY_TABS.includes(tab as (typeof LEGACY_TABS)[number])
  )
}

type ClientDetailTabsProps = {
  client: Client
  activeAssignment: ClientProgramAssignment | null
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
  calendar: {
    schemaError: string | null
    year: number
    month: number
    selectedDate: string
    days: CalendarDaySummary[]
    selectedWorkout: ClientScheduledWorkoutWithExercises | null
    exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
    libraryWorkouts: Pick<Workout, 'id' | 'name' | 'status'>[]
  }
  weekSessions: CalendarDaySummary[]
  recentWorkouts: ClientWorkoutActivity[]
  streakWorkouts: ClientWorkoutActivity[]
  checkIns?: ClientCheckIn[]
  messages?: ClientMessage[]
  messagesSchemaError?: string | null
  progressPhotos?: ClientProgressPhotoWithUrl[]
  formReviews?: ClientFormReviewWithClient[]
  inbodyScans?: ClientInbodyScan[]
  clientGoals?: ClientGoal[]
  goalsSchemaError?: string | null
  goalProgressContext?: GoalProgressContext
  goalExercises?: Pick<Exercise, 'id' | 'name'>[]
  photoCounts?: Record<string, number>
  photosByCheckInId?: Record<string, ClientProgressPhotoWithUrl[]>
  loadMetrics?: {
    thisWeekVolume: number
    volumeDeltaLabel: string
    acwrLabel: string
    acwrVariant: 'success' | 'warning' | 'secondary'
  }
  recentPrs?: RecentPrHighlight[]
  coachPreferences?: CoachPreferences
  initialTab?: string
  initialSection?: string
}

export function ClientDetailTabs({
  client,
  activeAssignment,
  availablePrograms,
  calendar,
  weekSessions,
  recentWorkouts,
  streakWorkouts,
  checkIns = [],
  messages = [],
  messagesSchemaError = null,
  progressPhotos = [],
  formReviews = [],
  inbodyScans = [],
  clientGoals = [],
  goalsSchemaError = null,
  goalProgressContext,
  goalExercises = [],
  photoCounts = {},
  photosByCheckInId = {},
  loadMetrics,
  recentPrs = [],
  coachPreferences,
  initialTab,
  initialSection,
}: ClientDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlTab = searchParams.get('tab') ?? initialTab ?? null
  const urlSection = searchParams.get('section') ?? initialSection ?? null

  const [mainTab, setMainTab] = React.useState<MainTab>(() =>
    resolveMainTab(urlTab)
  )
  const [trainingSection, setTrainingSection] = React.useState<TrainingSection>(
    () => resolveTrainingSection(urlTab, urlSection)
  )
  const [progressSection, setProgressSection] = React.useState<ProgressSection>(
    () => resolveProgressSection(urlTab, urlSection)
  )

  const rawAction = searchParams.get('action')
  const calendarAction = VALID_CALENDAR_ACTIONS.includes(
    rawAction as CalendarAction
  )
    ? (rawAction as CalendarAction)
    : null
  const calendarActionDate = coerceDateKey(searchParams.get('date'))

  function buildUrl(nextMain: MainTab, section?: string | null) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextMain === 'overview') {
      params.delete('tab')
      params.delete('section')
    } else {
      params.set('tab', nextMain)
      if (section) {
        params.set('section', section)
      } else {
        params.delete('section')
      }
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function consumeCalendarAction() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('action')
    params.delete('date')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  React.useEffect(() => {
    const tab = searchParams.get('tab')
    const section = searchParams.get('section')
    const resolvedMain = resolveMainTab(tab)
    setMainTab(resolvedMain)
    setTrainingSection(resolveTrainingSection(tab, section))
    setProgressSection(resolveProgressSection(tab, section))

    if (isLegacyTab(tab)) {
      const href =
        resolvedMain === 'training'
          ? buildUrl('training', resolveTrainingSection(tab, section))
          : resolvedMain === 'progress'
            ? buildUrl('progress', progressSectionForUrl(resolveProgressSection(tab, section)))
            : buildUrl('overview')
      router.replace(href, { scroll: false })
    }
  }, [searchParams])

  function handleMainTabChange(value: string) {
    const next = value as MainTab
    setMainTab(next)
    router.replace(buildUrl(next), { scroll: false })
  }

  function handleTrainingSectionChange(value: string) {
    const next = value as TrainingSection
    setTrainingSection(next)
    setMainTab('training')
    router.replace(
      buildUrl('training', next === 'calendar' ? null : next),
      { scroll: false }
    )
  }

  function handleProgressSectionChange(value: string) {
    const next = value as ProgressSection
    setProgressSection(next)
    setMainTab('progress')
    router.replace(
      buildUrl('progress', progressSectionForUrl(next)),
      { scroll: false }
    )
  }

  function openTraining(section: TrainingSection = 'calendar') {
    setMainTab('training')
    setTrainingSection(section)
    router.replace(
      buildUrl('training', section === 'calendar' ? null : section),
      { scroll: false }
    )
  }

  function openCheckIns() {
    setMainTab('progress')
    setProgressSection('check-ins')
    router.replace(buildUrl('progress', 'check-ins'), { scroll: false })
  }

  return (
    <Tabs value={mainTab} onValueChange={handleMainTabChange} variant="filter">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-4 space-y-3 md:space-y-4">
        <ClientOverview
          client={client}
          activeAssignment={activeAssignment}
          weekSessions={weekSessions}
          recentWorkouts={recentWorkouts}
          streakWorkouts={streakWorkouts}
          checkIns={checkIns}
          loadMetrics={loadMetrics}
          recentPrs={recentPrs}
          weekStartsOn={coachPreferences?.weekStartsOn}
          weightUnit={coachPreferences?.weightUnit}
          onOpenCalendar={() => openTraining('calendar')}
          onOpenCheckIns={openCheckIns}
          onOpenPrograms={() => openTraining('programs')}
        />
        <ClientNotesEditor clientId={client.id} initialNotes={client.notes} />
      </TabsContent>

      <TabsContent value="training" className="mt-4">
        <Tabs
          value={trainingSection}
          onValueChange={handleTrainingSectionChange}
          variant="filter"
        >
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max flex-nowrap">
              <TabsTrigger value="calendar" size="sm">
                Calendar
              </TabsTrigger>
              <TabsTrigger value="programs" size="sm">
                Programs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="calendar" className="mt-4">
            <ClientCalendarPanel
              clientId={client.id}
              clientName={client.full_name}
              exercises={calendar.exercises}
              libraryWorkouts={calendar.libraryWorkouts}
              schemaError={calendar.schemaError}
              initialYear={calendar.year}
              initialMonth={calendar.month}
              initialSelectedDate={calendar.selectedDate}
              initialDays={calendar.days}
              initialWorkout={calendar.selectedWorkout}
              initialAction={calendarAction}
              initialActionDate={calendarActionDate}
              onActionConsumed={consumeCalendarAction}
              weightUnit={coachPreferences?.weightUnit}
            />
          </TabsContent>

          <TabsContent value="programs" className="mt-4">
            <ClientProgramsPanel
              clientId={client.id}
              activeAssignment={activeAssignment}
              availablePrograms={availablePrograms}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="progress" className="mt-4">
        <Tabs
          value={progressSection}
          onValueChange={handleProgressSectionChange}
          variant="filter"
        >
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max flex-nowrap">
              <TabsTrigger value="goals" size="sm">
                Goals
              </TabsTrigger>
              <TabsTrigger value="check-ins" size="sm">
                Check-ins
              </TabsTrigger>
              <TabsTrigger value="inbody" size="sm">
                <span className="sm:hidden">InBody</span>
                <span className="hidden sm:inline">InBody results</span>
              </TabsTrigger>
              <TabsTrigger value="progress-photos" size="sm">
                <span className="sm:hidden">Photos</span>
                <span className="hidden sm:inline">Progress photos</span>
              </TabsTrigger>
              <TabsTrigger value="form-reviews" size="sm">
                <span className="sm:hidden">Form</span>
                <span className="hidden sm:inline">Form review</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="goals" className="mt-4">
            <ClientGoalsPanel
              client={client}
              goals={clientGoals}
              progressContext={
                goalProgressContext ?? {
                  scans: inbodyScans,
                  checkIns,
                  prRecords: [],
                  bestDurationByExerciseId: {},
                  workouts: streakWorkouts,
                  activeAssignment,
                  programDayOffsets: [],
                  exercises: goalExercises,
                }
              }
              exercises={goalExercises.length > 0 ? goalExercises : calendar.exercises}
              programs={availablePrograms}
              coachPreferences={coachPreferences}
              schemaError={goalsSchemaError}
            />
          </TabsContent>

          <TabsContent value="check-ins" className="mt-4">
            <ClientCheckInsPanel
              client={client}
              checkIns={checkIns}
              photoCounts={photoCounts}
              photosByCheckInId={photosByCheckInId}
              weightUnit={coachPreferences?.weightUnit}
            />
          </TabsContent>

          <TabsContent value="inbody" className="mt-4">
            <ClientInbodyPanel client={client} scans={inbodyScans} />
          </TabsContent>

          <TabsContent value="progress-photos" className="mt-4">
            <ClientProgressPhotosPanel
              clientId={client.id}
              clientName={client.full_name}
              photos={progressPhotos}
            />
          </TabsContent>

          <TabsContent value="form-reviews" className="mt-4">
            <ClientFormReviewsPanel
              clientName={client.full_name}
              reviews={formReviews}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="messages" className="mt-4">
        <CoachClientMessagesPanel
          clientId={client.id}
          clientName={client.full_name}
          messages={messages}
          schemaError={messagesSchemaError}
        />
      </TabsContent>
    </Tabs>
  )
}
