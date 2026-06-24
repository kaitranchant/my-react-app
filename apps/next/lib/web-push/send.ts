import webpush from 'web-push'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  getVapidPrivateKey,
  getVapidSubject,
  isWebPushConfigured,
} from '@/lib/web-push/config'
import {
  serializeWebPushPayload,
  type WebPushPayload,
} from '@/lib/web-push/payload'

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured || !isWebPushConfigured()) {
    return
  }

  webpush.setVapidDetails(
    getVapidSubject(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    getVapidPrivateKey()
  )
  vapidConfigured = true
}

export async function sendWebPushToUser(
  userId: string,
  payload: WebPushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0 }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { sent: 0, failed: 0 }
  }

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0 }
  }

  ensureVapidConfigured()

  let sent = 0
  let failed = 0
  const expiredIds: string[] = []
  const body = serializeWebPushPayload(payload)

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body
        )
        sent += 1
      } catch (error) {
        failed += 1
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? Number(error.statusCode)
            : null

        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(subscription.id)
        }
      }
    })
  )

  if (expiredIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return { sent, failed }
}
