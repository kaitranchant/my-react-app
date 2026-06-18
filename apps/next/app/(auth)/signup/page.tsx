import { AuthForm } from '@/components/auth/auth-form'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Sign up — Coaching App',
}

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  let invitePreview: {
    clientName: string
    coachName: string
    email: string
    inviteToken: string
  } | null = null

  if (invite && INVITE_TOKEN_PATTERN.test(invite)) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_client_invite_preview', {
      p_token: invite,
    })

    if (!error) {
      const row = data?.[0]
      if (row?.email) {
        invitePreview = {
          clientName: row.client_name,
          coachName: row.coach_name,
          email: row.email,
          inviteToken: invite,
        }
      }
    }
  }

  return (
    <>
      {invite && !invitePreview && (
        <p className="text-destructive mb-4 text-center text-sm" role="alert">
          This invite link is invalid or has expired. Ask your coach for a new
          one.
        </p>
      )}
      <AuthForm mode="signup" invitePreview={invitePreview} />
    </>
  )
}
