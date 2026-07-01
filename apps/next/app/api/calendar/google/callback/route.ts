import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { upsertCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import { GOOGLE_CALENDAR_OAUTH_COOKIE } from '@/lib/google-calendar/config'
import {
  exchangeGoogleCalendarAuthorizationCode,
  fetchGoogleUserEmail,
  parseGoogleCalendarOAuthState,
} from '@/lib/google-calendar/oauth'
import {
  saveGoogleCalendarTokens,
  tokenResponseToGoogleTokens,
} from '@/lib/google-calendar/token-store'
import { registerGoogleCalendarWatch } from '@/lib/google-calendar/watch'
import { createClient } from '@/lib/supabase/server'

function redirectWithError(origin: string, code: string) {
  return NextResponse.redirect(
    `${origin}/scheduling?view=availability&error=${encodeURIComponent(code)}`
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const providerError = searchParams.get('error')

  const cookieStore = await cookies()
  const storedState = parseGoogleCalendarOAuthState(
    cookieStore.get(GOOGLE_CALENDAR_OAUTH_COOKIE)?.value
  )
  cookieStore.delete(GOOGLE_CALENDAR_OAUTH_COOKIE)

  if (providerError) {
    return redirectWithError(origin, providerError)
  }

  if (!code || !state || !storedState || storedState.state !== state) {
    return redirectWithError(origin, 'google_calendar_state_mismatch')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== storedState.coachId) {
    return redirectWithError(origin, 'google_calendar_session_mismatch')
  }

  try {
    const tokenResponse = await exchangeGoogleCalendarAuthorizationCode(code, origin)
    const tokens = tokenResponseToGoogleTokens(tokenResponse)
    const googleEmail = await fetchGoogleUserEmail(tokens.accessToken)

    const connection = await upsertCoachGoogleCalendarConnection({
      coachId: user.id,
      googleEmail,
    })

    await saveGoogleCalendarTokens(connection.id, tokens)

    await registerGoogleCalendarWatch(connection)

    return NextResponse.redirect(
      `${origin}/scheduling?view=availability&connected=google_calendar`
    )
  } catch {
    return redirectWithError(origin, 'google_calendar_connect_failed')
  }
}
