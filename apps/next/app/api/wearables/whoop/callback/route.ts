import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPortalClientContext } from '@/lib/portal-client'
import { fetchWhoopProfile } from '@/lib/whoop/api'
import { upsertWhoopConnection } from '@/lib/whoop/connection'
import {
  exchangeWhoopAuthorizationCode,
  parseWhoopOAuthState,
  tokenResponseToConnectionTokens,
} from '@/lib/whoop/oauth'
import {
  markWhoopConnectionError,
  syncWhoopConnection,
} from '@/lib/whoop/sync'
import { saveWhoopConnectionTokens } from '@/lib/whoop/token-store'
import { WHOOP_OAUTH_COOKIE } from '@/lib/whoop/config'

function redirectWithError(origin: string, code: string) {
  return NextResponse.redirect(
    `${origin}/portal/wearables?error=${encodeURIComponent(code)}`
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const providerError = searchParams.get('error')

  const cookieStore = await cookies()
  const storedState = parseWhoopOAuthState(
    cookieStore.get(WHOOP_OAUTH_COOKIE)?.value
  )
  cookieStore.delete(WHOOP_OAUTH_COOKIE)

  if (providerError) {
    return redirectWithError(origin, providerError)
  }

  if (!code || !state || !storedState || storedState.state !== state) {
    return redirectWithError(origin, 'whoop_state_mismatch')
  }

  const portalCtx = await getPortalClientContext()
  if (
    !portalCtx?.client ||
    portalCtx.client.id !== storedState.clientId ||
    portalCtx.client.coach_id !== storedState.coachId
  ) {
    return redirectWithError(origin, 'whoop_session_mismatch')
  }

  let connectionId: string | null = null

  try {
    const tokenResponse = await exchangeWhoopAuthorizationCode(code, origin)
    const profile = await fetchWhoopProfile(tokenResponse.access_token)
    const displayName = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()

    const connection = await upsertWhoopConnection({
      clientId: portalCtx.client.id,
      coachId: portalCtx.client.coach_id,
      externalUserId: String(profile.user_id),
      displayName: displayName || profile.email || 'Whoop member',
    })

    connectionId = connection.id

    await saveWhoopConnectionTokens(
      connection.id,
      tokenResponseToConnectionTokens(tokenResponse)
    )
    await syncWhoopConnection(connection)

    return NextResponse.redirect(`${origin}/portal/wearables?connected=whoop`)
  } catch (error) {
    if (connectionId) {
      await markWhoopConnectionError(
        connectionId,
        error instanceof Error ? error.message : 'Whoop sync failed.'
      )
    }

    return redirectWithError(origin, 'whoop_connect_failed')
  }
}
