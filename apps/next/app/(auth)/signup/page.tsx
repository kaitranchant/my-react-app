import { AuthForm } from '@/components/auth/auth-form'
import { signup } from '@/app/(auth)/actions'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Sign up — Coaching App',
}

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

  if (invite) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('get_client_invite_preview', {
      p_token: invite,
    })
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

  return (
    <>
      {invite && !invitePreview && (
        <p className="text-destructive mb-4 text-center text-sm" role="alert">
          This invite link is invalid or has expired. Ask your coach for a new
          one.
        </p>
      )}
      <AuthForm mode="signup" action={signup} invitePreview={invitePreview} />
    </>
  )
}
