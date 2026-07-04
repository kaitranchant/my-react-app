'use server'

import { revalidatePath } from 'next/cache'

import type { ActionResult } from '@/app/(dashboard)/attendance/actions'
import { requireClientAccess } from '@/lib/gym-access'
import {
  coachTaskFormSchema,
  coachTaskIdSchema,
  coachTaskStatusSchema,
  parseCoachTaskDueDate,
} from '@/lib/validations/coach-tasks'
import { createClient } from '@/lib/supabase/server'

function revalidateSchedulingTasks() {
  revalidatePath('/scheduling')
}

async function requireCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }
  return { supabase, user }
}

async function verifyCoachOwnsTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  taskId: string
) {
  const { data, error } = await supabase
    .from('coach_tasks')
    .select('id')
    .eq('id', taskId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (error || !data) {
    return false
  }
  return true
}

async function verifyClientForCoach(coachId: string, clientId: string | null) {
  if (!clientId) return true
  const ctx = await requireClientAccess(clientId)
  if (!ctx || ctx.user.id !== coachId) {
    return false
  }
  return true
}

export async function createCoachTask(
  values: import('@/lib/validations/coach-tasks').CoachTaskFormValues
): Promise<ActionResult> {
  const parsed = coachTaskFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Check the task details and try again.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const clientId = parsed.data.clientId?.trim() || null
  if (!(await verifyClientForCoach(ctx.user.id, clientId))) {
    return { success: false, error: 'Client not found.' }
  }

  const dueDate = parseCoachTaskDueDate(parsed.data.dueDate)
  if (parsed.data.dueDate?.trim() && !dueDate) {
    return { success: false, error: 'Enter a valid due date.' }
  }

  const { error } = await ctx.supabase.from('coach_tasks').insert({
    coach_id: ctx.user.id,
    client_id: clientId,
    title: parsed.data.title.trim(),
    details: parsed.data.details?.trim() || null,
    due_date: dueDate,
    priority: parsed.data.priority,
    status: 'pending',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateSchedulingTasks()
  return { success: true }
}

export async function updateCoachTask(
  taskId: string,
  values: import('@/lib/validations/coach-tasks').CoachTaskFormValues
): Promise<ActionResult> {
  const idParsed = coachTaskIdSchema.safeParse({ taskId })
  const parsed = coachTaskFormSchema.safeParse(values)
  if (!idParsed.success || !parsed.success) {
    return { success: false, error: 'Check the task details and try again.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  if (!(await verifyCoachOwnsTask(ctx.supabase, ctx.user.id, taskId))) {
    return { success: false, error: 'Task not found.' }
  }

  const clientId = parsed.data.clientId?.trim() || null
  if (!(await verifyClientForCoach(ctx.user.id, clientId))) {
    return { success: false, error: 'Client not found.' }
  }

  const dueDate = parseCoachTaskDueDate(parsed.data.dueDate)
  if (parsed.data.dueDate?.trim() && !dueDate) {
    return { success: false, error: 'Enter a valid due date.' }
  }

  const { error } = await ctx.supabase
    .from('coach_tasks')
    .update({
      client_id: clientId,
      title: parsed.data.title.trim(),
      details: parsed.data.details?.trim() || null,
      due_date: dueDate,
      priority: parsed.data.priority,
    })
    .eq('id', taskId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateSchedulingTasks()
  return { success: true }
}

export async function updateCoachTaskStatus(
  taskId: string,
  status: import('@/lib/validations/coach-tasks').CoachTaskStatus
): Promise<ActionResult> {
  const parsed = coachTaskStatusSchema.safeParse({ taskId, status })
  if (!parsed.success) {
    return { success: false, error: 'Invalid task update.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  if (!(await verifyCoachOwnsTask(ctx.supabase, ctx.user.id, taskId))) {
    return { success: false, error: 'Task not found.' }
  }

  const { error } = await ctx.supabase
    .from('coach_tasks')
    .update({
      status: parsed.data.status,
      completed_at:
        parsed.data.status === 'completed'
          ? new Date().toISOString()
          : null,
    })
    .eq('id', taskId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateSchedulingTasks()
  return { success: true }
}

export async function deleteCoachTask(taskId: string): Promise<ActionResult> {
  const parsed = coachTaskIdSchema.safeParse({ taskId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid task.' }
  }

  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase
    .from('coach_tasks')
    .delete()
    .eq('id', taskId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateSchedulingTasks()
  return { success: true }
}
