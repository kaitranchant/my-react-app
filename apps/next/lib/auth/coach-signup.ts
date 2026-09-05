import type { createClient } from '@/lib/supabase/server'
import {
  formatSupabaseAuthError,
  isUserAlreadyExistsError,
} from '@/lib/auth/errors'
import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function registerCoachAccount(
  supabase: SupabaseServerClient,
  input: {
    email: string
    password: string
    fullName: string
    gymInviteToken?: string
  }
): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string; code?: 'USER_ALREADY_EXISTS' }
> {
  const admin = createAdminClient()
  if (!admin) {
    return {
      ok: false,
      error:
        'Coach signup requires SUPABASE_SERVICE_ROLE_KEY in your server environment.',
    }
  }

  const metadata = {
    full_name: input.fullName,
    role: 'coach',
    pending_gym_invite_token: input.gymInviteToken || undefined,
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    }
  )

  if (createError) {
    if (isUserAlreadyExistsError(createError)) {
      return {
        ok: false,
        error: 'An account with this email already exists. Sign in instead.',
        code: 'USER_ALREADY_EXISTS',
      }
    }

    return { ok: false, error: formatSupabaseAuthError(createError) }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (signInError) {
    return { ok: false, error: formatSupabaseAuthError(signInError) }
  }

  return { ok: true, userId: created.user.id }
}
