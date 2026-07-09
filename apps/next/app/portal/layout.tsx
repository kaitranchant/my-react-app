import { redirect } from 'next/navigation'

import { PortalShell } from '@/components/portal/portal-shell'
import { coachCanAccessPortal } from '@/lib/app-surface'
import { getAppSurfaceContext } from '@/lib/app-surface-server'
import { getPortalDisplayPreferences } from '@/lib/coach-preferences-server'
import { getPortalNotificationPreferencesForUser } from '@/lib/portal-notification-preferences-server'
import { fetchPortalNavBadges } from '@/lib/portal-data'
import { emptyPortalNavBadges } from '@/lib/portal-nav-badges'
import { clientHasTeamMembership } from '@/lib/portal-teams'
import {
  ensureCoachPortalClient,
  getPortalClientContext,
} from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'coach'
  const surfaceContext = await getAppSurfaceContext({
    supabase,
    userId: user.id,
    role,
  })

  if (
    role === 'coach' &&
    !coachCanAccessPortal({
      role,
      activeSurface: surfaceContext.activeSurface,
    })
  ) {
    redirect('/dashboard')
  }

  if (role === 'coach') {
    const ensured = await ensureCoachPortalClient(supabase)
    if (!ensured.ok) {
      redirect('/dashboard')
    }
  }

  const portalCtx = await getPortalClientContext()
  const showTeamNav = portalCtx?.client?.id
    ? await clientHasTeamMembership(supabase, portalCtx.client.id)
    : false

  let navBadges = emptyPortalNavBadges
  let notificationPrefs = undefined
  if (portalCtx?.client?.id && user) {
    const coachPreferences = await getPortalDisplayPreferences(
      user.id,
      portalCtx.client.coach_id
    )
    ;[navBadges, notificationPrefs] = await Promise.all([
      fetchPortalNavBadges(supabase, portalCtx.client.id, coachPreferences),
      getPortalNotificationPreferencesForUser(user.id),
    ])
  }

  const name =
    portalCtx?.client.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Client'
  const avatarUrl = portalCtx?.client.avatar_url ?? profile?.avatar_url

  return (
    <PortalShell
      showTeamNav={showTeamNav}
      navBadges={navBadges}
      name={name}
      email={user.email ?? ''}
      avatarUrl={avatarUrl}
      userId={user.id}
      clientId={portalCtx?.client?.id ?? null}
      notificationPrefs={notificationPrefs}
      surfaceContext={surfaceContext}
    >
      {children}
    </PortalShell>
  )
}
