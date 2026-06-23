import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Account — Coaching App',
}

export default async function PortalAccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  const name =
    clientRecord?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Client'

  const avatarUrl = clientRecord?.avatar_url ?? profile?.avatar_url

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="page-title">Account</h1>
        <p className="helper-text text-muted-foreground">
          Manage your profile photo and personal details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile photo</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientAvatarUpload
            name={name}
            avatarUrl={avatarUrl}
            forClientPortal
            size="lg"
          />
        </CardContent>
      </Card>
    </div>
  )
}
