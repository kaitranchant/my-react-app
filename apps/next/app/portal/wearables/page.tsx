import { listClientWearableConnections } from '@/app/portal/wearables-actions'
import { PortalWearableConnectPanel } from '@/components/wearables/portal-wearable-connect-panel'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { getPortalClientContext } from '@/lib/portal-client'
import { WearablesComingSoon } from '@/components/wearables/wearables-coming-soon'
import { areWearablesLive } from '@/lib/wearables-feature'
import { Suspense } from 'react'

export const metadata = {
  title: 'Wearables — Coaching App',
}

export default async function PortalWearablesPage() {
  if (!areWearablesLive()) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="page-title">Wearables</h1>
        </section>
        <WearablesComingSoon audience="client" />
      </div>
    )
  }

  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null
  const connections = clientRecord ? await listClientWearableConnections() : []

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Wearables</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect a device to share sleep, recovery, and activity data with your
          coach. Apple Health syncs through the Coaching App on iPhone; other
          providers connect here on the web.
        </p>
      </section>

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can connect a wearable.
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={null}>
          <PortalWearableConnectPanel connections={connections} />
        </Suspense>
      )}
    </div>
  )
}
