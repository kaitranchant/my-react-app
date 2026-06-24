import { redirect } from 'next/navigation'

import { getOrCreateCoachSelfClient } from '@/lib/coach-self'
import { createClient } from '@/lib/supabase/server'

export default async function MyWorkoutsPage() {
  const supabase = await createClient()
  const selfClientResult = await getOrCreateCoachSelfClient(supabase)

  if (!selfClientResult.success) {
    redirect('/clients')
  }

  redirect(`/clients/${selfClientResult.data.client.id}?tab=training`)
}
