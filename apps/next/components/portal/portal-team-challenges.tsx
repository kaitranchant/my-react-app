import { LeaderboardTable } from '@/components/leaderboards/leaderboard-table'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatChallengeDateRange } from '@/lib/leaderboard'
import {
  teamChallengeStatusBadgeVariant,
  teamChallengeStatusLabels,
} from '@/lib/team-labels'
import type { TeamChallengeWithLeaderboard } from '@/lib/team-challenges'
import { parseLeaderboardMetric } from '@/lib/validations/leaderboard'
import { cn } from '@/lib/utils'

type PortalTeamChallengesProps = {
  teamName: string
  challenges: TeamChallengeWithLeaderboard[]
}

export function PortalTeamChallenges({
  teamName,
  challenges,
}: PortalTeamChallengesProps) {
  const visibleChallenges = challenges.filter(
    (item) =>
      item.displayStatus === 'active' ||
      item.displayStatus === 'upcoming' ||
      item.displayStatus === 'completed'
  )

  if (visibleChallenges.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="section-header">Team challenges</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Compete with teammates in coach-run challenges. Standings update as you
          log workouts.
        </p>
      </div>

      <div className="space-y-4">
        {visibleChallenges.map((item) => {
          const metric = parseLeaderboardMetric(item.challenge.metric)
          const showStandings =
            item.displayStatus === 'active' || item.displayStatus === 'completed'

          return (
            <Card key={item.challenge.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{item.challenge.name}</CardTitle>
                  <Badge
                    variant={
                      teamChallengeStatusBadgeVariant[item.displayStatus]
                    }
                  >
                    {teamChallengeStatusLabels[item.displayStatus]}
                  </Badge>
                </div>
                <CardDescription>
                  {item.metricLabel}
                  {item.exerciseName ? ` · ${item.exerciseName}` : ''}
                  {' · '}
                  {formatChallengeDateRange(
                    item.challenge.start_date,
                    item.challenge.end_date
                  )}
                </CardDescription>
                {item.challenge.description ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.challenge.description}
                  </p>
                ) : null}
              </CardHeader>

              {showStandings ? (
                <CardContent className="border-t pt-4">
                  <LeaderboardTable
                    rows={item.leaderboard.rows}
                    metric={metric}
                    exerciseName={item.exerciseName}
                    teamName={teamName}
                    periodLabel={item.periodLabel}
                    showWeightClass={Boolean(item.challenge.weight_class_filter)}
                    readOnly
                  />
                </CardContent>
              ) : (
                <CardContent className={cn('text-muted-foreground text-sm')}>
                  This challenge starts on{' '}
                  {new Date(
                    `${item.challenge.start_date}T12:00:00`
                  ).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}
                  . Check back when it begins.
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
