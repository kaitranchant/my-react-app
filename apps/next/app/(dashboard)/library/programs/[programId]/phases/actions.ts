'use server'

import { revalidatePath } from 'next/cache'

import {
  dayNumberToOffset,
  phaseRangesOverlap,
} from '@/lib/program-calendar'
import { createClient } from '@/lib/supabase/server'
import {
  programPhaseFormSchema,
  type ProgramPhaseFormValues,
} from '@/lib/validations/program'
import type { ProgramPhase } from 'app/types/database'

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export type CreateProgramPhaseResult =
  | { success: true; phaseId: string }
  | { success: false; error: string }

const PROGRAM_PHASES_SQL_FILE = 'apply-program-phases.sql'

function isMissingProgramPhasesTable(message: string) {
  return (
    message.includes('Could not find the table') &&
    message.includes('program_phases')
  )
}

function mapProgramPhasesDbError(message: string): string {
  if (isMissingProgramPhasesTable(message)) {
    return `Database setup required: run supabase/${PROGRAM_PHASES_SQL_FILE} in the Supabase SQL editor, then refresh this page.`
  }
  return message
}

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

async function requireProgram(programId: string) {
  const { supabase, user } = await requireUser()
  const { data: program, error } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !program) {
    return null
  }

  return { supabase, user, program }
}

function revalidateProgram(programId: string) {
  revalidatePath(`/library/programs/${programId}`)
  revalidatePath('/library/programs')
  revalidatePath('/teams')
}

async function fetchProgramPhasesForProgram(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string
): Promise<ProgramPhase[]> {
  const { data, error } = await supabase
    .from('program_phases')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })
    .order('start_day_offset', { ascending: true })

  if (error) {
    throw new Error(mapProgramPhasesDbError(error.message))
  }

  return (data ?? []) as ProgramPhase[]
}

function formValuesToOffsets(values: ProgramPhaseFormValues) {
  return {
    startOffset: dayNumberToOffset(values.startDay),
    endOffset: dayNumberToOffset(values.endDay),
  }
}

export async function getProgramPhases(
  programId: string
): Promise<
  | { success: true; phases: ProgramPhase[] }
  | { success: false; error: string; schemaError?: boolean }
> {
  try {
    const ctx = await requireProgram(programId)
    if (!ctx) {
      return { success: false, error: 'Program not found.' }
    }

    const phases = await fetchProgramPhasesForProgram(ctx.supabase, programId)
    return { success: true, phases }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load program phases.'
    return {
      success: false,
      error: message,
      schemaError: isMissingProgramPhasesTable(message),
    }
  }
}

export async function createProgramPhase(
  programId: string,
  values: ProgramPhaseFormValues
): Promise<CreateProgramPhaseResult> {
  const parsed = programPhaseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { startOffset, endOffset } = formValuesToOffsets(parsed.data)

  let existing: ProgramPhase[]
  try {
    existing = await fetchProgramPhasesForProgram(ctx.supabase, programId)
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate phase range.',
    }
  }

  if (phaseRangesOverlap(startOffset, endOffset, existing)) {
    return {
      success: false,
      error: 'This day range overlaps an existing phase.',
    }
  }

  const sortOrder =
    existing.length > 0
      ? Math.max(...existing.map((phase) => phase.sort_order)) + 1
      : 0

  const { data, error } = await ctx.supabase
    .from('program_phases')
    .insert({
      coach_id: ctx.user.id,
      program_id: programId,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      start_day_offset: startOffset,
      end_day_offset: endOffset,
      sort_order: sortOrder,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: mapProgramPhasesDbError(error.message) }
  }

  revalidateProgram(programId)
  return { success: true, phaseId: data.id }
}

export async function updateProgramPhase(
  programId: string,
  phaseId: string,
  values: ProgramPhaseFormValues
): Promise<ActionResult> {
  const parsed = programPhaseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { startOffset, endOffset } = formValuesToOffsets(parsed.data)

  let existing: ProgramPhase[]
  try {
    existing = await fetchProgramPhasesForProgram(ctx.supabase, programId)
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate phase range.',
    }
  }

  if (phaseRangesOverlap(startOffset, endOffset, existing, phaseId)) {
    return {
      success: false,
      error: 'This day range overlaps an existing phase.',
    }
  }

  const { error } = await ctx.supabase
    .from('program_phases')
    .update({
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      start_day_offset: startOffset,
      end_day_offset: endOffset,
    })
    .eq('id', phaseId)
    .eq('program_id', programId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: mapProgramPhasesDbError(error.message) }
  }

  revalidateProgram(programId)
  return { success: true }
}

export async function deleteProgramPhase(
  programId: string,
  phaseId: string
): Promise<ActionResult> {
  const ctx = await requireProgram(programId)
  if (!ctx) {
    return { success: false, error: 'Program not found.' }
  }

  const { error } = await ctx.supabase
    .from('program_phases')
    .delete()
    .eq('id', phaseId)
    .eq('program_id', programId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: mapProgramPhasesDbError(error.message) }
  }

  revalidateProgram(programId)
  return { success: true }
}
