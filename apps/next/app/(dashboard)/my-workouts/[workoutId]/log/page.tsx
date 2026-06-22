import { notFound, redirect } from 'next/navigation'

import { WorkoutLogPage } from '@/components/calendar/workout-log-page'
import { getCoachWorkoutLogPageProps } from '@/lib/workout-log-page-data'
import { getOrCreateCoachSelfClient } from '@/lib/coach-self'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Log Workout — Coaching App',
}

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
    redirect('/my-workouts')
  }

  const { client } = selfClientResult.data
  const props = await getCoachWorkoutLogPageProps({
    clientId: client.id,
    workoutId,
    date,
  })

  if (!props.returnHref.startsWith('/my-workouts')) {
    notFound()
  }

  return <WorkoutLogPage {...props} />
}
