'use client'

import * as React from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  getNotificationPermission,
  isWebPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '@/lib/web-push/client'
import { getVapidPublicKey } from '@/lib/web-push/config'

type WebPushSettingsProps = {
  role: 'coach' | 'client'
}

export function WebPushSettings({ role }: WebPushSettingsProps) {
  const [permission, setPermission] = React.useState<
    NotificationPermission | 'unsupported'
  >('default')
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)

  const configured = Boolean(getVapidPublicKey())
  const supported = isWebPushSupported()

  React.useEffect(() => {
    setPermission(getNotificationPermission())

    if (!supported) {
      return
    }

    void navigator.serviceWorker.getRegistration('/').then((registration) => {
      void registration?.pushManager.getSubscription().then((subscription) => {
        setIsSubscribed(Boolean(subscription))
      })
    })
  }, [supported])

  async function enablePush() {
    if (!supported || !configured) {
      return
    }

    setIsPending(true)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        toast.error('Browser notifications were blocked.')
        return
      }

      const subscription = await subscribeToWebPush()
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? 'Could not save push subscription.')
      }

      setIsSubscribed(true)
      toast.success('Browser notifications enabled')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not enable notifications.'
      )
    } finally {
      setIsPending(false)
    }
  }

  async function disablePush() {
    setIsPending(true)

    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      const endpoint = subscription?.endpoint

      await unsubscribeFromWebPush()

      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint ? { endpoint } : {}),
      })

      setIsSubscribed(false)
      toast.success('Browser notifications disabled')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not disable notifications.'
      )
    } finally {
      setIsPending(false)
    }
  }

  const description = (() => {
    if (!supported) {
      return 'Your browser does not support web notifications.'
    }

    if (!configured) {
      return 'Web push is not configured on this server yet. Ask your admin to set VAPID keys.'
    }

    if (permission === 'denied') {
      return 'Notifications are blocked in your browser settings. Unblock them to receive pop-ups.'
    }

    if (role === 'coach') {
      return 'Get pop-up alerts for new messages, check-ins, form reviews, and PRs — even when this tab is in the background.'
    }

    return 'Get pop-up alerts for coach messages, feedback, and reminders — even when this tab is in the background.'
  })()

  return (
    <SettingsRow label="Browser pop-up notifications" description={description}>
      {!supported || !configured || permission === 'denied' ? null : (
        <Button
          type="button"
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          disabled={isPending}
          onClick={() => (isSubscribed ? void disablePush() : void enablePush())}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isSubscribed ? (
            <>
              <BellOff className="size-4" />
              Disable
            </>
          ) : (
            <>
              <Bell className="size-4" />
              Enable
            </>
          )}
        </Button>
      )}
    </SettingsRow>
  )
}
