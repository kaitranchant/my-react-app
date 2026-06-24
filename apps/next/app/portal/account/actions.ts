'use server'

import { revalidatePath } from 'next/cache'

import {
  parsePortalNotificationPreferences,
  portalNotificationPreferencesToRow,
} from '@/lib/portal-notification-preferences'
import { requirePortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import { weightUnits } from '@/lib/validations/coaching-preferences'
import type { PortalNotificationPreferenceKey } from '@/lib/validations/portal-notification-preferences'
import {
  portalProfileFormSchema,
  type PortalProfileFormValues,
} from '@/lib/validations/portal-profile'
import type { WeightUnit } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export async function updatePortalProfile(
  values: PortalProfileFormValues
): Promise<ActionResult> {
  const parsed = portalProfileFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const fullName = parsed.data.fullName.trim()

  const { error: clientError } = await ctx.supabase
    .from('clients')
    .update({ full_name: fullName })
    .eq('id', ctx.client.id)

  if (clientError) {
    return { success: false, error: clientError.message }
  }

  const { error: profileError } = await ctx.supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', ctx.userId)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  revalidatePath('/portal/account')
  revalidatePath('/portal', 'layout')
  return { success: true }
}

function revalidatePortalWeightUnitPaths() {
  revalidatePath('/portal/account')
  revalidatePath('/portal')
  revalidatePath('/portal/progress')
  revalidatePath('/portal/check-in')
  revalidatePath('/portal/workouts')
  revalidatePath('/portal/leaderboards')
  revalidatePath('/portal', 'layout')
}

export async function updatePortalWeightUnit(
  weightUnit: WeightUnit
): Promise<ActionResult> {
  const parsed = weightUnits.includes(weightUnit)
  if (!parsed) {
    return { success: false, error: 'Please choose a valid weight unit.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ weight_unit: weightUnit })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortalWeightUnitPaths()
  return { success: true }
}

const portalNotificationSelect =
  'portal_notify_messages, portal_notify_check_in_reviews, portal_notify_form_review_replies, portal_notify_team_updates'

export async function updatePortalNotificationPreference(
  key: PortalNotificationPreferenceKey,
  enabled: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select(portalNotificationSelect)
    .eq('id', user.id)
    .single()

  if (fetchError) {
    const message = fetchError.message.toLowerCase()
    if (message.includes('portal_notify')) {
      return {
        success: false,
        error:
          'Database schema is out of date. Run supabase db push (hosted) or supabase db reset (local).',
      }
    }
    return { success: false, error: fetchError.message }
  }

  const current = parsePortalNotificationPreferences(profile)
  const { error } = await supabase
    .from('profiles')
    .update(portalNotificationPreferencesToRow({ ...current, [key]: enabled }))
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/portal/account')
  return { success: true }
}
