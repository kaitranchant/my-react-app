'use client'

import { usePathname, useRouter } from 'next/navigation'

import { ClientNotesEditor } from '@/components/clients/client-notes-editor'
import { ClientOnboardingChecklist } from '@/components/clients/client-onboarding-checklist'
import { ClientOverview } from '@/components/clients/client-overview'
import type { RecentPrHighlight } from '@/lib/pr-records'
import type { ClientWorkoutActivity } from '@/lib/client-metrics'
import type { TrainingConsistencyHeatmap } from '@/lib/training-consistency'
import type { CoachPreferences } from '@/lib/coach-preferences'
import {
  buildClientOnboardingProgress,
  shouldShowClientOnboardingChecklist,
} from '@/lib/client-onboarding'
import type {
  CalendarDaySummary,
  Client,
  ClientCheckIn,
  ClientProgramAssignment,
} from 'app/types/database'

type ClientDetailOverviewSectionProps = {
  client: Client
  activeAssignment: ClientProgramAssignment | null
  weekSessions: CalendarDaySummary[]
  recentWorkouts: ClientWorkoutActivity[]
  streakWorkouts: ClientWorkoutActivity[]
  checkIns: ClientCheckIn[]
  loadMetrics?: {
    thisWeekVolume: number
    volumeDeltaLabel: string
    acwrLabel: string
    acwrVariant: 'success' | 'warning' | 'secondary'
  }
  recentPrs?: RecentPrHighlight[]
  trainingConsistency?: TrainingConsistencyHeatmap | null
  coachPreferences?: CoachPreferences
  nutritionSnapshot?: {
    hasTargets: boolean
    hasMealPlan: boolean
    lastLogDate: string | null
    avgAdherence7d: number | null
    loggedToday: boolean
  } | null
}

export function ClientDetailOverviewSection({
  client,
  activeAssignment,
  weekSessions,
  recentWorkouts,
  streakWorkouts,
  checkIns,
  loadMetrics,
  recentPrs = [],
  trainingConsistency = null,
  coachPreferences = undefined,
  nutritionSnapshot = null,
}: ClientDetailOverviewSectionProps) {
  const router = useRouter()
  const pathname = usePathname()

  function openTraining(section?: 'calendar' | 'programs') {
    const params = new URLSearchParams()
    params.set('tab', 'training')
    if (section && section !== 'calendar') {
      params.set('section', section)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function openCheckIns() {
    router.replace(`${pathname}?tab=progress&section=check-ins`, { scroll: false })
  }

  function openNutrition() {
    router.replace(`${pathname}?tab=nutrition`, { scroll: false })
  }

  const onboardingProgress = coachPreferences
    ? buildClientOnboardingProgress({
        client,
        hasProgram: Boolean(activeAssignment),
        checkIns,
        workouts: recentWorkouts,
        coachPreferences,
      })
    : null
  const showOnboardingChecklist =
    onboardingProgress &&
    shouldShowClientOnboardingChecklist(client, onboardingProgress)

  return (
    <>
      {showOnboardingChecklist ? (
        <ClientOnboardingChecklist
          clientId={client.id}
          clientName={client.full_name}
          progress={onboardingProgress}
          initialAssessmentNotes={client.onboarding_assessment_notes}
          programName={activeAssignment?.program?.name}
          checkInFrequency={coachPreferences!.defaultCheckInFrequency}
          onOpenPrograms={() => openTraining('programs')}
          onOpenCheckIns={openCheckIns}
          onOpenCalendar={() => openTraining('calendar')}
        />
      ) : null}
      <ClientOverview
        client={client}
        activeAssignment={activeAssignment}
        weekSessions={weekSessions}
        recentWorkouts={recentWorkouts}
        streakWorkouts={streakWorkouts}
        checkIns={checkIns}
        loadMetrics={loadMetrics}
        recentPrs={recentPrs}
        trainingConsistency={trainingConsistency}
        weekStartsOn={coachPreferences?.weekStartsOn}
        weightUnit={coachPreferences?.weightUnit}
        onOpenCalendar={() => openTraining('calendar')}
        onOpenCheckIns={openCheckIns}
        onOpenPrograms={() => openTraining('programs')}
        onOpenNutrition={openNutrition}
        nutritionSnapshot={nutritionSnapshot}
      />
      <ClientNotesEditor clientId={client.id} initialNotes={client.notes} />
    </>
  )
}
