'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
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
