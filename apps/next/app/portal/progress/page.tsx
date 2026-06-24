import { PortalProgressGallery } from '@/components/portal/portal-progress-gallery'
import { PortalProgressMobileHeatmap } from '@/components/portal/portal-progress-mobile-heatmap'
import { PortalRecentPrs } from '@/components/portal/portal-recent-prs'
import { PortalStrengthHistoryChart } from '@/components/portal/portal-strength-history-chart'
import { PortalTrainingConsistencyHeatmap } from '@/components/portal/portal-training-consistency-heatmap'
import { PortalAcwrStatCard } from '@/components/portal/portal-acwr-stat'
import { PortalStatCard } from '@/components/portal/portal-stat-cards'
import { VolumeBarChart } from '@/components/load/volume-bar-chart'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPortalDisplayPreferences } from '@/lib/coach-preferences-server'
import { formatVolume } from '@/lib/load-analytics'
import { fetchPortalProgressData } from '@/lib/portal-data'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Progress — Coaching App',
}

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  )
}

export default async function PortalProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let progressData = null
  let coachPreferences = null

  if (clientRecord?.id && user) {
    coachPreferences = await getPortalDisplayPreferences(
      user.id,
      clientRecord.coach_id
    )
    progressData = await fetchPortalProgressData(
      supabase,
      clientRecord.id,
      coachPreferences
    )
  }

  const weightUnit = coachPreferences?.weightUnit ?? 'lbs'
  const weekSessionsLabel =
    progressData && progressData.weekSessions.length > 0
      ? `${progressData.weekSessions.length} session${progressData.weekSessions.length === 1 ? '' : 's'} this week`
      : 'No sessions scheduled this week'

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Progress</h1>
        <p className="text-muted-foreground hidden text-sm leading-relaxed md:block">
          Track training volume, strength trends, personal records, and progress
          photos over time.
        </p>
      </section>

      {!clientRecord ? (
        <PortalUnlinkedState feature="see your training history" />
      ) : !progressData ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Unable to load your progress data right now. Try refreshing the page.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:hidden">
            <PortalStatCard
              label="This week volume"
              value={formatVolume(
                progressData.loadMetrics?.thisWeekVolume ?? 0,
                weightUnit
              )}
              hint={
                progressData.loadMetrics?.volumeDeltaLabel ??
                'Log workouts to track load'
              }
              accent
              compact
            />
            <PortalAcwrStatCard
              loadMetrics={progressData.loadMetrics}
              compact
            />
            <PortalStatCard
              label="Current streak"
              value={
                progressData.streak > 0
                  ? `${progressData.streak} day${progressData.streak === 1 ? '' : 's'}`
                  : '—'
              }
              hint={
                progressData.streak > 0
                  ? 'Consecutive days with workouts'
                  : 'Start a workout'
              }
              compact
            />
            <PortalStatCard
              label="Completion rate"
              value={
                progressData.completionRate !== null
                  ? `${progressData.completionRate}%`
                  : '—'
              }
              hint={weekSessionsLabel}
              compact
              valueTone={
                progressData.completionRate === 0 ? 'warning' : 'default'
              }
            />
            <PortalStatCard
              label="Last active"
              value={progressData.lastActive}
              hint="Most recent session"
              compact
            />
          </div>

          <div className="hidden gap-4 sm:grid-cols-2 lg:grid-cols-3 md:grid">
            <PortalStatCard
              label="This week volume"
              value={formatVolume(
                progressData.loadMetrics?.thisWeekVolume ?? 0,
                weightUnit
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
              hint={weekSessionsLabel}
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
                <CardHeader className="pb-2 md:pb-6">
                  <CardTitle className="text-base md:text-lg">
                    Training load balance
                  </CardTitle>
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

          <div className="md:hidden">
            <PortalProgressMobileHeatmap
              heatmap={progressData.trainingConsistency}
              weekStartsOn={coachPreferences?.weekStartsOn ?? 'monday'}
            />
          </div>

          <Card className="hidden md:block">
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
                <CardHeader className="pb-2 md:pb-6">
                  <CardTitle className="text-base md:text-lg">
                    8-week volume
                  </CardTitle>
                  <CardDescription>
                    Total weight moved each week ({weightUnit} × reps). ACWR is
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

          <section className="space-y-3 md:space-y-0">
            <div className="md:hidden">
              <MobileSectionLabel>Strength history</MobileSectionLabel>
            </div>
            <Card>
              <CardHeader className="hidden md:block">
                <CardTitle>Strength history</CardTitle>
                <CardDescription>
                  See how your estimated 1RM has progressed over the last 6 months
                  for any exercise you&apos;ve hit a PR on.
                </CardDescription>
              </CardHeader>
              <CardContent className="md:pt-0">
                <div className="md:hidden">
                  <PortalStrengthHistoryChart
                    exercises={progressData.strengthHistoryExercises}
                    initialExerciseId={progressData.strengthHistoryExerciseId}
                    initialTrend={progressData.strengthHistoryTrend}
                    weightUnit={weightUnit}
                    presentation="portal"
                  />
                </div>
                <div className="hidden md:block">
                  <PortalStrengthHistoryChart
                    exercises={progressData.strengthHistoryExercises}
                    initialExerciseId={progressData.strengthHistoryExerciseId}
                    initialTrend={progressData.strengthHistoryTrend}
                    weightUnit={weightUnit}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="md:hidden">
            <PortalRecentPrs
              recentPrs={progressData.recentPrs}
              showViewAll
              presentation="portal"
            />
          </div>
          <div className="hidden md:block">
            <PortalRecentPrs recentPrs={progressData.recentPrs} showViewAll />
          </div>

          <div className="md:hidden">
            <PortalProgressGallery
              photos={progressData.progressPhotos}
              presentation="portal"
            />
          </div>
          <div className="hidden md:block">
            <PortalProgressGallery photos={progressData.progressPhotos} />
          </div>
        </>
      )}
    </div>
  )
}
