import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Database } from 'app/types/database'

export type MobileAuthResult =
  | { ok: true; user: User; supabase: ReturnType<typeof createClient<Database>> }
  | { ok: false; status: number; error: string }

export async function authenticateMobileRequest(
  request: Request
): Promise<MobileAuthResult> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing authorization token.' }
  }

  const accessToken = authHeader.slice('Bearer '.length).trim()
  if (!accessToken) {
    return { ok: false, status: 401, error: 'Missing authorization token.' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: 'Server is not configured.' }
  }

  const supabase = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, status: 401, error: 'Invalid or expired session.' }
  }

  return { ok: true, user, supabase }
}

export async function requirePortalClientForMobileUser(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string
): Promise<
  | {
      ok: true
      client: {
        id: string
        coach_id: string
        full_name: string | null
      }
    }
  | { ok: false; status: number; error: string }
> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'client') {
    return {
      ok: false,
      status: 403,
      error: 'Only client accounts can sync Apple Health.',
    }
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, coach_id, full_name')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !client) {
    return {
      ok: false,
      status: 403,
      error: 'Your account is not linked to a client profile yet.',
    }
  }

  return { ok: true, client }
}
