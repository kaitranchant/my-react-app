'use server'

import { revalidatePath } from 'next/cache'

import { toDateKey } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/server'
import {
  assignProgramSchema,
  programFormSchema,
  programStatuses,
  type AssignProgramValues,
  type ProgramFormValues,
} from '@/lib/validations/program'
import { materializeProgramToClientCalendar, dematerializeProgramFromClientCalendar } from '@/app/(dashboard)/library/programs/[programId]/calendar/actions'
import type { ProgramStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type AssignProgramResult =
  | { success: true; scheduledCount: number; skippedCount: number }
  | { success: false; error: string }

export type CreateProgramResult =
  | { success: true; programId: string }
  | { success: false; error: string }

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

function toProgramRow(values: ProgramFormValues) {
  return {
    name: values.name,
    description: values.description ? values.description : null,
    status: values.status,
  }
}

function revalidatePrograms(clientId?: string) {
  revalidatePath('/library/programs')
  revalidatePath('/library')
  revalidatePath('/dashboard')
  if (clientId) {
    revalidatePath(`/clients/${clientId}`)
  }
}

export async function createProgramRecord(
  values: ProgramFormValues
): Promise<CreateProgramResult> {
  const parsed = programFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('programs')
    .insert({ ...toProgramRow(parsed.data), coach_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create program.' }
  }

  revalidatePrograms()
  return { success: true, programId: data.id }
}

export async function updateProgramRecord(
  id: string,
  values: ProgramFormValues
): Promise<ActionResult> {
  const parsed = programFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('programs')
    .update(toProgramRow(parsed.data))
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePrograms()
  return { success: true }
}

export async function setProgramStatus(
  id: string,
  status: ProgramStatus
): Promise<ActionResult> {
  if (!programStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('programs')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePrograms()
  return { success: true }
}

export async function deleteProgramRecord(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('programs').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePrograms()
  return { success: true }
}

export type UnassignProgramResult =
  | { success: true; removedCount: number }
  | { success: false; error: string }

export async function assignProgramToClient(
  clientId: string,
  values: AssignProgramValues
): Promise<AssignProgramResult> {
  const parsed = assignProgramSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please select a program.' }
  }

  const { supabase, user } = await requireUser()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id, status')
    .eq('id', parsed.data.programId)
    .eq('coach_id', user.id)
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
    .eq('coach_id', user.id)
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
    .eq('coach_id', user.id)
    .eq('status', 'active')

  if (cancelError) {
    return { success: false, error: cancelError.message }
  }

  const startDate = parsed.data.startDate?.trim()
    ? parsed.data.startDate.trim()
    : toDateKey(new Date())

  const { error: assignError } = await supabase
    .from('program_assignments')
    .insert({
      coach_id: user.id,
      client_id: clientId,
      program_id: parsed.data.programId,
      status: 'active',
      start_date: startDate,
    })

  if (assignError) {
    return { success: false, error: assignError.message }
  }

  let scheduledCount = 0
  let skippedCount = 0

  try {
    const materialized = await materializeProgramToClientCalendar(
      supabase,
      user.id,
      clientId,
      parsed.data.programId,
      startDate
    )
    scheduledCount = materialized.scheduledCount
    skippedCount = materialized.skippedCount
  } catch (error) {
    await supabase
      .from('program_assignments')
      .update({ status: 'cancelled' })
      .eq('client_id', clientId)
      .eq('coach_id', user.id)
      .eq('status', 'active')

    const message =
      error instanceof Error ? error.message : 'Could not schedule program workouts.'
    return { success: false, error: message }
  }

  revalidatePrograms(clientId)
  revalidatePath('/portal')
  return { success: true, scheduledCount, skippedCount }
}

export async function unassignProgramFromClient(
  clientId: string
): Promise<UnassignProgramResult> {
  const { supabase, user } = await requireUser()

  const { data: assignment, error: assignmentError } = await supabase
    .from('program_assignments')
    .select('program_id, start_date')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (assignmentError) {
    return { success: false, error: assignmentError.message }
  }

  let removedCount = 0

  if (assignment?.start_date) {
    try {
      const dematerialized = await dematerializeProgramFromClientCalendar(
        supabase,
        clientId,
        assignment.program_id,
        assignment.start_date
      )
      removedCount = dematerialized.removedCount
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not remove program workouts from calendar.'
      return { success: false, error: message }
    }
  }

  const { error } = await supabase
    .from('program_assignments')
    .update({ status: 'cancelled' })
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .eq('status', 'active')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePrograms(clientId)
  revalidatePath('/portal')
  return { success: true, removedCount }
}
