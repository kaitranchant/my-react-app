import type { SupabaseClient } from '@supabase/supabase-js'

import { toDateKey } from '@/lib/calendar'
import {
  dematerializeProgramFromClientCalendar,
  materializeProgramToClientCalendar,
} from '@/app/(dashboard)/library/programs/[programId]/calendar/actions'

export type AssignProgramInternalResult =
  | { success: true; scheduledCount: number; skippedCount: number }
  | { success: false; error: string }

export async function assignProgramToClientInternal(
  supabase: SupabaseClient,
  params: {
    coachId: string
    clientId: string
    programId: string
    startDate?: string
    teamId?: string
  }
): Promise<AssignProgramInternalResult> {
  const { coachId, clientId, programId, teamId } = params

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id, status')
    .eq('id', programId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (programError || !program) {
    return { success: false, error: 'Program not found.' }
  }

  if (program.status === 'archived') {
    return { success: false, error: 'Archived programs cannot be assigned.' }
  }

  const { data: previousAssignment } = await supabase
    .from('program_assignments')
    .select('program_id, start_date')
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .eq('status', 'active')
    .maybeSingle()

  if (previousAssignment?.start_date) {
    try {
      await dematerializeProgramFromClientCalendar(
        supabase,
        clientId,
        previousAssignment.program_id,
        previousAssignment.start_date
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not remove previous program workouts.'
      return { success: false, error: message }
    }
  }

  const { error: cancelError } = await supabase
    .from('program_assignments')
    .update({ status: 'cancelled' })
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .eq('status', 'active')

  if (cancelError) {
    return { success: false, error: cancelError.message }
  }

  const startDate = params.startDate?.trim()
    ? params.startDate.trim()
    : toDateKey(new Date())

  const { error: assignError } = await supabase.from('program_assignments').insert({
    coach_id: coachId,
    client_id: clientId,
    program_id: programId,
    team_id: teamId ?? null,
    status: 'active',
    start_date: startDate,
  })

  if (assignError) {
    return { success: false, error: assignError.message }
  }

  try {
    const materialized = await materializeProgramToClientCalendar(
      supabase,
      coachId,
      clientId,
      programId,
      startDate
    )
    return {
      success: true,
      scheduledCount: materialized.scheduledCount,
      skippedCount: materialized.skippedCount,
    }
  } catch (error) {
    await supabase
      .from('program_assignments')
      .update({ status: 'cancelled' })
      .eq('client_id', clientId)
      .eq('coach_id', coachId)
      .eq('status', 'active')

    const message =
      error instanceof Error ? error.message : 'Could not schedule program workouts.'
    return { success: false, error: message }
  }
}
