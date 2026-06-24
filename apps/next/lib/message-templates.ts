import type { SupabaseClient } from '@supabase/supabase-js'

import type { CoachMessageTemplate } from 'app/types/database'

export function applyMessageTemplateVariables(
  body: string,
  variables: { clientName: string }
) {
  return body.replace(/\{\{clientName\}\}/g, variables.clientName)
}

export async function fetchCoachMessageTemplates(
  supabase: SupabaseClient,
  coachId: string
): Promise<{ templates: CoachMessageTemplate[]; error: string | null }> {
  const { data, error } = await supabase
    .from('coach_message_templates')
    .select('*')
    .eq('coach_id', coachId)
    .order('name', { ascending: true })

  return {
    templates: (data ?? []) as CoachMessageTemplate[],
    error: error?.message ?? null,
  }
}
