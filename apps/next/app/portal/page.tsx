import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { UserMenu } from '@/components/dashboard/user-menu'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'

export const metadata = {
  title: 'My training — Coaching App',
}

export default async function PortalPage() {
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

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('full_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const name =
    clientRecord?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Athlete'

  const avatarUrl = clientRecord?.avatar_url ?? profile?.avatar_url

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <BrandLogo />
        <UserMenu
          name={name}
          email={user.email ?? ''}
          avatarUrl={avatarUrl}
        />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 sm:p-10">
        <div className="space-y-4">
          <ClientAvatarUpload
            name={name}
            avatarUrl={avatarUrl}
            forClientPortal
            size="md"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight uppercase">
              Welcome, {name}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your coach&apos;s workouts and check-ins will appear here.
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workouts</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm leading-relaxed">
            No workouts assigned yet. When your coach builds your program,
            you&apos;ll track sessions and progress from this page.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
