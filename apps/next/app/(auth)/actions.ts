'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { runOnboardingAutomationForUser } from '@/lib/client-onboarding-trigger'

export type AuthState = {
  error?: string
  message?: string
  redirectTo?: string
}

function formatAuthError(message: string): string {
  if (message === 'fetch failed') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
    return `Could not connect to Supabase at ${url}. Open Supabase Dashboard → Project Settings → API, copy the Project URL and anon key into apps/next/.env.local, then restart \`yarn web\`.`
  }
  return message
}

function authErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause as NodeJS.ErrnoException | undefined
    if (cause?.code === 'ENOTFOUND') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
      return `Could not reach Supabase at ${url}. That hostname does not exist — copy the correct Project URL from Supabase Dashboard → Project Settings → API into apps/next/.env.local.`
    }
    return formatAuthError(error.message)
  }
  return 'Something went wrong. Please try again.'
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: formatAuthError(error.message) }
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
      if (profile?.role !== 'client' && (isCoachRoute || redirectTo.startsWith('/book'))) {
        return { redirectTo: redirectTo.startsWith('/book') ? '/scheduling?view=availability' : redirectTo }
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
    const origin = (await headers()).get('origin') ?? ''
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: isClientSignup ? 'client' : 'coach',
          invite_token: inviteToken || undefined,
          gym_invite_token: gymInviteToken || undefined,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      const message = formatAuthError(error.message)
      if (message.toLowerCase().includes('database error saving new user')) {
        return {
          error: isClientSignup
            ? 'Could not complete signup. The invite may be invalid, expired, or the email may not match. Ask your coach for a new invite link.'
            : 'Could not complete signup. The gym invite may be invalid, expired, or the email may not match.',
        }
      }
      return { error: message }
    }

    // When email confirmation is enabled, no session is returned yet.
    if (!data.session) {
      return {
        message: isClientSignup
          ? 'Check your email to confirm your account, then sign in to view your program.'
          : 'Check your email to confirm your account, then sign in.',
      }
    }

    signedUpUserId = data.user?.id ?? null
  } catch (error) {
    return { error: authErrorMessage(error) }
  }

  revalidatePath('/', 'layout')
  const supabase = await createClient()
  if (isClientSignup && signedUpUserId) {
    void runOnboardingAutomationForUser(signedUpUserId)
  }
  return {
    redirectTo: isClientSignup
      ? '/portal'
      : await postAuthRedirectPath(supabase),
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
