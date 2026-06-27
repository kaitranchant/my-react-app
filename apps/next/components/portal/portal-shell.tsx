'use client'

import { usePathname } from 'next/navigation'

import { AppShellScrollLock } from '@/components/dashboard/app-shell-scroll-lock'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { UserMenu } from '@/components/dashboard/user-menu'
import { PortalMobileNav } from '@/components/portal/portal-mobile-nav'
import { PortalNavBadgesProvider } from '@/components/portal/portal-nav-badges-provider'
import { PortalSidebar } from '@/components/portal/portal-sidebar'
import { RealtimePushListener } from '@/components/notifications/realtime-push-listener'
import type { PortalNavBadges } from '@/lib/portal-nav-badges'
import type { PortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import { cn } from '@/lib/utils'

const PORTAL_IMMERSIVE_LOG_ROUTE = /^\/portal\/workouts\/[^/]+\/log(?:\/|$)/

type PortalShellProps = {
  children: React.ReactNode
  showTeamNav: boolean
  navBadges: PortalNavBadges
  name: string
  email: string
  avatarUrl?: string | null
  userId: string
  clientId?: string | null
  notificationPrefs?: PortalNotificationPreferences
}

export function PortalShell({
  children,
  showTeamNav,
  navBadges,
  name,
  email,
  avatarUrl,
  userId,
  clientId,
  notificationPrefs,
}: PortalShellProps) {
  const pathname = usePathname()
  const immersiveLog = PORTAL_IMMERSIVE_LOG_ROUTE.test(pathname)

  return (
    <PortalNavBadgesProvider initialBadges={navBadges}>
      <div className="fixed inset-0 flex overflow-hidden">
        <RealtimePushListener
          role="client"
          userId={userId}
          clientId={clientId}
          notificationPrefs={notificationPrefs}
        />
        <a
          href="#main-content"
          className="bg-background focus:ring-ring sr-only fixed left-4 top-4 z-50 rounded-md px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:outline-none focus:ring-2"
        >
          Skip to main content
        </a>
        <AppShellScrollLock />
        <PortalSidebar showTeamNav={showTeamNav} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={cn(
              'bg-background/80 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-sm sm:gap-4 sm:px-6',
              immersiveLog && 'hidden md:flex'
            )}
          >
            <div className="min-w-0 flex-1 md:hidden">
              <BrandLogo />
            </div>
            <div className="shrink-0">
              <UserMenu
                name={name}
                email={email}
                avatarUrl={avatarUrl}
                settingsHref="/portal/account"
              />
            </div>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              'app-shell-bg min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 lg:p-8',
              immersiveLog ? 'p-0 md:p-6 lg:p-8' : 'pb-24 sm:pb-24 md:pb-6 lg:pb-8'
            )}
          >
            <div
              className={cn(
                'mx-auto w-full max-w-6xl',
                immersiveLog && 'max-w-none md:max-w-6xl'
              )}
            >
              {children}
            </div>
          </main>
          {!immersiveLog ? (
            <PortalMobileNav showTeamNav={showTeamNav} />
          ) : null}
        </div>
      </div>
    </PortalNavBadgesProvider>
  )
}
