import { createAdminClient } from '@/lib/supabase/admin'
import type { createClient } from '@/lib/supabase/server'

async function fetchCoachNameFromProfile(coachId: string): Promise<string | null> {
  const admin = createAdminClient()
  if (!admin) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', coachId)
    .maybeSingle()

  const profileName =
    profile?.full_name?.trim() || profile?.business_name?.trim() || null
  if (profileName) return profileName

  const { data: coachSelf } = await admin
    .from('clients')
    .select('full_name')
    .eq('coach_id', coachId)
    .eq('is_coach_self', true)
    .maybeSingle()

  return coachSelf?.full_name?.trim() || null
}

export async function fetchCoachDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_portal_coach_display_name')

  if (!error && typeof data === 'string' && data.trim() && data.trim() !== 'Coach') {
    return data.trim()
  }

  if (coachId) {
    const profileName = await fetchCoachNameFromProfile(coachId)
    if (profileName) {
      return profileName
    }
  }

  if (!error && typeof data === 'string' && data.trim()) {
    return data.trim()
  }

  return 'Coach'
}
