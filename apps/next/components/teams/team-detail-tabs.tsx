'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { TeamAnnouncementsPanel } from '@/components/teams/team-announcements-panel'
import { TeamEventsPanel } from '@/components/teams/team-events-panel'
import { TeamMembersPanel } from '@/components/teams/team-members-panel'
import { TeamOverviewPanel } from '@/components/teams/team-overview-panel'
import { TeamPowerliftingExercisesCard } from '@/components/teams/team-powerlifting-exercises-card'
import { TeamProgramsPanel } from '@/components/teams/team-programs-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  Client,
  Program,
  Team,
  TeamActivityItem,
  TeamAnnouncement,
  TeamEventWithMemberStatus,
  TeamMemberWithClient,
  TeamPerformanceSummary,
  TeamProgramHistoryEntry,
  TeamProgramProgress,
} from 'app/types/database'

type TeamDetailTabsProps = {
  teamId: string
  team: Team
  members: TeamMemberWithClient[]
  allClients: Pick<Client, 'id' | 'full_name' | 'status'>[]
  teamAssignedClientIds: string[]
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
  activeProgram: Pick<Program, 'id' | 'name' | 'description' | 'status'> | null
  announcements: TeamAnnouncement[]
  events: TeamEventWithMemberStatus[]
  performance: TeamPerformanceSummary
  activity: TeamActivityItem[]
  programProgress: TeamProgramProgress | null
  programHistory: TeamProgramHistoryEntry[]
  nextEvent: TeamEventWithMemberStatus | null
  exercises: { id: string; name: string }[]
  canEditLeaderboardLifts: boolean
  initialTab?: string
  highlightDate?: string | null
}

export function TeamDetailTabs({
  teamId,
  team,
  members,
  allClients,
  teamAssignedClientIds,
  availablePrograms,
  activeProgram,
  announcements,
  events,
  performance,
  activity,
  programProgress,
  programHistory,
  nextEvent,
  exercises,
  canEditLeaderboardLifts,
  initialTab,
  highlightDate,
}: TeamDetailTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? initialTab ?? 'overview'

  const performanceByClientId = Object.fromEntries(
    performance.members.map((member) => [member.clientId, member])
  )

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    if (value !== 'schedule') {
      params.delete('date')
    }
    const query = params.toString()
    router.push(query ? `?${query}` : '?', { scroll: false })
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="schedule">Schedule</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="program">Program</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <TeamOverviewPanel
          team={team}
          performance={performance}
          activity={activity}
        />
        {canEditLeaderboardLifts ? (
          <TeamPowerliftingExercisesCard team={team} exercises={exercises} />
        ) : null}
        <TeamAnnouncementsPanel teamId={teamId} announcements={announcements} />
      </TabsContent>

      <TabsContent value="schedule">
        <TeamEventsPanel
          teamId={teamId}
          events={events}
          members={members}
          highlightDate={highlightDate ?? searchParams.get('date')}
        />
      </TabsContent>

      <TabsContent value="members">
        <TeamMembersPanel
          teamId={teamId}
          team={team}
          members={members}
          allClients={allClients}
          teamAssignedClientIds={teamAssignedClientIds}
          performanceByClientId={performanceByClientId}
          nextEvent={nextEvent}
        />
      </TabsContent>

      <TabsContent value="program">
        <TeamProgramsPanel
          teamId={teamId}
          team={team}
          activeProgram={activeProgram}
          availablePrograms={availablePrograms}
          memberCount={members.length}
          programProgress={programProgress}
          programHistory={programHistory}
        />
      </TabsContent>
    </Tabs>
  )
}
