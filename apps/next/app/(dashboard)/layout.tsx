import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
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
        <header className="bg-background sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-4 sm:px-6">
          <div className="md:hidden font-semibold">Coaching App</div>
          <div className="ml-auto">
            <UserMenu name={name} email={user.email ?? ''} />
          </div>
        </header>
        <main className="bg-muted/30 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
