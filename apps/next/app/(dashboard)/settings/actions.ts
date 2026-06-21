'use server'

import { revalidatePath } from 'next/cache'

import { coachPreferencesToRow } from '@/lib/coach-preferences'
import {
  notificationPreferencesToRow,
  parseNotificationPreferences,
} from '@/lib/notification-preferences'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  changePasswordSchema,
  deleteAccountSchema,
  type ChangePasswordValues,
  type DeleteAccountFormValues,
} from '@/lib/validations/account'
import {
  coachingPreferencesSchema,
  type CoachingPreferencesValues,
} from '@/lib/validations/coaching-preferences'
import type { NotificationPreferenceKey } from '@/lib/validations/notification-preferences'
import { profileFormSchema, type ProfileFormValues } from '@/lib/validations/profile'

export type ActionResult = { success: true } | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

export async function updateProfile(
  values: ProfileFormValues
): Promise<ActionResult> {
  const parsed = profileFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      business_name: parsed.data.businessName?.trim()
        ? parsed.data.businessName.trim()
        : null,
    })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateCoachingPreferences(
  values: CoachingPreferencesValues
): Promise<ActionResult> {
  const parsed = coachingPreferencesSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('profiles')
    .update(coachPreferencesToRow(parsed.data))
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/clients')
  revalidatePath('/load')
  revalidatePath('/check-ins')
  return { success: true }
}

export async function updateNotificationPreference(
  key: NotificationPreferenceKey,
  enabled: boolean
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select(
      'notify_check_ins, notify_form_reviews, notify_workout_completions, notify_missed_sessions, notify_invite_accepted, notify_weekly_summary'
    )
    .eq('id', user.id)
    .single()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const current = parseNotificationPreferences(profile)
  const { error } = await supabase
    .from('profiles')
    .update(notificationPreferencesToRow({ ...current, [key]: enabled }))
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function changePassword(
  values: ChangePasswordValues
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const email = user.email
  if (!email) {
    return { success: false, error: 'Your account does not have an email address.' }
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  })

  if (verifyError) {
    return { success: false, error: 'Current password is incorrect.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteAccount(
  values: DeleteAccountFormValues
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const email = user.email
  if (!email) {
    return { success: false, error: 'Your account does not have an email address.' }
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (verifyError) {
    return { success: false, error: 'Password is incorrect.' }
  }

  const { data: ownedGyms, error: gymsError } = await supabase
    .from('gyms')
    .select('id')
    .eq('created_by', user.id)

  if (gymsError) {
    return { success: false, error: gymsError.message }
  }

  if (ownedGyms && ownedGyms.length > 0) {
    const { error: deleteGymsError } = await supabase
      .from('gyms')
      .delete()
      .eq('created_by', user.id)

    if (deleteGymsError) {
      return {
        success: false,
        error:
          'Could not delete gyms you own. Remove them from the Gym page first, then try again.',
      }
    }
  }

  const admin = createAdminClient()
  if (!admin) {
    return {
      success: false,
      error:
        'Account deletion is not configured on this server. Contact support if you need help removing your account.',
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true }
}
