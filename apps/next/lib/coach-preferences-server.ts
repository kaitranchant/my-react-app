import {
  parseCoachPreferences,
  withPortalWeightUnit,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import {
  parseOnboardingMilestoneTemplate,
  type ClientOnboardingMilestoneTemplate,
} from '@/lib/client-onboarding'
import { createClient } from '@/lib/supabase/server'
import type { WeightUnit } from 'app/types/database'

export async function getCoachPreferencesForUser(
  userId: string
): Promise<CoachPreferences> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency, default_workout_log_view'
    )
    .eq('id', userId)
    .maybeSingle()

  return parseCoachPreferences(data)
}

export async function getCoachOnboardingMilestoneTemplate(
  userId: string
): Promise<ClientOnboardingMilestoneTemplate> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_milestone_template')
    .eq('id', userId)
    .maybeSingle()

  return parseOnboardingMilestoneTemplate(data?.onboarding_milestone_template)
}

export async function getCoachPreferencesForCoachId(
  coachId: string
): Promise<CoachPreferences> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'weight_unit, week_starts_on, coach_timezone, default_check_in_frequency, default_workout_log_view'
    )
    .eq('id', coachId)
    .maybeSingle()

  return parseCoachPreferences(data)
}

export async function getPortalWeightUnit(userId: string): Promise<WeightUnit> {
  const preferences = await getCoachPreferencesForUser(userId)
  return preferences.weightUnit
}

export async function getPortalDisplayPreferences(
  userId: string,
  coachId: string
): Promise<CoachPreferences> {
  const [weightUnit, coachPreferences] = await Promise.all([
    getPortalWeightUnit(userId),
    getCoachPreferencesForCoachId(coachId),
  ])

  return withPortalWeightUnit(coachPreferences, weightUnit)
}
