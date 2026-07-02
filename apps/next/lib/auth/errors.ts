export type SupabaseAuthErrorLike = {
  message?: string
  code?: string
  status?: number | string
}

export function formatAuthErrorMessage(message: string): string {
  if (message === 'fetch failed') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
    return `Could not connect to Supabase at ${url}. Open Supabase Dashboard → Project Settings → API, copy the Project URL and anon key into apps/next/.env.local, then restart \`yarn web\`.`
  }
  return message
}

export function formatSupabaseAuthError(
  error: SupabaseAuthErrorLike | null | undefined
): string {
  if (!error) {
    return 'Something went wrong. Please try again.'
  }

  const message =
    typeof error.message === 'string' && error.message.trim()
      ? error.message.trim()
      : ''
  const code = typeof error.code === 'string' ? error.code : ''

  if (
    code === 'user_already_exists' ||
    message.toLowerCase().includes('already registered')
  ) {
    return 'USER_ALREADY_EXISTS'
  }

  if (message.toLowerCase().includes('database error saving new user')) {
    return 'DATABASE_ERROR_SAVING_USER'
  }

  if (message) {
    return formatAuthErrorMessage(message)
  }

  return 'Something went wrong. Please try again.'
}

export function formatClientInviteLinkError(message: string): string {
  if (message.includes('Invalid or expired invite')) {
    return 'This invite link is invalid or has expired. Ask your coach for a new one.'
  }

  if (message.includes('Invite email does not match signup email')) {
    return 'This invite was sent to a different email address.'
  }

  return message
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause as NodeJS.ErrnoException | undefined
    if (cause?.code === 'ENOTFOUND') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
      return `Could not reach Supabase at ${url}. That hostname does not exist — copy the correct Project URL from Supabase Dashboard → Project Settings → API into apps/next/.env.local.`
    }
    return formatAuthErrorMessage(error.message)
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return formatSupabaseAuthError(error as SupabaseAuthErrorLike)
  }

  return 'Something went wrong. Please try again.'
}
