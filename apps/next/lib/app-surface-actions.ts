'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  type AppSurface,
} from '@/lib/app-surface'
import {
  getAppSurfaceContext,
  setActiveSurfaceCookie,
} from '@/lib/app-surface-server'
import { ensureCoachPortalClient } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export async function switchAppSurface(
  surface: AppSurface
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'coach'
  const surfaceContext = await getAppSurfaceContext({
    supabase,
    userId: user.id,
    role,
  })

  if (surface === 'client') {
    if (!surfaceContext.canAccessClient) {
      return { error: 'Client portal is not available for this account.' }
    }

    if (role === 'coach') {
      const ensured = await ensureCoachPortalClient(supabase)
      if (!ensured.ok) {
        return { error: ensured.error }
      }
    }

    await setActiveSurfaceCookie('client')
    revalidatePath('/', 'layout')
    redirect('/portal')
  }

  if (!surfaceContext.canAccessCoach) {
    return { error: 'Coach dashboard is not available for this account.' }
  }

  await setActiveSurfaceCookie('coach')
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
