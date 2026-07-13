import type { SupabaseClient } from '@supabase/supabase-js'

import type { ProactiveAlertDismissal } from '@/lib/proactive-alerts'
import type { Database } from 'app/types/database'

export async function fetchProactiveAlertDismissals(
  supabase: SupabaseClient<Database>,
  coachId: string
): Promise<ProactiveAlertDismissal[]> {
  const { data, error } = await supabase
    .from('coach_proactive_alert_dismissals')
    .select('alert_id, signature')
    .eq('coach_id', coachId)

  if (error) {
    console.error('Failed to load proactive alert dismissals', error)
    return []
  }

  return (data ?? []).map((row) => ({
    alertId: row.alert_id,
    signature: row.signature,
  }))
}
