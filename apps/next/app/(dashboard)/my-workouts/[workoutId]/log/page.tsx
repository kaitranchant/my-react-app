import { redirect } from 'next/navigation'

import { getOrCreateCoachSelfClient } from '@/lib/coach-self'
import { createClient } from '@/lib/supabase/server'

export default async function MyWorkoutLogRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workoutId: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { workoutId } = await params
  const { date } = await searchParams
  const supabase = await createClient()
  const selfClientResult = await getOrCreateCoachSelfClient(supabase)

  if (!selfClientResult.success) {
    redirect('/clients')
  }

  const dateQuery = date ? `?date=${encodeURIComponent(date)}` : ''
  redirect(
    `/clients/${selfClientResult.data.client.id}/workouts/${workoutId}/log${dateQuery}`
  )
}
