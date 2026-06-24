import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { fetchTeamActivityFeed } from '@/lib/team-activity'
import { fetchTeamPerformanceSummary } from '@/lib/team-metrics'
import {
  fetchTeamProgramHistory,
  fetchTeamProgramProgress,
} from '@/lib/team-program-progress'
import { Button } from '@/components/ui/button'
import { ClientSharedBanner } from '@/components/gym/client-gym-badge'
import { TeamCompetitionLink } from '@/components/teams/team-competition-link'
import { TeamDetailTabs } from '@/components/teams/team-detail-tabs'
import { TeamFormDialog } from '@/components/teams/team-form-dialog'
import { TeamDetailBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'
import { getGymsForCoach, isPrimaryTeamCoach } from '@/lib/gym-access'
import { getCoachPreferencesForCoachId } from '@/lib/coach-preferences-server'
import { fetchTeamChallengesWithLeaderboards } from '@/lib/team-challenges'
import { fetchTeamForumPosts } from '@/lib/team-forum'
import type {
  Client,
  Program,
  Team,
  TeamAnnouncement,
  TeamEventWithMemberStatus,
  TeamMemberWithClient,
} from 'app/types/database'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .maybeSingle()

  return {
    title: data?.name
      ? `${data.name} — Teams — Coaching App`
      : 'Team — Coaching App',
  }
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []

  const [
    { data: teamData },
    { data: memberRows },
    { data: clientsData },
    { data: programsData },
    { data: teamAssignments },
    { data: announcementRows },
    { data: eventRows },
  ] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).maybeSingle(),
    supabase
      .from('team_members')
      .select(
        `
        *,
        client:clients(id, full_name, status, avatar_url, email)
      `
      )
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('clients')
      .select('id, full_name, status')
      .order('full_name', { ascending: true }),
    supabase
      .from('programs')
      .select('id, name, status')
      .order('name', { ascending: true }),
    supabase
      .from('program_assignments')
      .select('client_id')
      .eq('team_id', teamId)
      .eq('status', 'active'),
    supabase
      .from('team_announcements')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false }),
    supabase
      .from('team_events')
      .select(
        `
        *,
        memberStatuses:team_event_member_status(
          *,
          client:clients(id, full_name, avatar_url)
        )
      `
      )
      .eq('team_id', teamId)
      .order('event_date', { ascending: true }),
  ])

  if (!teamData) {
    notFound()
  }

  const team = teamData as Team
  const viewerIsPrimaryCoach = user
    ? isPrimaryTeamCoach(user.id, team)
    : false
  let primaryCoachName: string | null = null

  if (!viewerIsPrimaryCoach && team.coach_id) {
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', team.coach_id)
      .maybeSingle()

    primaryCoachName =
      coachProfile?.full_name ?? coachProfile?.business_name ?? 'Coach'
  }

  const members = (memberRows ?? []) as TeamMemberWithClient[]
  const allClients = (clientsData ?? []) as Pick<
    Client,
    'id' | 'full_name' | 'status'
  >[]
  const availablePrograms = (programsData ?? []) as Pick<
    Program,
    'id' | 'name' | 'status'
  >[]
  const announcements = (announcementRows ?? []) as TeamAnnouncement[]
  const eventsWithStatuses = (eventRows ?? []) as TeamEventWithMemberStatus[]

  let activeProgram: Pick<
    Program,
    'id' | 'name' | 'description' | 'status'
  > | null = null

  if (team.active_program_id) {
    const { data: programData } = await supabase
      .from('programs')
      .select('id, name, description, status')
      .eq('id', team.active_program_id)
      .maybeSingle()

    activeProgram = programData as Pick<
      Program,
      'id' | 'name' | 'description' | 'status'
    > | null
  }

  const teamAssignedClientIds = (teamAssignments ?? []).map(
    (assignment) => assignment.client_id
  )

  const performance = await fetchTeamPerformanceSummary(
    supabase,
    members.map((member) => ({
      id: member.client.id,
      full_name: member.client.full_name,
    }))
  )

  const activity = await fetchTeamActivityFeed(
    supabase,
    members.map((member) => ({
      id: member.client.id,
      full_name: member.client.full_name,
    }))
  )

  const memberClientIds = members.map((member) => member.client.id)
  const programProgress =
    team.active_program_id && team.program_start_date
      ? await fetchTeamProgramProgress(
          supabase,
          team.active_program_id,
          team.program_start_date,
          memberClientIds
        )
      : null

  const programHistory = await fetchTeamProgramHistory(supabase, teamId)

  const { data: exerciseRows } = await supabase
    .from('exercises')
    .select('id, name')
    .eq('coach_id', team.coach_id)
    .eq('status', 'active')
    .order('name', { ascending: true })

  const todayKey = new Date().toISOString().slice(0, 10)
  const nextEvent =
    eventsWithStatuses.find((event) => event.event_date >= todayKey) ?? null

  const coachPreferences = await getCoachPreferencesForCoachId(team.coach_id)
  const challenges = await fetchTeamChallengesWithLeaderboards(
    supabase,
    teamId,
    team.coach_id,
    coachPreferences
  )
  const forumPosts = await fetchTeamForumPosts(supabase, teamId, team.coach_id)
  const weightClasses = Array.from(
    new Set(
      members
        .map((member) => member.weight_class?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Suspense fallback={null}>
        <TeamDetailBreadcrumbs teamId={teamId} teamName={team.name} />
      </Suspense>

      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="page-title">{team.name}</h1>
            {team.next_competition_name && team.next_competition_date && (
              <TeamCompetitionLink
                teamId={teamId}
                name={team.next_competition_name}
                date={team.next_competition_date}
              />
            )}
            {team.description && (
              <p className="helper-text max-w-2xl leading-relaxed whitespace-pre-wrap">
                {team.description}
              </p>
            )}
          </div>
          {viewerIsPrimaryCoach ? (
            <TeamFormDialog
              team={team}
              gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" />
                  Edit
                </Button>
              }
            />
          ) : null}
        </div>
      </section>

      {!viewerIsPrimaryCoach && primaryCoachName ? (
        <ClientSharedBanner primaryCoachName={primaryCoachName} />
      ) : null}

      <Suspense fallback={null}>
        <TeamDetailTabs
          teamId={teamId}
          team={team}
          members={members}
          allClients={allClients}
          teamAssignedClientIds={teamAssignedClientIds}
          availablePrograms={availablePrograms}
          activeProgram={activeProgram}
          announcements={announcements}
          forumPosts={forumPosts}
          events={eventsWithStatuses}
          performance={performance}
          activity={activity}
          programProgress={programProgress}
          programHistory={programHistory}
          nextEvent={nextEvent}
          exercises={exerciseRows ?? []}
          weightClasses={weightClasses}
          challenges={challenges}
          canEditLeaderboardLifts={viewerIsPrimaryCoach}
          canManageChallenges={viewerIsPrimaryCoach}
        />
      </Suspense>
    </div>
  )
}
