import { NextResponse } from 'next/server'

import { handleGoogleCalendarWebhook } from '@/lib/google-calendar/watch'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const channelId = request.headers.get('x-goog-channel-id')
  const channelToken = request.headers.get('x-goog-channel-token')
  const resourceId = request.headers.get('x-goog-resource-id')
  const resourceState = request.headers.get('x-goog-resource-state')

  try {
    await handleGoogleCalendarWebhook({
      channelId,
      channelToken,
      resourceId,
      resourceState,
    })
  } catch (error) {
    console.error('[google-calendar] webhook processing failed', error)
  }

  return NextResponse.json({ received: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
