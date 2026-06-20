import { Suspense } from 'react'
import { Flag } from 'lucide-react'

import { PortalTeamAnnouncements } from '@/components/portal/portal-team-announcements'
import { PortalTeamEvents } from '@/components/portal/portal-team-events'
import { PortalTeamSwitcher } from '@/components/portal/portal-team-switcher'
import { Card, CardContent } from '@/components/ui/card'
import {
  formatCompetitionCountdown,
  formatCompetitionDate,
} from '@/lib/team-labels'
import {
  fetchClientTeamAnnouncements,
  fetchClientTeamEvents,
  fetchClientTeams,
} from '@/lib/portal-teams'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Team — Coaching App',
}

export default async function PortalTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team: teamParam } = await searchParams
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  if (!clientRecord) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Team announcements and events from your coach.
          </p>
        </section>
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link before you can view team info.
          </CardContent>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()
  const teams = await fetchClientTeams(supabase, clientRecord.id)

  if (teams.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Team announcements and events from your coach.
          </p>
        </section>
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            You&apos;re not on a team yet. Your coach will add you when you join
            a group program or competition team.
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeTeam =
    teams.find((team) => team.id === teamParam) ?? teams[0]

  const [announcements, events] = await Promise.all([
    fetchClientTeamAnnouncements(supabase, activeTeam.id, clientRecord.id),
    fetchClientTeamEvents(supabase, activeTeam.id, clientRecord.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Flag className="size-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {activeTeam.name}
            </h1>
            {activeTeam.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {activeTeam.description}
              </p>
            )}
            {activeTeam.next_competition_date && (
              <p className="text-muted-foreground text-xs">
                {formatCompetitionCountdown(
                  activeTeam.next_competition_date,
                  activeTeam.next_competition_name
                )}{' '}
                ·{' '}
                {formatCompetitionDate(activeTeam.next_competition_date)}
              </p>
            )}
          </div>
        </div>
        <Suspense fallback={null}>
          <PortalTeamSwitcher teams={teams} activeTeamId={activeTeam.id} />
        </Suspense>
      </section>

      <PortalTeamAnnouncements announcements={announcements} />
      <PortalTeamEvents teamId={activeTeam.id} events={events} />
    </div>
  )
}
