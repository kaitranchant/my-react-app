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
    .select('id, full_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  let activeProgram: {
    name: string
    description: string | null
    start_date: string | null
  } | null = null

  if (clientRecord?.id) {
    const { data: assignment } = await supabase
      .from('program_assignments')
      .select('start_date, program:programs(name, description)')
      .eq('client_id', clientRecord.id)
      .eq('status', 'active')
      .maybeSingle()

    if (assignment?.program && !Array.isArray(assignment.program)) {
      activeProgram = {
        name: assignment.program.name,
        description: assignment.program.description,
        start_date: assignment.start_date,
      }
    }
  }

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
            <CardTitle className="text-base">Your program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            {activeProgram ? (
              <>
                <p className="font-medium">{activeProgram.name}</p>
                {activeProgram.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {activeProgram.description}
                  </p>
                )}
                {activeProgram.start_date && (
                  <p className="text-muted-foreground text-xs">
                    Started{' '}
                    {new Date(`${activeProgram.start_date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Workout sessions will appear here as your coach builds them out.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                No program assigned yet. When your coach assigns your program,
                you&apos;ll track sessions and progress from this page.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
