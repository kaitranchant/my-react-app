'use server'

import { revalidatePath } from 'next/cache'

import { ensureCoachCatalogSeeded } from '@/lib/coach-exercise-library.server'
import { createClient } from '@/lib/supabase/server'

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

export async function ensureCoachLibrarySeeded() {
  const { supabase, user } = await requireUser()
  await ensureCoachCatalogSeeded(supabase, user.id)
  revalidatePath('/library/exercises')
  revalidatePath('/library')
}
