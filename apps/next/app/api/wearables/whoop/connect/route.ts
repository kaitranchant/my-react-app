import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import {
  buildWhoopAuthorizationUrl,
  createWhoopOAuthState,
  serializeWhoopOAuthState,
} from '@/lib/whoop/oauth'
import {
  isWhoopConfigured,
  WHOOP_OAUTH_COOKIE,
  WHOOP_OAUTH_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/whoop/config'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  if (!isWhoopConfigured()) {
    return NextResponse.redirect(
      `${origin}/portal/wearables?error=whoop_not_configured`
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/portal/wearables`)
  }

  const portalCtx = await getPortalClientContext()
  if (!portalCtx?.client) {
    return NextResponse.redirect(
      `${origin}/portal/wearables?error=client_profile_missing`
    )
  }

  const oauthState = createWhoopOAuthState(
    portalCtx.client.id,
    portalCtx.client.coach_id
  )
  const authorizationUrl = buildWhoopAuthorizationUrl(origin, oauthState)
  const cookieStore = await cookies()
  cookieStore.set(WHOOP_OAUTH_COOKIE, serializeWhoopOAuthState(oauthState), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: WHOOP_OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  })

  return NextResponse.redirect(authorizationUrl)
}
