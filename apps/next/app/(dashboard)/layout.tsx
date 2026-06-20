import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { GlobalSearch } from '@/components/dashboard/global-search'
import { UserMenu } from '@/components/dashboard/user-menu'

export default async function DashboardLayout({
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
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const name =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'Coach'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="bg-background/80 z-10 flex h-16 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-sm sm:px-6">
          <div className="md:hidden">
            <BrandLogo />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center sm:justify-start">
            <GlobalSearch />
          </div>
          <div className="shrink-0">
            <UserMenu
              name={name}
              email={user.email ?? ''}
              avatarUrl={profile?.avatar_url}
            />
          </div>
        </header>
        <main className="app-shell-bg min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
