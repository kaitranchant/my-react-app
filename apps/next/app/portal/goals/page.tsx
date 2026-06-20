import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { DailyTargetsCard } from '@/components/goals/daily-targets-card'
import { GoalProgressCard } from '@/components/goals/goal-progress-card'
import { partitionClientGoals } from '@/lib/goal-progress'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type { ClientGoal, ClientInbodyScan } from 'app/types/database'

export const metadata = {
  title: 'Goals — Coaching App',
}

export default async function PortalGoalsPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let goals: ClientGoal[] = []
  let scans: ClientInbodyScan[] = []
  let goalsSchemaError: string | null = null

  if (clientRecord?.id) {
    const [goalsResult, scansResult] = await Promise.all([
      supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('client_inbody_scans')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('scan_date', { ascending: false })
        .limit(50),
    ])

    goals = (goalsResult.data ?? []) as ClientGoal[]
    goalsSchemaError = goalsResult.error?.message ?? null
    scans = (scansResult.data ?? []) as ClientInbodyScan[]
  }

  const { dailyGoals, compositionGoals } = partitionClientGoals(goals)

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Daily targets and body composition progress set by your coach.
        </p>
      </section>

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can see your goals.
          </CardContent>
        </Card>
      ) : goalsSchemaError?.includes('Could not find the table') ? (
        <SchemaSetupNotice
          tables={['client_goals']}
          sqlFile="apply-client-goals.sql"
        />
      ) : (
        <>
          <DailyTargetsCard goals={dailyGoals} />

          <section className="grid gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Body composition goals
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Progress is measured from your first InBody scan to your most
                recent.
              </p>
            </div>

            {compositionGoals.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
                  Your coach has not set any body composition goals yet.
                </CardContent>
              </Card>
            ) : (
              compositionGoals.map((goal) => (
                <GoalProgressCard key={goal.id} goal={goal} scans={scans} />
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
