import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { fetchCoachNavBadges } from '@/lib/dashboard-queries'
import { fetchCoachNotificationItems } from '@/lib/coach-notifications'
import { createClient } from '@/lib/supabase/server'

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
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'client') {
    redirect('/portal')
  }

  const name =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'Coach'

  const navBadges = await fetchCoachNavBadges(supabase, user.id)
  const notifications = await fetchCoachNotificationItems(
    supabase,
    user.id,
    navBadges
  )

  return (
    <DashboardShell
      name={name}
      email={user.email ?? ''}
      avatarUrl={profile?.avatar_url}
      userId={user.id}
      navBadges={navBadges}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  )
}
