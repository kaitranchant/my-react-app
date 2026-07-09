import { cookies } from 'next/headers'

import {
  ACTIVE_SURFACE_COOKIE,
  type AppSurface,
  type AppSurfaceOptions,
  deriveAppSurfaceOptions,
  parseActiveSurface,
  resolveActiveSurface,
} from '@/lib/app-surface'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from 'app/types/database'

export type AppSurfaceContext = AppSurfaceOptions & {
  activeSurface: AppSurface
}

export async function setActiveSurfaceCookie(surface: AppSurface) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_SURFACE_COOKIE, surface, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function getLinkedClientId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.id ?? null
}

export async function getAppSurfaceContext(input: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  role: UserRole
}): Promise<AppSurfaceContext> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACTIVE_SURFACE_COOKIE)?.value
  const linkedClientId = await getLinkedClientId(input.supabase, input.userId)
  const options = deriveAppSurfaceOptions({
    role: input.role,
    linkedClientId,
  })

  return {
    ...options,
    activeSurface: resolveActiveSurface({
      role: input.role,
      cookieValue,
    }),
  }
}

export function readActiveSurfaceFromRequestCookie(
  cookieValue: string | undefined,
  role: UserRole
): AppSurface {
  return resolveActiveSurface({
    role,
    cookieValue,
  })
}

export function readActiveSurfaceCookieValue(
  cookieHeader: string | undefined
): string | undefined {
  if (!cookieHeader) return undefined

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${ACTIVE_SURFACE_COOKIE}=`)) {
      return decodeURIComponent(trimmed.slice(ACTIVE_SURFACE_COOKIE.length + 1))
    }
  }

  return undefined
}

export { parseActiveSurface }
