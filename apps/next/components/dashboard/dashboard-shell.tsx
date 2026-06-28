'use client'

import { usePathname } from 'next/navigation'

import { AppShellScrollLock } from '@/components/dashboard/app-shell-scroll-lock'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { DashboardMobileBottomNav } from '@/components/dashboard/dashboard-mobile-bottom-nav'
import { CoachNotificationCenter } from '@/components/dashboard/coach-notification-center'
import { DashboardShortcuts } from '@/components/dashboard/dashboard-shortcuts'
import { GlobalSearch } from '@/components/dashboard/global-search'
import { RealtimePushListener } from '@/components/notifications/realtime-push-listener'
import { Sidebar } from '@/components/dashboard/sidebar'
import { UserMenu } from '@/components/dashboard/user-menu'
import type { CoachNavBadges } from '@/lib/dashboard-queries'
import type { CoachNotificationItem } from '@/lib/coach-notifications'
import { cn } from '@/lib/utils'

const COACH_IMMERSIVE_LOG_ROUTE =
  /^\/clients\/[^/]+\/workouts\/[^/]+\/log(?:\/|$)/

type DashboardShellProps = {
  children: React.ReactNode
  name: string
  email: string
  avatarUrl?: string | null
  userId: string
  navBadges: CoachNavBadges
  notifications: CoachNotificationItem[]
}

export function DashboardShell({
  children,
  name,
  email,
  avatarUrl,
  userId,
  navBadges,
  notifications,
}: DashboardShellProps) {
  const pathname = usePathname()
  const immersiveLog = COACH_IMMERSIVE_LOG_ROUTE.test(pathname)

  return (
    <div data-app-shell className="flex overflow-hidden">
      <RealtimePushListener role="coach" userId={userId} />
      <a
        href="#main-content"
        className="bg-background focus:ring-ring sr-only fixed left-4 top-4 z-50 rounded-md px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:outline-none focus:ring-2"
      >
        Skip to main content
      </a>
      <AppShellScrollLock />
      <Sidebar badges={navBadges} />
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
          <div className="hidden min-w-0 flex-1 md:flex md:items-center">
            <GlobalSearch />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <CoachNotificationCenter items={notifications} />
            <div className="md:hidden">
              <GlobalSearch />
            </div>
            <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'app-shell-bg min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 lg:p-8',
            immersiveLog ? 'p-0 md:p-6 lg:p-8' : 'pb-24 md:pb-6 lg:pb-8'
          )}
        >
          {children}
        </main>
        {!immersiveLog ? <DashboardMobileBottomNav badges={navBadges} /> : null}
        <DashboardShortcuts />
      </div>
    </div>
  )
}
