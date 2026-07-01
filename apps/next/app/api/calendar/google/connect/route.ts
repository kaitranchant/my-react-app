import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  GOOGLE_CALENDAR_OAUTH_COOKIE,
  GOOGLE_CALENDAR_OAUTH_COOKIE_MAX_AGE_SECONDS,
  isGoogleCalendarConfigured,
} from '@/lib/google-calendar/config'
import {
  buildGoogleCalendarAuthorizationUrl,
  createGoogleCalendarOAuthState,
  serializeGoogleCalendarOAuthState,
} from '@/lib/google-calendar/oauth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      `${origin}/scheduling?view=availability&error=google_calendar_not_configured`
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/scheduling`)
  }

  const oauthState = createGoogleCalendarOAuthState(user.id)
  const authorizationUrl = buildGoogleCalendarAuthorizationUrl(origin, oauthState)
  const cookieStore = await cookies()
  cookieStore.set(
    GOOGLE_CALENDAR_OAUTH_COOKIE,
    serializeGoogleCalendarOAuthState(oauthState),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: GOOGLE_CALENDAR_OAUTH_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    }
  )

  return NextResponse.redirect(authorizationUrl)
}
