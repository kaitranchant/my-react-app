import { PortalProgressGallery } from '@/components/portal/portal-progress-gallery'
import { PortalRecentPrs } from '@/components/portal/portal-recent-prs'
import { PortalStrengthHistoryChart } from '@/components/portal/portal-strength-history-chart'
import { PortalTrainingConsistencyHeatmap } from '@/components/portal/portal-training-consistency-heatmap'
import { PortalAcwrStatCard } from '@/components/portal/portal-acwr-stat'
import { PortalStatCard } from '@/components/portal/portal-stat-cards'
import { VolumeBarChart } from '@/components/load/volume-bar-chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCoachPreferencesForCoachId } from '@/lib/coach-preferences-server'
import { formatVolume } from '@/lib/load-analytics'
import { fetchPortalProgressData } from '@/lib/portal-data'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Progress — Coaching App',
}

export default async function PortalProgressPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let progressData = null
  let coachPreferences = null

  if (clientRecord?.id) {
    coachPreferences = await getCoachPreferencesForCoachId(clientRecord.coach_id)
    progressData = await fetchPortalProgressData(
      supabase,
      clientRecord.id,
      coachPreferences
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Progress</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Track training volume, strength trends, personal records, and progress
          photos over time.
        </p>
      </section>

      {!clientRecord || !progressData ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can see your training history.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PortalStatCard
              label="This week volume"
              value={formatVolume(
                progressData.loadMetrics?.thisWeekVolume ?? 0,
                coachPreferences?.weightUnit ?? 'lbs'
              )}
              hint={
                progressData.loadMetrics?.volumeDeltaLabel ??
                'Log workouts to track load'
              }
              accent
            />
            <PortalAcwrStatCard loadMetrics={progressData.loadMetrics} />
            <PortalStatCard
              label="Current streak"
              value={
                progressData.streak > 0
                  ? `${progressData.streak} day${progressData.streak === 1 ? '' : 's'}`
                  : '—'
              }
              hint={
                progressData.streak > 0
                  ? 'Consecutive days with completed workouts'
                  : 'Complete a workout to start a streak'
              }
            />
            <PortalStatCard
              label="Completion rate"
              value={
                progressData.completionRate !== null
                  ? `${progressData.completionRate}%`
                  : '—'
              }
              hint={
                progressData.weekSessions.length > 0
                  ? `${progressData.weekSessions.length} session${progressData.weekSessions.length === 1 ? '' : 's'} this week`
                  : 'No sessions scheduled this week'
              }
            />
            <PortalStatCard
              label="Last active"
              value={progressData.lastActive}
              hint="Most recent session activity"
            />
          </div>

          {progressData.loadMetrics?.acwrLabel &&
            progressData.loadMetrics.acwrLabel !== '—' && (
              <Card>
                <CardHeader>
                  <CardTitle>Training load balance</CardTitle>
                  <CardDescription>
                    ACWR compares your recent training volume to your usual
                    baseline. A ratio between 0.8 and 1.3 is generally
                    considered a healthy balance. Yours is currently{' '}
                    <span className="text-foreground font-medium">
                      {progressData.loadMetrics.acwrLabel}
                    </span>
                    .
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Training consistency</CardTitle>
              <CardDescription>
                A year of completed sessions at a glance. Darker squares mean
                more workouts logged that day. Outlined squares are missed
                sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortalTrainingConsistencyHeatmap
                heatmap={progressData.trainingConsistency}
                weekStartsOn={coachPreferences?.weekStartsOn ?? 'monday'}
                achievementColors
              />
            </CardContent>
          </Card>

          {progressData.loadMetrics &&
            progressData.loadMetrics.weeklyVolumes.some(
              (bucket) => bucket.volume > 0
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle>8-week volume</CardTitle>
                  <CardDescription>
                    Total weight moved each week (lbs × reps). ACWR is
                    calculated from this tonnage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VolumeBarChart
                    buckets={progressData.loadMetrics.weeklyVolumes.map(
                      (bucket) => ({
                        weekStart: bucket.weekStart,
                        weekEnd: bucket.weekEnd,
                        value: bucket.volume,
                      })
                    )}
                  />
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Strength history</CardTitle>
              <CardDescription>
                See how your estimated 1RM has progressed over the last 6 months
                for any exercise you&apos;ve hit a PR on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortalStrengthHistoryChart
                exercises={progressData.strengthHistoryExercises}
                initialExerciseId={progressData.strengthHistoryExerciseId}
                initialTrend={progressData.strengthHistoryTrend}
                weightUnit={coachPreferences?.weightUnit ?? 'lbs'}
              />
            </CardContent>
          </Card>

          <PortalRecentPrs recentPrs={progressData.recentPrs} showViewAll />

          <PortalProgressGallery photos={progressData.progressPhotos} />
        </>
      )}
    </div>
  )
}
