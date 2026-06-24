import { Suspense } from 'react'

import { listClientWearableConnections } from '@/app/portal/wearables-actions'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { PortalSectionSkeleton } from '@/components/portal/portal-page-skeletons'
import { PortalWearableConnectPanel } from '@/components/wearables/portal-wearable-connect-panel'
import { WearablesComingSoon } from '@/components/wearables/wearables-coming-soon'
import { getPortalClientContext } from '@/lib/portal-client'
import { areWearablesLive } from '@/lib/wearables-feature'

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
        <PortalUnlinkedState feature="connect a wearable" />
      ) : (
        <Suspense fallback={<PortalSectionSkeleton rows={2} />}>
          <PortalWearableConnectPanel connections={connections} />
        </Suspense>
      )}
    </div>
  )
}
