'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { TeamAnnouncementsPanel } from '@/components/teams/team-announcements-panel'
import { TeamChallengesPanel } from '@/components/teams/team-challenges-panel'
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
import type { TeamChallengeWithLeaderboard } from '@/lib/team-challenges'

const TEAM_TABS = [
  'overview',
  'schedule',
  'members',
  'challenges',
  'program',
] as const
type TeamTab = (typeof TEAM_TABS)[number]

function resolveTeamTab(tab: string | null | undefined): TeamTab {
  if (tab && TEAM_TABS.includes(tab as TeamTab)) {
    return tab as TeamTab
  }
  return 'overview'
}

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
  weightClasses?: string[]
  challenges?: TeamChallengeWithLeaderboard[]
  canEditLeaderboardLifts: boolean
  canManageChallenges?: boolean
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
  weightClasses = [],
  challenges = [],
  canEditLeaderboardLifts,
  canManageChallenges = false,
}: TeamDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightDate = searchParams.get('date')

  const [tab, setTab] = React.useState<TeamTab>(() =>
    resolveTeamTab(searchParams.get('tab'))
  )
  const [mountedTabs, setMountedTabs] = React.useState<Set<TeamTab>>(() =>
    new Set([resolveTeamTab(searchParams.get('tab'))])
  )

  React.useEffect(() => {
    const next = resolveTeamTab(searchParams.get('tab'))
    setTab(next)
    setMountedTabs((prev) => new Set(prev).add(next))
  }, [searchParams])

  const performanceByClientId = Object.fromEntries(
    performance.members.map((member) => [member.clientId, member])
  )

  function buildUrl(nextTab: TeamTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', nextTab)
    }
    if (nextTab !== 'schedule') {
      params.delete('date')
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function handleTabChange(value: string) {
    const next = resolveTeamTab(value)
    setTab(next)
    setMountedTabs((prev) => new Set(prev).add(next))
    router.replace(buildUrl(next), { scroll: false })
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6" variant="filter">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="program">Program</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-4 md:space-y-6">
        {mountedTabs.has('overview') ? (
          <>
            <TeamOverviewPanel
              teamId={teamId}
              performance={performance}
              activity={activity}
              memberAvatars={Object.fromEntries(
                members.map((member) => [member.client.id, member.client.avatar_url])
              )}
            />
            {canEditLeaderboardLifts ? (
              <TeamPowerliftingExercisesCard team={team} exercises={exercises} />
            ) : null}
            <TeamAnnouncementsPanel teamId={teamId} announcements={announcements} />
          </>
        ) : null}
      </TabsContent>

      <TabsContent value="schedule">
        {mountedTabs.has('schedule') ? (
          <TeamEventsPanel
            teamId={teamId}
            events={events}
            members={members}
            highlightDate={highlightDate}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="members">
        {mountedTabs.has('members') ? (
          <TeamMembersPanel
            teamId={teamId}
            team={team}
            members={members}
            allClients={allClients}
            teamAssignedClientIds={teamAssignedClientIds}
            performanceByClientId={performanceByClientId}
            nextEvent={nextEvent}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="challenges">
        {mountedTabs.has('challenges') ? (
          <TeamChallengesPanel
            teamId={teamId}
            teamName={team.name}
            challenges={challenges}
            exercises={exercises}
            weightClasses={weightClasses}
            canManage={canManageChallenges}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="program">
        {mountedTabs.has('program') ? (
          <TeamProgramsPanel
            teamId={teamId}
            team={team}
            activeProgram={activeProgram}
            availablePrograms={availablePrograms}
            memberCount={members.length}
            programProgress={programProgress}
            programHistory={programHistory}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  )
}
