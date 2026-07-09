export type SupabaseAuthErrorLike = {
  message?: string
  code?: string
  status?: number | string
  msg?: string
  error_description?: string
}

const GENERIC_AUTH_ERROR = 'Something went wrong. Please try again.'

export function formatAuthErrorMessage(message: string): string {
  if (message === 'fetch failed') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
    return `Could not connect to Supabase at ${url}. Open Supabase Dashboard → Project Settings → API, copy the Project URL and anon key into apps/next/.env.local, then restart \`yarn web\`.`
  }
  return message
}

function readAuthErrorMessage(error: SupabaseAuthErrorLike): string {
  for (const value of [
    error.message,
    error.msg,
    error.error_description,
  ]) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

export function formatSupabaseAuthError(error: unknown): string {
  if (!error) {
    return GENERIC_AUTH_ERROR
  }

  if (typeof error === 'string') {
    const message = error.trim()
    return message ? formatAuthErrorMessage(message) : GENERIC_AUTH_ERROR
  }

  if (error instanceof Error) {
    const message = error.message.trim()
    return message ? formatAuthErrorMessage(message) : GENERIC_AUTH_ERROR
  }

  if (typeof error !== 'object') {
    return GENERIC_AUTH_ERROR
  }

  const record = error as SupabaseAuthErrorLike
  const message = readAuthErrorMessage(record)
  const code = typeof record.code === 'string' ? record.code : ''

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

  if (code) {
    return `Sign up failed (${code}). Please try again.`
  }

  return GENERIC_AUTH_ERROR
}

export function isUserAlreadyExistsError(error: SupabaseAuthErrorLike): boolean {
  const message = readAuthErrorMessage(error).toLowerCase()
  const code = typeof error.code === 'string' ? error.code : ''
  return (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  )
}

export function isEmailNotConfirmedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const record = error as SupabaseAuthErrorLike
  const message = readAuthErrorMessage(record).toLowerCase()
  const code = typeof record.code === 'string' ? record.code : ''

  return (
    code === 'email_not_confirmed' ||
    message.includes('email not confirmed')
  )
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

export function formatGymInviteLinkError(message: string): string {
  if (message.includes('Invalid or expired invite')) {
    return 'This gym invite link is invalid or has expired. Ask the gym owner for a new link.'
  }

  if (message.includes('Invite email does not match signup email')) {
    return 'This invite was sent to a different email address.'
  }

  if (message.includes('already a member of this gym')) {
    return 'You are already a member of this gym.'
  }

  if (
    message.includes('only belong to one gym') ||
    message.includes('gym_members_one_active_gym_per_coach_idx')
  ) {
    return 'You can only belong to one gym. Leave or delete your current gym before joining another.'
  }

  return message
}

export function normalizeAuthFormError(error: unknown): string | null {
  if (error == null || error === false) {
    return null
  }

  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (!trimmed || trimmed === '{}') {
      return GENERIC_AUTH_ERROR
    }
    return trimmed
  }

  return formatSupabaseAuthError(error)
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause as NodeJS.ErrnoException | undefined
    if (cause?.code === 'ENOTFOUND') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
      return `Could not reach Supabase at ${url}. That hostname does not exist — copy the correct Project URL from Supabase Dashboard → Project Settings → API into apps/next/.env.local.`
    }
    return formatSupabaseAuthError(error)
  }

  return formatSupabaseAuthError(error)
}
