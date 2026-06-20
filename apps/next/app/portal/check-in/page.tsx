import { PortalCheckInPanel } from '@/components/portal/portal-check-in-panel'
import { attachSignedUrlsToPhotos } from '@/lib/progress-photos'
import { Card, CardContent } from '@/components/ui/card'
import { getCheckInPeriodBounds } from '@/lib/check-in-cadence'
import { getCoachDateKey } from '@/lib/coach-preferences'
import { getCoachPreferencesForCoachId } from '@/lib/coach-preferences-server'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type { ClientCheckIn, ClientProgressPhotoWithUrl } from 'app/types/database'

export const metadata = {
  title: 'Check-in — Coaching App',
}

export default async function PortalCheckInPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let periodCheckIn: ClientCheckIn | null = null
  let recentCheckIns: ClientCheckIn[] = []
  let todayPhotos: ClientProgressPhotoWithUrl[] = []
  let coachPreferences = null

  if (clientRecord?.id) {
    coachPreferences = await getCoachPreferencesForCoachId(clientRecord.coach_id)
    const coachTodayKey = getCoachDateKey(coachPreferences.timezone)
    const { start: periodStart, end: periodEnd } = getCheckInPeriodBounds(
      coachPreferences.defaultCheckInFrequency,
      coachPreferences.weekStartsOn,
      coachPreferences.timezone
    )

    const [periodCheckInResult, recentCheckInsResult] = await Promise.all([
      supabase
        .from('client_check_ins')
        .select('*')
        .eq('client_id', clientRecord.id)
        .gte('check_in_date', periodStart)
        .lte('check_in_date', periodEnd)
        .order('check_in_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('client_check_ins')
        .select('*')
        .eq('client_id', clientRecord.id)
        .neq('check_in_date', coachTodayKey)
        .order('check_in_date', { ascending: false })
        .limit(3),
    ])

    periodCheckIn = (periodCheckInResult.data as ClientCheckIn | null) ?? null
    recentCheckIns = (recentCheckInsResult.data ?? []) as ClientCheckIn[]

    if (periodCheckIn?.id) {
      const { data: photoData } = await supabase
        .from('client_progress_photos')
        .select('*')
        .eq('check_in_id', periodCheckIn.id)
        .order('pose', { ascending: true })

      todayPhotos = await attachSignedUrlsToPhotos(
        supabase,
        (photoData ?? []) as Omit<ClientProgressPhotoWithUrl, 'signedUrl'>[]
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Share how you are feeling so your coach can adjust your program.
        </p>
      </section>

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link before you can submit check-ins.
          </CardContent>
        </Card>
      ) : (
        <PortalCheckInPanel
          periodCheckIn={periodCheckIn}
          recentCheckIns={recentCheckIns}
          periodPhotos={todayPhotos}
          coachPreferences={coachPreferences}
        />
      )}
    </div>
  )
}
