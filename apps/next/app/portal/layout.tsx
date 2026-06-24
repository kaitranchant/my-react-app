import { redirect } from 'next/navigation'

import { PortalShell } from '@/components/portal/portal-shell'
import { getPortalClientContext } from '@/lib/portal-client'
import {
  fetchPortalFormReviewHighlight,
  fetchPortalMessageHighlight,
} from '@/lib/portal-home-highlights'
import { clientHasTeamMembership } from '@/lib/portal-teams'
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

  if (profile?.role !== 'client') {
    redirect('/dashboard')
  }

  const portalCtx = await getPortalClientContext()
  const showTeamNav = portalCtx?.client?.id
    ? await clientHasTeamMembership(supabase, portalCtx.client.id)
    : false

  let navBadges = { unreadMessages: 0, pendingFormReviews: 0 }
  if (portalCtx?.client?.id) {
    const [messageHighlight, formReviewHighlight] = await Promise.all([
      fetchPortalMessageHighlight(supabase, portalCtx.client.id),
      fetchPortalFormReviewHighlight(supabase, portalCtx.client.id),
    ])
    navBadges = {
      unreadMessages: messageHighlight?.unreadCount ?? 0,
      pendingFormReviews: formReviewHighlight?.pendingCount ?? 0,
    }
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
    >
      {children}
    </PortalShell>
  )
}
