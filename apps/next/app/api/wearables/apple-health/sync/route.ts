import { NextResponse } from 'next/server'

import { upsertAppleHealthConnection } from '@/lib/apple-health/connection'
import { syncAppleHealthConnection } from '@/lib/apple-health/sync'
import {
  authenticateMobileRequest,
  requirePortalClientForMobileUser,
} from '@/lib/api/mobile-auth'
import { appleHealthSyncPayloadSchema } from '@/lib/validations/apple-health'

export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const clientResult = await requirePortalClientForMobileUser(
    auth.supabase,
    auth.user.id
  )
  if (!clientResult.ok) {
    return NextResponse.json(
      { error: clientResult.error },
      { status: clientResult.status }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = appleHealthSyncPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid sync payload.' },
      { status: 400 }
    )
  }

  try {
    const connection = await upsertAppleHealthConnection({
      clientId: clientResult.client.id,
      coachId: clientResult.client.coach_id,
      displayName: 'Apple Health',
    })

    const { syncedDays } = await syncAppleHealthConnection(
      connection,
      parsed.data.metrics
    )

    return NextResponse.json({ success: true, syncedDays })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Apple Health sync failed.',
      },
      { status: 500 }
    )
  }
}
