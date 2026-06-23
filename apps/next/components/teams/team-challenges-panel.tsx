'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Rocket, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import {
  cancelTeamChallenge,
  deleteTeamChallenge,
  publishTeamChallenge,
  restoreTeamChallenge,
} from '@/app/(dashboard)/teams/challenge-actions'
import { CreateTeamChallengeDialog } from '@/components/teams/create-team-challenge-dialog'
import { LeaderboardTable } from '@/components/leaderboards/leaderboard-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toastSuccessWithUndo } from '@/lib/toast-undo'
import { formatChallengeDateRange } from '@/lib/leaderboard'
import {
  teamChallengeStatusLabels,
} from '@/lib/team-labels'
import { parseLeaderboardMetric } from '@/lib/validations/leaderboard'
import type { TeamChallengeWithLeaderboard } from '@/lib/team-challenges'
import { cn } from '@/lib/utils'

type TeamChallengesPanelProps = {
  teamId: string
  teamName: string
  challenges: TeamChallengeWithLeaderboard[]
  exercises: { id: string; name: string }[]
  weightClasses?: string[]
  canManage?: boolean
}

function ChallengeCard({
  teamId,
  teamName,
  item,
  canManage,
}: {
  teamId: string
  teamName: string
  item: TeamChallengeWithLeaderboard
  canManage: boolean
}) {
  const router = useRouter()
  const [expanded, setExpanded] = React.useState(
    item.displayStatus === 'active' || item.displayStatus === 'upcoming'
  )
  const [pending, setPending] = React.useState(false)
  const metric = parseLeaderboardMetric(item.challenge.metric)

  async function handlePublish() {
    setPending(true)
    const result = await publishTeamChallenge(teamId, item.challenge.id)
    setPending(false)
    if (result.success) {
      toast.success('Challenge published')
      router.refresh()
      return
    }
    toast.error(result.error)
  }

  async function handleCancel() {
    setPending(true)
    const result = await cancelTeamChallenge(teamId, item.challenge.id)
    setPending(false)
    if (result.success) {
      toast.success('Challenge cancelled')
      router.refresh()
      return
    }
    toast.error(result.error)
  }

  async function handleDelete() {
    const snapshot = item.challenge
    setPending(true)
    const result = await deleteTeamChallenge(teamId, item.challenge.id)
    setPending(false)
    if (result.success) {
      toastSuccessWithUndo('Challenge deleted', async () => {
        const undoResult = await restoreTeamChallenge(teamId, snapshot)
        if (undoResult.success) {
          toast.success('Challenge restored')
          router.refresh()
        } else {
          toast.error(undoResult.error)
        }
      })
      router.refresh()
      return
    }
    toast.error(result.error)
  }

  const showLeaderboard =
    item.displayStatus !== 'draft' && item.displayStatus !== 'cancelled'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{item.challenge.name}</CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  'h-6',
                  item.displayStatus === 'active' && 'border-emerald-500/30 text-emerald-700'
                )}
              >
                {teamChallengeStatusLabels[item.displayStatus]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {item.metricLabel}
              {item.exerciseName ? ` · ${item.exerciseName}` : ''}
              {' · '}
              {formatChallengeDateRange(
                item.challenge.start_date,
                item.challenge.end_date
              )}
            </p>
            {item.challenge.description ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.challenge.description}
              </p>
            ) : null}
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {item.displayStatus === 'draft' ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => void handlePublish()}
                >
                  <Rocket className="size-4" />
                  Publish
                </Button>
              ) : null}
              {item.displayStatus === 'draft' ||
              item.displayStatus === 'active' ||
              item.displayStatus === 'upcoming' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void handleCancel()}
                >
                  <XCircle className="size-4" />
                  Cancel
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => void handleDelete()}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        {showLeaderboard ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 w-fit px-2"
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                expanded && 'rotate-180'
              )}
            />
            {expanded ? 'Hide standings' : 'Show standings'}
          </Button>
        ) : null}
      </CardHeader>

      {showLeaderboard && expanded ? (
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
      ) : null}
    </Card>
  )
}

export function TeamChallengesPanel({
  teamId,
  teamName,
  challenges,
  exercises,
  weightClasses = [],
  canManage = true,
}: TeamChallengesPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Challenges</h2>
          <p className="text-muted-foreground text-sm">
            Time-boxed team competitions with live standings.
          </p>
        </div>
        {canManage ? (
          <CreateTeamChallengeDialog
            teamId={teamId}
            exercises={exercises}
            weightClasses={weightClasses}
          />
        ) : null}
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No challenges yet. Create a monthly volume, consistency, or strength
            challenge to keep the team competing.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {challenges.map((item) => (
            <ChallengeCard
              key={item.challenge.id}
              teamId={teamId}
              teamName={teamName}
              item={item}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}
