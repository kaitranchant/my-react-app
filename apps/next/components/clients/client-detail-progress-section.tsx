'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ClientCheckInsPanel } from '@/components/check-ins/client-check-ins-panel'
import { ClientFormReviewsPanel } from '@/components/form-review/form-review-review-card'
import { ClientGoalsPanel } from '@/components/goals/client-goals-panel'
import { ClientInbodyPanel } from '@/components/inbody/client-inbody-panel'
import { ClientProgressPhotosPanel } from '@/components/progress-photos/client-progress-photos-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type {
  Client,
  ClientCheckIn,
  ClientFormReviewWithClient,
  ClientGoal,
  ClientInbodyScan,
  ClientProgramAssignment,
  ClientProgressPhotoWithUrl,
  Exercise,
  Program,
} from 'app/types/database'

const PROGRESS_SECTIONS = [
  'goals',
  'check-ins',
  'inbody',
  'progress-photos',
  'form-reviews',
] as const
type ProgressSection = (typeof PROGRESS_SECTIONS)[number]

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

type ClientDetailProgressSectionProps = {
  client: Client
  activeAssignment: ClientProgramAssignment | null
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
  checkIns: ClientCheckIn[]
  progressPhotos: ClientProgressPhotoWithUrl[]
  formReviews: ClientFormReviewWithClient[]
  inbodyScans: ClientInbodyScan[]
  clientGoals: ClientGoal[]
  goalsSchemaError: string | null
  goalProgressContext: GoalProgressContext
  goalExercises: Pick<Exercise, 'id' | 'name'>[]
  calendarExercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  photoCounts: Record<string, number>
  photosByCheckInId: Record<string, ClientProgressPhotoWithUrl[]>
  coachPreferences?: CoachPreferences
}

export function ClientDetailProgressSection({
  client,
  activeAssignment,
  availablePrograms,
  checkIns,
  progressPhotos,
  formReviews,
  inbodyScans,
  clientGoals,
  goalsSchemaError,
  goalProgressContext,
  goalExercises,
  calendarExercises,
  photoCounts,
  photosByCheckInId,
  coachPreferences,
}: ClientDetailProgressSectionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlTab = searchParams.get('tab')
  const urlSection = searchParams.get('section')
  const progressSection = resolveProgressSection(urlTab, urlSection)

  function buildUrl(section: ProgressSection) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'progress')
    const sectionParam = progressSectionForUrl(section)
    if (sectionParam) {
      params.set('section', sectionParam)
    } else {
      params.delete('section')
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function handleProgressSectionChange(value: string) {
    router.replace(buildUrl(value as ProgressSection), { scroll: false })
  }

  return (
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
          progressContext={goalProgressContext}
          exercises={goalExercises.length > 0 ? goalExercises : calendarExercises}
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
  )
}
