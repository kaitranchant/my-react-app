'use client'

import * as React from 'react'
import { Loader2, RefreshCw, Smartphone, Watch } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import {
  disconnectWearableConnection,
  requestWearableConnection,
  syncWhoopConnectionNow,
} from '@/app/portal/wearables-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatWearableLastSynced,
  getWearableConnectionStatusLabel,
  getWearableConnectionStatusVariant,
  isWearableConnectionActive,
  WEARABLE_PROVIDERS,
} from '@/lib/wearables'
import type { ClientWearableConnection } from 'app/types/database'

type PortalWearableConnectPanelProps = {
  connections: ClientWearableConnection[]
}

const PORTAL_WEARABLE_ERRORS: Record<string, string> = {
  whoop_not_configured:
    'Whoop sign-in is not configured on this server yet.',
  client_profile_missing:
    'Your account is not linked to a client profile yet.',
  whoop_state_mismatch:
    'Whoop sign-in expired or was interrupted. Please try again.',
  whoop_session_mismatch:
    'Whoop sign-in did not match your current session. Please try again.',
  whoop_connect_failed:
    'Whoop connected but sync failed. Try Sync now or reconnect.',
  access_denied: 'Whoop access was not granted.',
}

export function PortalWearableConnectPanel({
  connections,
}: PortalWearableConnectPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pendingProvider, setPendingProvider] = React.useState<string | null>(
    null
  )

  React.useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected === 'whoop') {
      toast.success('Whoop connected', {
        description: 'Recovery, sleep, and strain data were synced to your coach.',
      })
      router.replace('/portal/wearables')
      return
    }

    if (error) {
      toast.error(PORTAL_WEARABLE_ERRORS[error] ?? 'Could not connect Whoop.')
      router.replace('/portal/wearables')
    }
  }, [router, searchParams])

  const connectionByProvider = React.useMemo(() => {
    const map = new Map<string, ClientWearableConnection>()
    for (const connection of connections) {
      map.set(connection.provider, connection)
    }
    return map
  }, [connections])

  async function handleConnect(provider: string) {
    setPendingProvider(provider)
    const result = await requestWearableConnection(
      provider as ClientWearableConnection['provider']
    )
    setPendingProvider(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    if (result.redirectUrl) {
      window.location.href = result.redirectUrl
      return
    }

    if (result.mobileDeepLink) {
      toast.success('Open the Coaching App on your iPhone', {
        description:
          'Sign in with your portal account, then allow Health access to finish setup.',
      })
      window.location.href = result.mobileDeepLink
      return
    }

    toast.success('Connection requested', {
      description: 'OAuth sync for this provider is not live yet.',
    })
  }

  async function handleDisconnect(provider: string) {
    setPendingProvider(provider)
    const result = await disconnectWearableConnection(
      provider as ClientWearableConnection['provider']
    )
    setPendingProvider(null)

    if (result.success) {
      toast.success('Device disconnected')
      return
    }

    toast.error(result.error)
  }

  async function handleSyncWhoop() {
    setPendingProvider('whoop-sync')
    const result = await syncWhoopConnectionNow()
    setPendingProvider(null)

    if (result.success) {
      toast.success('Whoop synced')
      return
    }

    toast.error(result.error)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {WEARABLE_PROVIDERS.map((config) => {
        const connection = connectionByProvider.get(config.provider) ?? null
        const isActive = isWearableConnectionActive(connection)
        const isPending = pendingProvider === config.provider
        const isWhoop = config.provider === 'whoop'
        const isAppleHealth = config.provider === 'apple_health'
        const isSyncing = pendingProvider === 'whoop-sync'

        return (
          <Card key={config.provider}>
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-brand/10 text-brand inline-flex size-10 items-center justify-center rounded-xl">
                    <Watch className="size-5" aria-hidden />
                  </span>
                  <div>
                    <CardTitle>{config.label}</CardTitle>
                    <CardDescription className="mt-1 text-sm leading-relaxed">
                      {config.description}
                    </CardDescription>
                  </div>
                </div>
                {connection ? (
                  <Badge
                    variant={getWearableConnectionStatusVariant(connection.status)}
                  >
                    {getWearableConnectionStatusLabel(connection.status)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-xs leading-relaxed">
                {config.connectHint}
              </p>
              {connection?.last_synced_at ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Last synced {formatWearableLastSynced(connection.last_synced_at)}
                </p>
              ) : null}
              {connection?.sync_error ? (
                <p className="text-destructive text-xs leading-relaxed">
                  {connection.sync_error}
                </p>
              ) : null}
              {isAppleHealth && connection?.status === 'pending' ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Waiting for your iPhone app to sync. Open the Coaching App,
                  sign in, and tap Sync Apple Health.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {isActive ? (
                  <>
                    {isWhoop && connection?.status === 'connected' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isSyncing}
                        onClick={handleSyncWhoop}
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Syncing…
                          </>
                        ) : (
                          <>
                            <RefreshCw className="size-4" />
                            Sync now
                          </>
                        )}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || isSyncing}
                      onClick={() => handleDisconnect(config.provider)}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Disconnecting…
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleConnect(config.provider)}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Connecting…
                      </>
                    ) : isWhoop ? (
                      'Sign in with Whoop'
                    ) : isAppleHealth ? (
                      <>
                        <Smartphone className="size-4" />
                        Set up on iPhone
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
