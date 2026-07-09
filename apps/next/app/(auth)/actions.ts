'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  authErrorMessage,
  formatSupabaseAuthError,
} from '@/lib/auth/errors'
import {
  registerInvitedClient,
  signInClientAccount,
} from '@/lib/auth/client-invite-signup'
import { linkGymInviteAsAdmin } from '@/lib/auth/gym-invite-signup'
import { setActiveSurfaceCookie } from '@/lib/app-surface-server'
import { runOnboardingAutomationForUser } from '@/lib/client-onboarding-trigger'
import { getAppBaseUrl } from '@/lib/email/config'

export type AuthState = {
  error?: string
  message?: string
  redirectTo?: string
}

function missingEnvError(): AuthState | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      error:
        'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to apps/next/.env.local.',
    }
  }
  return null
}

async function postAuthRedirectPath(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/login'

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'client' ? '/portal' : '/dashboard'
}

function isSafeRedirectPath(path: string | null | undefined): path is string {
  return Boolean(path?.startsWith('/') && !path.startsWith('//'))
}

function inviteSignupDatabaseError(isClientSignup: boolean): string {
  return isClientSignup
    ? 'Could not complete signup. The invite may be invalid, expired, or the email may not match. Ask your coach for a new invite link.'
    : 'Could not complete signup. The gym invite may be invalid, expired, or the email may not match.'
}

function signupMetadata(input: {
  fullName: string
  isClientSignup: boolean
  inviteToken: string
  gymInviteToken: string
}) {
  return {
    full_name: input.fullName,
    role: input.isClientSignup ? 'client' : 'coach',
    pending_invite_token: input.isClientSignup
      ? input.inviteToken || undefined
      : undefined,
    pending_gym_invite_token: input.gymInviteToken || undefined,
  }
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirectTo') ?? '').trim()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const envError = missingEnvError()
  if (envError) return envError

  try {
    const supabase = await createClient()
    const signIn = await signInClientAccount(supabase, { email, password })

    if (!signIn.ok) {
      return { error: signIn.error }
    }
  } catch (error) {
    return { error: authErrorMessage(error) }
  }

  revalidatePath('/', 'layout')
  const supabase = await createClient()
  if (isSafeRedirectPath(redirectTo)) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const isClientRoute = redirectTo.startsWith('/portal')
      const isCoachRoute =
        redirectTo.startsWith('/dashboard') ||
        redirectTo.startsWith('/clients') ||
        redirectTo.startsWith('/scheduling')

      if (profile?.role === 'client' && isClientRoute) {
        return { redirectTo }
      }
      if (profile?.role !== 'client' && (
        isCoachRoute ||
        redirectTo.startsWith('/book') ||
        redirectTo.startsWith('/gym/join') ||
        redirectTo.startsWith('/portal/join') ||
        redirectTo.startsWith('/portal')
      )) {
        if (redirectTo.startsWith('/portal')) {
          await setActiveSurfaceCookie('client')
        }
        return {
          redirectTo: redirectTo.startsWith('/book')
            ? '/scheduling?view=availability'
            : redirectTo,
        }
      }
    }
  }

  return { redirectTo: await postAuthRedirectPath(supabase) }
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const inviteToken = String(formData.get('inviteToken') ?? '').trim()
  const gymInviteToken = String(formData.get('gymInviteToken') ?? '').trim()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if ((inviteToken || gymInviteToken) && !fullName) {
    return { error: 'Full name is required.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const envError = missingEnvError()
  if (envError) return envError

  const isClientSignup = Boolean(inviteToken)
  let signedUpUserId: string | null = null

  try {
    const supabase = await createClient()

    if (isClientSignup) {
      const registered = await registerInvitedClient(supabase, {
        email,
        password,
        fullName,
        inviteToken,
      })

      if (!registered.ok) {
        return { error: registered.error }
      }

      signedUpUserId = registered.userId
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: signupMetadata({
            fullName,
            isClientSignup,
            inviteToken,
            gymInviteToken,
          }),
          emailRedirectTo: `${getAppBaseUrl()}/auth/callback`,
        },
      })

      if (error) {
        const message = formatSupabaseAuthError(error)

        if (message === 'DATABASE_ERROR_SAVING_USER') {
          return { error: inviteSignupDatabaseError(isClientSignup) }
        }

        if (message === 'USER_ALREADY_EXISTS') {
          return {
            error:
              'An account with this email already exists. Sign in instead.',
          }
        }

        return { error: message }
      }

      if (!data.session) {
        return {
          message:
            'Check your email to confirm your account, then sign in.',
        }
      }

      signedUpUserId = data.user?.id ?? null

      if (gymInviteToken && signedUpUserId) {
        const linked = await linkGymInviteAsAdmin({
          inviteToken: gymInviteToken,
          userId: signedUpUserId,
          email,
        })

        if (!linked.ok) {
          return { error: linked.error }
        }

        revalidatePath('/', 'layout')
        return { redirectTo: `/gym?gym=${linked.gymId}` }
      }
    }

    revalidatePath('/', 'layout')

    if (isClientSignup && signedUpUserId) {
      void runOnboardingAutomationForUser(signedUpUserId)
    }

    return {
      redirectTo: isClientSignup
        ? '/portal'
        : await postAuthRedirectPath(supabase),
    }
  } catch (error) {
    return { error: authErrorMessage(error) }
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
