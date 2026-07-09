import type { UserRole } from 'app/types/database'

export type AppSurface = 'coach' | 'client'

export const ACTIVE_SURFACE_COOKIE = 'active_surface'

export type AppSurfaceOptions = {
  canAccessCoach: boolean
  canAccessClient: boolean
  showSwitcher: boolean
  linkedClientId: string | null
}

export function parseActiveSurface(
  value: string | undefined | null
): AppSurface | null {
  if (value === 'coach' || value === 'client') {
    return value
  }
  return null
}

export function resolveActiveSurface(input: {
  role: UserRole
  cookieValue?: string | null
}): AppSurface {
  if (input.role === 'client') {
    return 'client'
  }

  return parseActiveSurface(input.cookieValue) ?? 'coach'
}

export function deriveAppSurfaceOptions(input: {
  role: UserRole
  linkedClientId?: string | null
}): AppSurfaceOptions {
  const canAccessCoach = input.role === 'coach'
  const canAccessClient =
    input.role === 'client' || input.role === 'coach'

  return {
    canAccessCoach,
    canAccessClient,
    showSwitcher: canAccessCoach && canAccessClient,
    linkedClientId: input.linkedClientId ?? null,
  }
}

export function coachCanAccessPortal(input: {
  role: UserRole
  activeSurface: AppSurface
}): boolean {
  return input.role === 'coach' && input.activeSurface === 'client'
}
