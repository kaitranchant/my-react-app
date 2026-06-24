import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Book a session — Coaching App',
}

export default async function BookPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/portal/sessions')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'client') {
    redirect('/portal/sessions')
  }

  redirect('/scheduling?view=availability')
}
