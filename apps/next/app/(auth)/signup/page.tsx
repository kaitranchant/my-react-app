import { redirect } from 'next/navigation'

import { AuthForm } from '@/components/auth/auth-form'
import { destinationIfGymInviteAlreadyLinked } from '@/lib/auth/invite-landing'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Sign up — Coaching App',
}

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; gym_invite?: string; error?: string }>
}) {
  const { invite, gym_invite: gymInvite, error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (gymInvite && INVITE_TOKEN_PATTERN.test(gymInvite)) {
      const { data, error: previewError } = await supabase.rpc(
        'get_gym_invite_preview',
        { p_token: gymInvite }
      )
      const stillPending = !previewError && Boolean(data?.[0]?.email)
      if (stillPending) {
        redirect(`/gym/join?invite=${gymInvite}`)
      }

      const alreadyJoined = await destinationIfGymInviteAlreadyLinked(
        user.id,
        gymInvite
      )
      redirect(alreadyJoined ?? '/dashboard')
    }

    if (invite && INVITE_TOKEN_PATTERN.test(invite)) {
      const { data, error: previewError } = await supabase.rpc(
        'get_client_invite_preview',
        { p_token: invite }
      )
      const stillPending = !previewError && Boolean(data?.[0]?.email)
      if (stillPending) {
        redirect(`/portal/join?invite=${invite}`)
      }

      redirect('/portal')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    redirect(profile?.role === 'client' ? '/portal' : '/dashboard')
  }

  let invitePreview: {
    clientName: string
    coachName: string
    email: string
    inviteToken: string
  } | null = null

  let gymInvitePreview: {
    gymName: string
    inviterName: string
    email: string
    inviteToken: string
  } | null = null

  if (gymInvite && INVITE_TOKEN_PATTERN.test(gymInvite)) {
    const { data, error } = await supabase.rpc('get_gym_invite_preview', {
      p_token: gymInvite,
    })

    if (!error) {
      const row = data?.[0]
      if (row?.email) {
        gymInvitePreview = {
          gymName: row.gym_name,
          inviterName: row.inviter_name,
          email: row.email,
          inviteToken: gymInvite,
        }
      }
    }
  } else if (invite && INVITE_TOKEN_PATTERN.test(invite)) {
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

  const hasInvalidInvite =
    !error &&
    ((invite && !invitePreview && !gymInvitePreview) ||
      (gymInvite && !gymInvitePreview && !invitePreview))

  return (
    <>
      {hasInvalidInvite && (
        <p className="text-destructive mb-4 text-center text-sm" role="alert">
          This invite link is no longer available. If you just created an
          account,{' '}
          <a href="/login" className="font-medium underline underline-offset-4">
            sign in
          </a>{' '}
          instead.
        </p>
      )}
      <AuthForm
        mode="signup"
        invitePreview={invitePreview}
        gymInvitePreview={gymInvitePreview}
        initialError={error ? decodeURIComponent(error) : undefined}
      />
    </>
  )
}
