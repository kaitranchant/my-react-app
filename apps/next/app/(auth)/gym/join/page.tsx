import { GymJoinClient } from '@/components/gym/gym-join-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Join gym — Coaching App',
}

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function GymJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  if (!invite || !INVITE_TOKEN_PATTERN.test(invite)) {
    return <GymJoinClient invalid />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_gym_invite_preview', {
    p_token: invite,
  })

  const row = data?.[0]

  if (error || !row?.email) {
    return <GymJoinClient invalid token={invite} />
  }

  const loginNext = encodeURIComponent(`/gym/join?invite=${invite}`)

  return (
    <GymJoinClient
      gymName={row.gym_name}
      inviterName={row.inviter_name}
      token={invite}
      inviteEmail={row.email}
      isAuthenticated={Boolean(user)}
      signupHref={`/signup?gym_invite=${invite}`}
      loginHref={`/login?next=${loginNext}`}
    />
  )
}
