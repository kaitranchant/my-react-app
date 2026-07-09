import { PortalJoinClient } from '@/components/portal/portal-join-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Join coach — Coaching App',
}

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function PortalJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  if (!invite || !INVITE_TOKEN_PATTERN.test(invite)) {
    return <PortalJoinClient invalid />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_client_invite_preview', {
    p_token: invite,
  })

  const row = data?.[0]

  if (error || !row?.email) {
    return <PortalJoinClient invalid token={invite} />
  }

  const loginNext = encodeURIComponent(`/portal/join?invite=${invite}`)

  return (
    <PortalJoinClient
      clientName={row.client_name}
      coachName={row.coach_name}
      token={invite}
      inviteEmail={row.email}
      isAuthenticated={Boolean(user)}
      signupHref={`/signup?invite=${invite}`}
      loginHref={`/login?next=${loginNext}`}
    />
  )
}
