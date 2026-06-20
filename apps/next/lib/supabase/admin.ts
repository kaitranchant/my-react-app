import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from 'app/types/database'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function findAuthUserByEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
) {
  const normalized = email.trim().toLowerCase()
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized
    )
    if (match) return match

    if (data.users.length < 200) return null
    page += 1
  }
}
