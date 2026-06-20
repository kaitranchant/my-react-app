import { parseCoachPreferences, type CoachPreferences } from '@/lib/coach-preferences'
import { createClient } from '@/lib/supabase/server'

export async function getCoachPreferencesForUser(
  userId: string
): Promise<CoachPreferences> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
    )
    .eq('id', userId)
    .maybeSingle()

  return parseCoachPreferences(data)
}

export async function getCoachPreferencesForCoachId(
  coachId: string
): Promise<CoachPreferences> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
    )
    .eq('id', coachId)
    .maybeSingle()

  return parseCoachPreferences(data)
}
