import {
  defaultDashboardPreferences,
  parseDashboardPreferences,
} from '@/lib/dashboard-preferences'
import { createClient } from '@/lib/supabase/server'

export async function getDashboardPreferencesForUser(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('dashboard_section_visibility')
    .eq('id', userId)
    .maybeSingle()

  if (!data) {
    return { ...defaultDashboardPreferences }
  }

  return parseDashboardPreferences(data.dashboard_section_visibility)
}
