'use client'

import { getVapidPublicKey } from '@/lib/web-push/config'

export type PushSubscriptionKeys = {
  endpoint: string
  p256dh: string
  auth: string
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index)
  }

  return output
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getNotificationPermission():
  | NotificationPermission
  | 'unsupported' {
  if (!isWebPushSupported()) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  })

  await navigator.serviceWorker.ready
  return registration
}

export async function subscribeToWebPush(): Promise<PushSubscriptionKeys> {
  const vapidPublicKey = getVapidPublicKey()
  if (!vapidPublicKey) {
    throw new Error('Web push is not configured on this server.')
  }

  const registration = await registerPushServiceWorker()
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  const json = subscription.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Could not read push subscription keys.')
  }

  return { endpoint, p256dh, auth }
}

export async function unsubscribeFromWebPush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }
}

export function showBrowserNotification(payload: {
  title: string
  body: string
  url: string
  tag?: string
}) {
  if (!isWebPushSupported() || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: '/vercel.svg',
  })

  notification.onclick = () => {
    window.focus()
    window.location.assign(payload.url)
    notification.close()
  }
}
