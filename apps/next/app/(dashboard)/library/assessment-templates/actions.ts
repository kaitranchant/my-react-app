'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  assessmentTemplateFormSchema,
  type AssessmentTemplateFormValues,
} from '@/lib/validations/assessment-template'
import type {
  AssessmentItem,
  AssessmentTemplateWithItems,
} from 'app/types/database'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')
  return { supabase, user }
}

function revalidateAssessmentTemplates() {
  revalidatePath('/library/assessment-templates')
  revalidatePath('/library')
  revalidatePath('/clients', 'layout')
}

export async function fetchAssessmentTemplates(): Promise<
  AssessmentTemplateWithItems[]
> {
  const { supabase, user } = await requireUser()
  const { data: templates, error } = await supabase
    .from('assessment_templates')
    .select('*')
    .eq('coach_id', user.id)
    .order('name', { ascending: true })

  if (error || !templates?.length) return []

  const templateIds = templates.map((template) => template.id)
  const { data: rows } = await supabase
    .from('assessment_template_items')
    .select('*')
    .in('template_id', templateIds)
    .order('sort_order', { ascending: true })

  const itemIds = Array.from(
    new Set((rows ?? []).map((row) => row.assessment_item_id))
  )
  const { data: items } =
    itemIds.length > 0
      ? await supabase.from('assessment_items').select('*').in('id', itemIds)
      : { data: [] as AssessmentItem[] }
  const itemById = new Map((items ?? []).map((item) => [item.id, item]))

  return templates.map((template) => ({
    ...template,
    items: (rows ?? [])
      .filter((row) => row.template_id === template.id)
      .map((row) => ({
        ...row,
        assessment_item: itemById.get(row.assessment_item_id) ?? null,
      })),
  }))
}

async function validateVisibleItems(
  assessmentItemIds: string[]
): Promise<
  | { success: true; items: AssessmentItem[] }
  | { success: false; error: string }
> {
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('assessment_items')
    .select('*')
    .in('id', assessmentItemIds)
    .eq('is_active', true)
    .or(`coach_id.is.null,coach_id.eq.${user.id}`)

  if (error || data?.length !== assessmentItemIds.length) {
    return {
      success: false,
      error: 'One or more selected tests are no longer available.',
    }
  }
  return { success: true, items: data }
}

export async function createAssessmentTemplate(
  values: AssessmentTemplateFormValues
): Promise<ActionResult<AssessmentTemplateWithItems>> {
  const parsed = assessmentTemplateFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid template.',
    }
  }

  const visible = await validateVisibleItems(parsed.data.assessmentItemIds)
  if (!visible.success) return visible

  const { supabase, user } = await requireUser()
  const { data: template, error } = await supabase
    .from('assessment_templates')
    .insert({
      coach_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .select('*')
    .single()

  if (error || !template) {
    return {
      success: false,
      error: error?.message ?? 'Could not create assessment template.',
    }
  }

  const { data: templateItems, error: itemError } = await supabase
    .from('assessment_template_items')
    .insert(
      parsed.data.assessmentItemIds.map((assessmentItemId, sortOrder) => ({
        template_id: template.id,
        assessment_item_id: assessmentItemId,
        sort_order: sortOrder,
      }))
    )
    .select('*')

  if (itemError || !templateItems) {
    await supabase.from('assessment_templates').delete().eq('id', template.id)
    return {
      success: false,
      error: itemError?.message ?? 'Could not add tests to the template.',
    }
  }

  const itemById = new Map(visible.items.map((item) => [item.id, item]))
  revalidateAssessmentTemplates()
  return {
    success: true,
    data: {
      ...template,
      items: templateItems.map((row) => ({
        ...row,
        assessment_item: itemById.get(row.assessment_item_id) ?? null,
      })),
    },
  }
}

export async function updateAssessmentTemplate(
  templateId: string,
  values: AssessmentTemplateFormValues
): Promise<ActionResult<AssessmentTemplateWithItems>> {
  const parsed = assessmentTemplateFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid template.',
    }
  }

  const visible = await validateVisibleItems(parsed.data.assessmentItemIds)
  if (!visible.success) return visible

  const { supabase, user } = await requireUser()
  const { data: existing } = await supabase
    .from('assessment_templates')
    .select('*')
    .eq('id', templateId)
    .eq('coach_id', user.id)
    .maybeSingle()
  if (!existing) return { success: false, error: 'Template not found.' }

  const { data: template, error } = await supabase
    .from('assessment_templates')
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .eq('id', templateId)
    .eq('coach_id', user.id)
    .select('*')
    .single()
  if (error || !template) {
    return {
      success: false,
      error: error?.message ?? 'Could not update assessment template.',
    }
  }

  const previousItemIds = await supabase
    .from('assessment_template_items')
    .select('assessment_item_id, sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  const { error: deleteError } = await supabase
    .from('assessment_template_items')
    .delete()
    .eq('template_id', templateId)
  if (deleteError) return { success: false, error: deleteError.message }

  const { data: templateItems, error: itemError } = await supabase
    .from('assessment_template_items')
    .insert(
      parsed.data.assessmentItemIds.map((assessmentItemId, sortOrder) => ({
        template_id: templateId,
        assessment_item_id: assessmentItemId,
        sort_order: sortOrder,
      }))
    )
    .select('*')

  if (itemError || !templateItems) {
    if (previousItemIds.data?.length) {
      await supabase.from('assessment_template_items').insert(
        previousItemIds.data.map((row) => ({
          template_id: templateId,
          assessment_item_id: row.assessment_item_id,
          sort_order: row.sort_order,
        }))
      )
    }
    return {
      success: false,
      error: itemError?.message ?? 'Could not update template tests.',
    }
  }

  const itemById = new Map(visible.items.map((item) => [item.id, item]))
  revalidateAssessmentTemplates()
  return {
    success: true,
    data: {
      ...template,
      items: templateItems.map((row) => ({
        ...row,
        assessment_item: itemById.get(row.assessment_item_id) ?? null,
      })),
    },
  }
}

export async function deleteAssessmentTemplate(
  templateId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('assessment_templates')
    .delete()
    .eq('id', templateId)
    .eq('coach_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidateAssessmentTemplates()
  return { success: true, data: undefined }
}
