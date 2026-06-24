'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  messageTemplateFormSchema,
  type MessageTemplateFormValues,
} from '@/lib/validations/message-template'

export type ActionResult = { success: true } | { success: false; error: string }

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

function revalidateMessageTemplates() {
  revalidatePath('/library/message-templates')
  revalidatePath('/library')
  revalidatePath('/messages')
  revalidatePath('/clients', 'layout')
}

export async function createMessageTemplateRecord(
  values: MessageTemplateFormValues
): Promise<ActionResult> {
  const parsed = messageTemplateFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('coach_message_templates').insert({
    coach_id: user.id,
    name: parsed.data.name,
    body: parsed.data.body,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMessageTemplates()
  return { success: true }
}

export async function updateMessageTemplateRecord(
  id: string,
  values: MessageTemplateFormValues
): Promise<ActionResult> {
  const parsed = messageTemplateFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('coach_message_templates')
    .update({
      name: parsed.data.name,
      body: parsed.data.body,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMessageTemplates()
  return { success: true }
}

export async function deleteMessageTemplateRecord(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('coach_message_templates')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMessageTemplates()
  return { success: true }
}
