import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { BrandLogo } from '@/components/dashboard/brand-logo'
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
    .select('full_name')
    .eq('id', user.id)
    .single()

  const name =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'Coach'

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-4 backdrop-blur sm:px-6">
          <div className="md:hidden">
            <BrandLogo />
          </div>
          <div className="ml-auto">
            <UserMenu name={name} email={user.email ?? ''} />
          </div>
        </header>
        <main className="app-shell-bg flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
