import { PortalInbodyPanel } from '@/components/portal/portal-inbody-panel'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type { ClientInbodyScan } from 'app/types/database'

export const metadata = {
  title: 'InBody results — Coaching App',
}

export default async function PortalInbodyPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let scans: ClientInbodyScan[] = []

  if (clientRecord?.id) {
    const { data } = await supabase
      .from('client_inbody_scans')
      .select('*')
      .eq('client_id', clientRecord.id)
      .order('scan_date', { ascending: false })
      .limit(50)

    scans = (data ?? []) as ClientInbodyScan[]
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">InBody results</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Log your InBody scan data and track weight, muscle mass, and body fat
          over time.
        </p>
      </section>

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can log InBody scans.
          </CardContent>
        </Card>
      ) : (
        <PortalInbodyPanel scans={scans} />
      )}
    </div>
  )
}
