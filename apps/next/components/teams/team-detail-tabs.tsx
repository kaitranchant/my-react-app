'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { TeamAnnouncementsPanel } from '@/components/teams/team-announcements-panel'
import { TeamAssessmentsPanel } from '@/components/teams/team-assessments-panel'
import { TeamChallengesPanel } from '@/components/teams/team-challenges-panel'
import { TeamForumPanel } from '@/components/teams/team-forum-panel'
import { TeamMembersPanel } from '@/components/teams/team-members-panel'
import { TeamOverviewPanel } from '@/components/teams/team-overview-panel'
import { TeamPowerliftingExercisesCard } from '@/components/teams/team-powerlifting-exercises-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  Client,
  Team,
  TeamActivityItem,
  TeamAnnouncement,
  TeamEventWithMemberStatus,
  TeamForumPostWithReplies,
  TeamMemberWithClient,
  TeamPerformanceSummary,
} from 'app/types/database'
import type { TeamChallengeWithLeaderboard } from '@/lib/team-challenges'

const TEAM_TABS = [
  'overview',
  'schedule',
  'members',
  'assessments',
  'community',
  'challenges',
] as const
type TeamTab = (typeof TEAM_TABS)[number]

function resolveTeamTab(tab: string | null | undefined): TeamTab {
  // Legacy deep link: Program used to be a top-level tab.
  if (tab === 'program') {
    return 'schedule'
  }
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
  announcements: TeamAnnouncement[]
  forumPosts?: TeamForumPostWithReplies[]
  performance: TeamPerformanceSummary
  activity: TeamActivityItem[]
  nextEvent: TeamEventWithMemberStatus | null
  exercises: { id: string; name: string }[]
  weightClasses?: string[]
  challenges?: TeamChallengeWithLeaderboard[]
  canEditLeaderboardLifts: boolean
  canManageChallenges?: boolean
  schedulePanel: React.ReactNode
}

export function TeamDetailTabs({
  teamId,
  team,
  members,
  allClients,
  teamAssignedClientIds,
  announcements,
  forumPosts = [],
  performance,
  activity,
  nextEvent,
  exercises,
  weightClasses = [],
  challenges = [],
  canEditLeaderboardLifts,
  canManageChallenges = false,
  schedulePanel,
}: TeamDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [tab, setTab] = React.useState<TeamTab>(() =>
    resolveTeamTab(searchParams.get('tab'))
  )
  const [mountedTabs, setMountedTabs] = React.useState<Set<TeamTab>>(() =>
    new Set([resolveTeamTab(searchParams.get('tab'))])
  )

  React.useEffect(() => {
    const rawTab = searchParams.get('tab')
    const next = resolveTeamTab(rawTab)
    setTab(next)
    setMountedTabs((prev) => new Set(prev).add(next))

    // Rewrite legacy ?tab=program to Schedule → Program.
    if (rawTab === 'program') {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'schedule')
      params.set('section', 'program')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }, [searchParams, pathname, router])

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
      params.delete('section')
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
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
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
        {mountedTabs.has('schedule') ? schedulePanel : null}
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

      <TabsContent value="assessments">
        {mountedTabs.has('assessments') ? (
          <TeamAssessmentsPanel teamId={teamId} memberCount={members.length} />
        ) : null}
      </TabsContent>

      <TabsContent value="community">
        {mountedTabs.has('community') ? (
          <TeamForumPanel teamId={teamId} posts={forumPosts} />
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
    </Tabs>
  )
}
