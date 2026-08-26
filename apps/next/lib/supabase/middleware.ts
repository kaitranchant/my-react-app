import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from 'app/types/database'

import {
  coachCanAccessPortal,
  resolveActiveSurface,
} from '@/lib/app-surface'
import { readActiveSurfaceCookieValue } from '@/lib/app-surface-server'

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readInviteToken(value: string | null): string | null {
  if (!value || !INVITE_TOKEN_PATTERN.test(value)) {
    return null
  }
  return value
}

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth',
  '/sign',
  '/book',
  '/pricing',
  '/privacy',
  '/gym/join',
  '/portal/join',
]
const MOBILE_AUTH_API_ROUTES = ['/api/wearables/apple-health/sync']
const CRON_API_ROUTES = ['/api/cron']
const PUBLIC_API_ROUTES = ['/api/stripe/webhook']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and getUser to avoid hard-to-debug
  // session bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isMobileAuthApiRoute = MOBILE_AUTH_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isCronApiRoute = CRON_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!user && !isPublicRoute && !isMobileAuthApiRoute && !isCronApiRoute && !isPublicApiRoute) {
    const url = request.nextUrl.clone()
    const returnPath = `${pathname}${request.nextUrl.search}`
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', returnPath)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/signup') {
    const gymInvite = readInviteToken(request.nextUrl.searchParams.get('gym_invite'))
    if (gymInvite) {
      const { data, error } = await supabase.rpc('get_gym_invite_preview', {
        p_token: gymInvite,
      })
      if (!error && data?.[0]?.email) {
        const url = request.nextUrl.clone()
        url.pathname = '/gym/join'
        url.search = ''
        url.searchParams.set('invite', gymInvite)
        return NextResponse.redirect(url)
      }
    }
  }

  const isPortalJoin =
    pathname === '/portal/join' || pathname.startsWith('/portal/join/')
  const isGymJoin = pathname === '/gym/join' || pathname.startsWith('/gym/join/')

  if (user && isPortalJoin) {
    const token = readInviteToken(request.nextUrl.searchParams.get('invite'))
    const { data, error } = token
      ? await supabase.rpc('get_client_invite_preview', { p_token: token })
      : { data: null, error: null }
    if (error || !data?.[0]?.email) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (user && isGymJoin) {
    const token = readInviteToken(request.nextUrl.searchParams.get('invite'))
    const { data, error } = token
      ? await supabase.rpc('get_gym_invite_preview', { p_token: token })
      : { data: null, error: null }
    if (error || !data?.[0]?.email) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    if (pathname === '/login') {
      const next = request.nextUrl.searchParams.get('next')
      if (next?.startsWith('/') && !next.startsWith('//')) {
        const url = request.nextUrl.clone()
        const [nextPath, nextQuery = ''] = next.split('?')
        url.pathname = nextPath
        url.search = nextQuery ? `?${nextQuery}` : ''
        return NextResponse.redirect(url)
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'client' ? '/portal' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? 'coach'
    const activeSurface = resolveActiveSurface({
      role,
      cookieValue: readActiveSurfaceCookieValue(request.headers.get('cookie') ?? undefined),
    })
    const isPortal = pathname.startsWith('/portal')
    const isApiRoute = pathname.startsWith('/api/')
    const isCoachArea =
      !isPortal &&
      !isPublicRoute &&
      !isMobileAuthApiRoute &&
      !isCronApiRoute &&
      !isPublicApiRoute &&
      !isApiRoute

    if (role === 'client' && isCoachArea) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      return NextResponse.redirect(url)
    }

    if (role === 'coach' && isPortal && !isPortalJoin) {
      if (
        !coachCanAccessPortal({
          role,
          activeSurface,
        })
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
