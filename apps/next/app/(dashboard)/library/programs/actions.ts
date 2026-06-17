'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  assignProgramSchema,
  programFormSchema,
  programStatuses,
  type AssignProgramValues,
  type ProgramFormValues,
} from '@/lib/validations/program'
import type { ProgramStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

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

export async function assignProgramToClient(
  clientId: string,
  values: AssignProgramValues
): Promise<ActionResult> {
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
    : null

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

  revalidatePrograms(clientId)
  revalidatePath('/portal')
  return { success: true }
}

export async function unassignProgramFromClient(
  clientId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

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
  return { success: true }
}
