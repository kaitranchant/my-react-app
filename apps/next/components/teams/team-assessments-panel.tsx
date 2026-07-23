'use client'

import * as React from 'react'
import { ChevronRight, ClipboardList } from 'lucide-react'

import {
  fetchTeamAssessmentSessions,
  type TeamAssessmentSessionSummary,
} from '@/app/(dashboard)/teams/assessment-actions'
import {
  TeamAssessmentCreate,
  TeamAssessmentRunner,
} from '@/components/teams/team-assessment-runner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAssessmentDate } from '@/lib/assessments'

type PanelView =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'run'; sessionId: string }

type TeamAssessmentsPanelProps = {
  teamId: string
  memberCount: number
}

export function TeamAssessmentsPanel({
  teamId,
  memberCount,
}: TeamAssessmentsPanelProps) {
  const [view, setView] = React.useState<PanelView>({ mode: 'list' })
  const [sessions, setSessions] = React.useState<
    TeamAssessmentSessionSummary[] | null
  >(null)

  const loadSessions = React.useCallback(() => {
    fetchTeamAssessmentSessions(teamId).then(setSessions)
  }, [teamId])

  React.useEffect(() => {
    if (view.mode === 'list') {
      loadSessions()
    }
  }, [view.mode, loadSessions])

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Team assessments</CardTitle>
        {view.mode === 'list' ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setView({ mode: 'create' })}
            disabled={memberCount === 0}
          >
            Start team assessment
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {view.mode === 'create' ? (
          <TeamAssessmentCreate
            teamId={teamId}
            memberCount={memberCount}
            onCancel={() => setView({ mode: 'list' })}
            onCreated={(sessionId) => setView({ mode: 'run', sessionId })}
          />
        ) : view.mode === 'run' ? (
          <TeamAssessmentRunner
            sessionId={view.sessionId}
            onExit={() => setView({ mode: 'list' })}
          />
        ) : sessions == null ? (
          <p className="text-muted-foreground text-sm">Loading assessments…</p>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ClipboardList className="text-muted-foreground size-8" aria-hidden />
            <p className="font-medium">No team assessments yet</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              {memberCount === 0
                ? 'Add athletes to this team, then run an assessment day across the whole roster.'
                : 'Pick a set of tests once and score every athlete on the roster, one test at a time.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sessions.map((session) => {
              const totalScores = session.itemCount * session.memberCount
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setView({ mode: 'run', sessionId: session.id })}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {session.title ?? 'Team assessment'}
                      </p>
                      {session.status === 'completed' ? (
                        <Badge variant="success-soft">Completed</Badge>
                      ) : (
                        <Badge variant="warning-soft">In progress</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatAssessmentDate(session.assessed_at)}
                      {' · '}
                      {session.itemCount} test{session.itemCount === 1 ? '' : 's'}
                      {' · '}
                      {session.memberCount} athlete
                      {session.memberCount === 1 ? '' : 's'}
                      {' · '}
                      {session.scoredCount}/{totalScores} scores
                    </p>
                  </div>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
