import { WorkoutLogPage } from '@/components/calendar/workout-log-page'
import { getCoachWorkoutLogPageProps } from '@/lib/workout-log-page-data'

export const metadata = {
  title: 'Log Workout — Coaching App',
}

export default async function ClientWorkoutLogRoute({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; workoutId: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { clientId, workoutId } = await params
  const { date } = await searchParams
  const props = await getCoachWorkoutLogPageProps({ clientId, workoutId, date })

  return <WorkoutLogPage {...props} />
}
