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
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const name =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'Coach'

  const [navBadges, notifications] = await Promise.all([
    fetchCoachNavBadges(supabase, user.id),
    fetchCoachNotificationItems(supabase, user.id),
  ])

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
