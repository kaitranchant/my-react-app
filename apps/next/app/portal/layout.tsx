import { redirect } from 'next/navigation'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import { AppShellScrollLock } from '@/components/dashboard/app-shell-scroll-lock'
import { UserMenu } from '@/components/dashboard/user-menu'
import { PortalMobileNav } from '@/components/portal/portal-mobile-nav'
import { PortalSidebar } from '@/components/portal/portal-sidebar'
import { getPortalClientContext } from '@/lib/portal-client'
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
  const name =
    portalCtx?.client.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Client'
  const avatarUrl = portalCtx?.client.avatar_url ?? profile?.avatar_url

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <AppShellScrollLock />
      <PortalSidebar showTeamNav={showTeamNav} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="bg-background/80 z-10 flex h-16 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-sm sm:px-6">
          <div className="md:hidden">
            <BrandLogo />
          </div>
          <div className="ml-auto">
            <UserMenu
              name={name}
              email={user.email ?? ''}
              avatarUrl={avatarUrl}
            />
          </div>
        </header>
        <main className="app-shell-bg min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
        <PortalMobileNav showTeamNav={showTeamNav} />
      </div>
    </div>
  )
}
