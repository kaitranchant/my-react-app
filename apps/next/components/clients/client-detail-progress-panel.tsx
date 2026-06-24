import { fetchClientFormReviews } from '@/app/(dashboard)/form-review/actions'
import { createClient } from '@/lib/supabase/server'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchGoalProgressContext } from '@/lib/goal-progress-context'
import { attachSignedUrlsToPhotos, countPhotosByCheckInId } from '@/lib/progress-photos'
import { ClientDetailProgressSection } from '@/components/clients/client-detail-progress-section'
import type {
  Client,
  ClientCheckIn,
  ClientGoal,
  ClientInbodyScan,
  ClientProgramAssignment,
  Exercise,
  Program,
} from 'app/types/database'

type ClientDetailProgressPanelProps = {
  client: Client
  clientId: string
  coachUserId: string | null
}

export async function ClientDetailProgressPanel({
  client,
  clientId,
  coachUserId,
}: ClientDetailProgressPanelProps) {
  const supabase = await createClient()
  const coachPreferences = coachUserId
    ? await getCoachPreferencesForUser(coachUserId)
    : defaultCoachPreferences

  const [
    { data: assignmentData },
    { data: programsData },
    checkInsResult,
    progressPhotosResult,
    inbodyScansResult,
    clientGoalsResult,
    exercisesResult,
  ] = await Promise.all([
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status), team:teams(id, name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('programs')
      .select('id, name, status')
      .order('name', { ascending: true }),
    supabase
      .from('client_check_ins')
      .select('*')
      .eq('client_id', clientId)
      .order('check_in_date', { ascending: false })
      .limit(50),
    supabase
      .from('client_progress_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('client_inbody_scans')
      .select('*')
      .eq('client_id', clientId)
      .order('scan_date', { ascending: false })
      .limit(50),
    supabase
      .from('client_goals')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('exercises')
      .select('id, name, muscle_group, external_id')
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  const activeAssignment = assignmentData
    ? (assignmentData as ClientProgramAssignment)
    : null
  const availablePrograms = (programsData ?? []) as Pick<
    Program,
    'id' | 'name' | 'status'
  >[]
  const checkIns = (checkInsResult.data ?? []) as ClientCheckIn[]
  const progressPhotos = await attachSignedUrlsToPhotos(
    supabase,
    progressPhotosResult.data ?? []
  )
  const formReviews = await fetchClientFormReviews(clientId)
  const inbodyScans = (inbodyScansResult.data ?? []) as ClientInbodyScan[]
  const clientGoals = (clientGoalsResult.data ?? []) as ClientGoal[]
  const goalsSchemaError = clientGoalsResult.error?.message ?? null
  const calendarExercises = (exercisesResult.data ?? []) as Pick<
    Exercise,
    'id' | 'name' | 'muscle_group' | 'external_id'
  >[]
  const goalExercises = calendarExercises.map(({ id, name }) => ({ id, name }))

  const photosByCheckInId = progressPhotos.reduce<
    Record<string, typeof progressPhotos>
  >((accumulator, photo) => {
    if (!photo.check_in_id) return accumulator
    const existing = accumulator[photo.check_in_id] ?? []
    existing.push(photo)
    accumulator[photo.check_in_id] = existing
    return accumulator
  }, {})
  const photoCounts = countPhotosByCheckInId(progressPhotos)

  const goalProgressContext = await fetchGoalProgressContext(supabase, clientId)

  return (
    <ClientDetailProgressSection
      client={client}
      activeAssignment={activeAssignment}
      availablePrograms={availablePrograms}
      checkIns={checkIns}
      progressPhotos={progressPhotos}
      formReviews={formReviews}
      inbodyScans={inbodyScans}
      clientGoals={clientGoals}
      goalsSchemaError={goalsSchemaError}
      goalProgressContext={goalProgressContext}
      goalExercises={goalExercises}
      calendarExercises={calendarExercises}
      photoCounts={photoCounts}
      photosByCheckInId={photosByCheckInId}
      coachPreferences={coachPreferences}
    />
  )
}
