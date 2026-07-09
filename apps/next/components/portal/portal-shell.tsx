'use client'

import { usePathname } from 'next/navigation'

import { AppShellScrollLock } from '@/components/dashboard/app-shell-scroll-lock'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { UserMenu } from '@/components/dashboard/user-menu'
import { AppSurfaceSwitcher } from '@/components/layout/app-surface-switcher'
import { PortalMobileNav } from '@/components/portal/portal-mobile-nav'
import { PortalNavBadgesProvider } from '@/components/portal/portal-nav-badges-provider'
import { PortalSidebar } from '@/components/portal/portal-sidebar'
import { RealtimePushListener } from '@/components/notifications/realtime-push-listener'
import { MobileKeyboardReserve } from '@/components/mobile-keyboard/mobile-keyboard'
import { MobileKeyboardShell } from '@/components/mobile-keyboard/mobile-keyboard-shell'
import type { AppSurfaceContext } from '@/lib/app-surface-server'
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
  surfaceContext: AppSurfaceContext
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
  surfaceContext,
}: PortalShellProps) {
  const pathname = usePathname()
  const immersiveLog = PORTAL_IMMERSIVE_LOG_ROUTE.test(pathname)

  return (
    <PortalNavBadgesProvider initialBadges={navBadges}>
      <MobileKeyboardShell enabled={!immersiveLog}>
      <div data-app-shell className="flex overflow-hidden">
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
              'bg-background/80 z-10 shrink-0 border-b backdrop-blur-sm',
              immersiveLog && 'hidden md:block'
            )}
          >
            <div className="flex h-16 items-center gap-2 px-4 sm:gap-4 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                <div className="min-w-0 md:hidden">
                  <BrandLogo />
                </div>
                <AppSurfaceSwitcher
                  activeSurface={surfaceContext.activeSurface}
                  showSwitcher={surfaceContext.showSwitcher}
                  className="hidden md:inline-flex"
                />
              </div>
              <div className="shrink-0">
                <UserMenu
                  name={name}
                  email={email}
                  avatarUrl={avatarUrl}
                  settingsHref="/portal/account"
                />
              </div>
            </div>
            {surfaceContext.showSwitcher ? (
              <div className="border-t px-4 pb-3 pt-2 md:hidden">
                <AppSurfaceSwitcher
                  activeSurface={surfaceContext.activeSurface}
                  showSwitcher
                  className="flex w-full"
                />
              </div>
            ) : null}
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              'app-shell-bg min-h-0 flex-1 overscroll-y-contain p-4 sm:p-6 lg:p-8',
              immersiveLog
                ? 'flex flex-col overflow-hidden p-0 md:block md:overflow-y-auto md:p-6 lg:p-8'
                : 'overflow-y-auto pb-24 sm:pb-24 md:pb-6 lg:pb-8'
            )}
          >
            <div
              className={cn(
                'mx-auto w-full max-w-6xl',
                immersiveLog &&
                  'flex h-full min-h-0 max-w-none flex-col md:max-w-6xl'
              )}
            >
              {children}
            </div>
            <MobileKeyboardReserve />
          </main>
          {!immersiveLog ? (
            <PortalMobileNav showTeamNav={showTeamNav} />
          ) : null}
        </div>
      </div>
      </MobileKeyboardShell>
    </PortalNavBadgesProvider>
  )
}
