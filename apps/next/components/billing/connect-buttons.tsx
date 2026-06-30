'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  openConnectDashboard,
  resetConnectAccountAction,
  startConnectOnboarding,
  syncConnectAccountAction,
} from '@/app/(dashboard)/billing/actions'
import { Button } from '@/components/ui/button'
import { getStripePlatformProfileUrl } from '@/lib/stripe/connect-errors'
import type { StripeKeyMode } from '@/lib/stripe/config'
import { cn } from '@/lib/utils'

type ConnectOnboardingButtonProps = {
  children: React.ReactNode
  stripeKeyMode?: StripeKeyMode | null
  variant?: 'brand' | 'outline' | 'ghost' | 'default' | 'secondary' | 'destructive' | 'link'
  className?: string
  disabled?: boolean
}

export function ConnectOnboardingButton({
  children,
  stripeKeyMode = null,
  variant = 'brand',
  className,
  disabled = false,
}: ConnectOnboardingButtonProps) {
  const [loading, setLoading] = React.useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await startConnectOnboarding()
      if (!result.success) {
        if (result.platformProfileRequired) {
          toast.error(result.error, {
            action: {
              label: 'Open Stripe',
              onClick: () => {
                window.open(
                  getStripePlatformProfileUrl(stripeKeyMode),
                  '_blank',
                  'noopener,noreferrer'
                )
              },
            },
            duration: 10000,
          })
        } else {
          toast.error(result.error)
        }
        return
      }
      window.location.href = result.url
    } catch {
      toast.error('Could not start Stripe Connect onboarding.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}

export function ConnectSyncButton({
  variant = 'outline',
  className,
}: {
  variant?: 'brand' | 'outline' | 'ghost' | 'default' | 'secondary' | 'destructive' | 'link'
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await syncConnectAccountAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Stripe Connect status refreshed.')
      router.refresh()
    } catch {
      toast.error('Could not refresh Connect status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      Refresh status
    </Button>
  )
}

type ResetConnectButtonProps = {
  variant?: 'brand' | 'outline' | 'ghost' | 'default' | 'secondary' | 'destructive' | 'link'
  className?: string
}

export function ResetConnectButton({
  variant = 'outline',
  className,
}: ResetConnectButtonProps) {
  const [loading, setLoading] = React.useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await resetConnectAccountAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Connect account cleared. Click Connect Stripe to start again.')
    } catch {
      toast.error('Could not reset Connect account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      Reset Connect
    </Button>
  )
}

type LiveHttpsConnectHelpProps = {
  appBaseUrl: string
  hasStuckAccount?: boolean
}

export function LiveHttpsConnectHelp({
  appBaseUrl,
  hasStuckAccount = false,
}: LiveHttpsConnectHelpProps) {
  return (
    <div className="border-status-warning/30 bg-status-warning/10 space-y-3 rounded-lg border px-4 py-3 text-sm">
      <p className="font-medium">Live Stripe requires an HTTPS app URL</p>
      <p className="text-muted-foreground">
        Stripe will not redirect back to <code className="text-xs">{appBaseUrl}</code>{' '}
        with live keys. Set <code className="text-xs">APP_URL</code> to an{' '}
        <code className="text-xs">https://</code> URL, then restart the dev server.
      </p>
      <ol className="text-muted-foreground list-inside list-decimal space-y-1">
        <li>
          In <code className="text-xs">.env.local</code>, set{' '}
          <code className="text-xs">APP_URL=https://your-production-domain.com</code>{' '}
          (your Vercel URL, or an ngrok tunnel like{' '}
          <code className="text-xs">https://abc123.ngrok-free.app</code>).
        </li>
        <li>Restart the dev server.</li>
        {hasStuckAccount ? (
          <li>Click Reset Connect if you need to clear a half-finished account.</li>
        ) : null}
        <li>
          Click Connect Stripe — after onboarding Stripe returns to that HTTPS URL
          (your production site or tunnel).
        </li>
      </ol>
      {hasStuckAccount ? (
        <div>
          <ResetConnectButton />
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Use LiveHttpsConnectHelp */
export function LocalStripeConnectHelp(props: LiveHttpsConnectHelpProps) {
  return <LiveHttpsConnectHelp {...props} />
}

type ConnectDashboardButtonProps = {
  children: React.ReactNode
  variant?: 'brand' | 'outline' | 'ghost' | 'default' | 'secondary' | 'destructive' | 'link'
  className?: string
}

export function ConnectDashboardButton({
  children,
  variant = 'outline',
  className,
}: ConnectDashboardButtonProps) {
  const [loading, setLoading] = React.useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await openConnectDashboard()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not open Stripe dashboard.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}
