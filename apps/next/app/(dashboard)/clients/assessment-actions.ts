'use server'

import { revalidatePath } from 'next/cache'

import {
  assessmentMediaStoragePath,
  ASSESSMENT_MEDIA_BUCKET,
  getAssessmentMediaMaxUploadBytes,
  loadClientAssessmentsWithResults,
  resolveAssessmentMediaContentType,
} from '@/lib/assessments'
import { createClient } from '@/lib/supabase/server'
import {
  createAssessmentItemSchema,
  defaultRubricConfig,
  normalizeScoreDataForSave,
  parseRubricConfig,
  saveClientAssessmentSchema,
  type CreateAssessmentItemValues,
  type SaveClientAssessmentValues,
} from '@/lib/validations/assessment'
import type {
  AssessmentItem,
  ClientAssessmentMediaWithUrl,
  ClientAssessmentWithResults,
  Json,
} from 'app/types/database'

type ActionResult<T = void> =
  | { success: true; data: T }
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

function revalidateAssessmentPaths(clientId: string) {
  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
}

export async function fetchAssessmentCatalog(): Promise<AssessmentItem[]> {
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('assessment_items')
    .select('*')
    .eq('is_active', true)
    .or(`coach_id.is.null,coach_id.eq.${user.id}`)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('fetchAssessmentCatalog', error)
    return []
  }

  return data ?? []
}

export async function createCustomAssessmentItem(
  values: CreateAssessmentItemValues
): Promise<ActionResult<AssessmentItem>> {
  const parsed = createAssessmentItemSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid assessment item.',
    }
  }

  const configResult = parseRubricConfig(
    parsed.data.rubricType,
    parsed.data.rubricConfig ?? defaultRubricConfig(parsed.data.rubricType)
  )
  if (!configResult.success) {
    return { success: false, error: configResult.error }
  }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('assessment_items')
    .insert({
      coach_id: user.id,
      name: parsed.data.name,
      category: parsed.data.category === 'custom' ? 'custom' : parsed.data.category,
      instructions: parsed.data.instructions,
      rubric_type: parsed.data.rubricType,
      rubric_config: configResult.config as Json,
      sort_order: 1000,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Could not create assessment item.',
    }
  }

  return { success: true, data }
}

export async function fetchClientAssessments(
  clientId: string
): Promise<ClientAssessmentWithResults[]> {
  const { supabase } = await requireUser()
  return loadClientAssessmentsWithResults(supabase, clientId)
}

export async function fetchClientAssessmentCount(clientId: string): Promise<number> {
  const { supabase } = await requireUser()
  const { count, error } = await supabase
    .from('client_assessments')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)

  if (error) return 0
  return count ?? 0
}

export async function saveClientAssessment(
  values: SaveClientAssessmentValues
): Promise<ActionResult<{ assessmentId: string; resultIdsByClientKey: Record<string, string> }>> {
  const parsed = saveClientAssessmentSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Please check the assessment and try again.',
    }
  }

  if (parsed.data.results.length === 0 && !parsed.data.overallNotes) {
    return {
      success: false,
      error: 'Add at least one movement or overall notes before saving.',
    }
  }

  const { supabase, user } = await requireUser()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, coach_id')
    .eq('id', parsed.data.clientId)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const assessedAt = parsed.data.assessedAt ?? new Date().toISOString()
  const resultIdsByClientKey: Record<string, string> = {}

  let assessmentId = parsed.data.assessmentId ?? null

  if (assessmentId) {
    const { data: existing, error: existingError } = await supabase
      .from('client_assessments')
      .select('id, client_id')
      .eq('id', assessmentId)
      .maybeSingle()

    if (existingError || !existing || existing.client_id !== parsed.data.clientId) {
      return { success: false, error: 'Assessment session not found.' }
    }

    const { error: updateError } = await supabase
      .from('client_assessments')
      .update({
        title: parsed.data.title,
        assessed_at: assessedAt,
        overall_notes: parsed.data.overallNotes,
      })
      .eq('id', assessmentId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Preserve media for results that still exist by matching clientKey -> old result via temp map.
    // Strategy: delete results that are no longer present; upsert current results by recreating
    // while keeping media attached when the caller supplies existing result ids through clientKey
    // that matches previous result id.
    const { data: existingResults } = await supabase
      .from('client_assessment_results')
      .select('id')
      .eq('assessment_id', assessmentId)

    const keepResultIds = new Set(
      parsed.data.results
        .map((result) => result.clientKey)
        .filter((key) => existingResults?.some((row) => row.id === key))
    )

    const deleteIds =
      existingResults
        ?.map((row) => row.id)
        .filter((id) => !keepResultIds.has(id)) ?? []

    if (deleteIds.length > 0) {
      const { data: mediaToRemove } = await supabase
        .from('client_assessment_media')
        .select('storage_path')
        .in('result_id', deleteIds)

      await supabase.from('client_assessment_results').delete().in('id', deleteIds)

      if (mediaToRemove?.length) {
        await supabase.storage
          .from(ASSESSMENT_MEDIA_BUCKET)
          .remove(mediaToRemove.map((row) => row.storage_path))
      }
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from('client_assessments')
      .insert({
        client_id: parsed.data.clientId,
        coach_id: user.id,
        title: parsed.data.title,
        assessed_at: assessedAt,
        overall_notes: parsed.data.overallNotes,
        source: parsed.data.source,
      })
      .select('id')
      .single()

    if (createError || !created) {
      return {
        success: false,
        error: createError?.message ?? 'Could not create assessment.',
      }
    }

    assessmentId = created.id
  }

  const existingResultIds = new Set<string>()
  if (parsed.data.assessmentId) {
    const { data: existingResultRows } = await supabase
      .from('client_assessment_results')
      .select('id')
      .eq('assessment_id', assessmentId)
    for (const row of existingResultRows ?? []) {
      existingResultIds.add(row.id)
    }
  }

  for (let index = 0; index < parsed.data.results.length; index += 1) {
    const result = parsed.data.results[index]!
    const configResult = parseRubricConfig(result.rubricType, result.rubricConfig)
    if (!configResult.success) {
      return { success: false, error: configResult.error }
    }

    const measurementUnit =
      result.rubricType === 'measurement'
        ? result.measurementUnit ??
          (typeof configResult.config.unit === 'string'
            ? configResult.config.unit
            : null)
        : null

    const normalized = normalizeScoreDataForSave({
      rubricType: result.rubricType,
      rubricConfig: configResult.config,
      scaleScore: result.scaleScore,
      passFail: result.passFail,
      measurementValue: result.measurementValue,
      scoreData: result.scoreData,
    })

    const row = {
      assessment_id: assessmentId,
      assessment_item_id: result.assessmentItemId ?? null,
      item_name: result.itemName,
      item_category: result.itemCategory,
      rubric_type: result.rubricType,
      rubric_config: configResult.config as Json,
      scale_score: normalized.scaleScore,
      pass_fail: normalized.passFail,
      measurement_value: normalized.measurementValue,
      measurement_unit: measurementUnit,
      score_data: normalized.scoreData as Json,
      notes: result.notes,
      sort_order: result.sortOrder ?? index,
    }

    const existingResultId = existingResultIds.has(result.clientKey)
      ? result.clientKey
      : null

    if (existingResultId) {
      const { error } = await supabase
        .from('client_assessment_results')
        .update(row)
        .eq('id', existingResultId)

      if (error) {
        return { success: false, error: error.message }
      }

      resultIdsByClientKey[result.clientKey] = existingResultId
    } else {
      const { data: inserted, error } = await supabase
        .from('client_assessment_results')
        .insert(row)
        .select('id')
        .single()

      if (error || !inserted) {
        return {
          success: false,
          error: error?.message ?? 'Could not save assessment result.',
        }
      }

      resultIdsByClientKey[result.clientKey] = inserted.id
    }
  }

  // Keep legacy column in sync for onboarding milestone / older surfaces when this is
  // the first structured assessment with overall notes.
  if (parsed.data.overallNotes) {
    await supabase
      .from('clients')
      .update({ onboarding_assessment_notes: parsed.data.overallNotes })
      .eq('id', parsed.data.clientId)
  }

  revalidateAssessmentPaths(parsed.data.clientId)
  return {
    success: true,
    data: { assessmentId, resultIdsByClientKey },
  }
}

export async function deleteClientAssessment(
  assessmentId: string
): Promise<ActionResult<{ clientId: string }>> {
  const { supabase } = await requireUser()

  const { data: assessment, error } = await supabase
    .from('client_assessments')
    .select('id, client_id')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error || !assessment) {
    return { success: false, error: 'Assessment not found.' }
  }

  const { data: results } = await supabase
    .from('client_assessment_results')
    .select('id')
    .eq('assessment_id', assessmentId)

  const resultIds = results?.map((row) => row.id) ?? []
  if (resultIds.length > 0) {
    const { data: media } = await supabase
      .from('client_assessment_media')
      .select('storage_path')
      .in('result_id', resultIds)

    if (media?.length) {
      await supabase.storage
        .from(ASSESSMENT_MEDIA_BUCKET)
        .remove(media.map((row) => row.storage_path))
    }
  }

  const { error: deleteError } = await supabase
    .from('client_assessments')
    .delete()
    .eq('id', assessmentId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidateAssessmentPaths(assessment.client_id)
  return { success: true, data: { clientId: assessment.client_id } }
}

export async function uploadAssessmentMedia(input: {
  clientId: string
  assessmentId: string
  resultId: string
  formData: FormData
}): Promise<ActionResult<ClientAssessmentMediaWithUrl>> {
  const file = input.formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No file provided.' }
  }

  const contentType = resolveAssessmentMediaContentType(file)
  if (!contentType) {
    return {
      success: false,
      error: 'Unsupported file type. Use MP4, WebM, MOV, JPEG, PNG, or WebP.',
    }
  }

  const maxBytes = getAssessmentMediaMaxUploadBytes(contentType)
  if (file.size > maxBytes) {
    return {
      success: false,
      error: contentType.startsWith('image/')
        ? 'Photos must be under 10 MB.'
        : 'Videos must be under 50 MB.',
    }
  }

  const { supabase } = await requireUser()

  const { data: result, error: resultError } = await supabase
    .from('client_assessment_results')
    .select('id, assessment_id')
    .eq('id', input.resultId)
    .maybeSingle()

  if (resultError || !result || result.assessment_id !== input.assessmentId) {
    return { success: false, error: 'Assessment result not found.' }
  }

  const { data: assessment, error: assessmentError } = await supabase
    .from('client_assessments')
    .select('id, client_id, coach_id')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (
    assessmentError ||
    !assessment ||
    assessment.client_id !== input.clientId
  ) {
    return { success: false, error: 'Assessment result not found.' }
  }

  const mediaId = crypto.randomUUID()
  const storagePath = assessmentMediaStoragePath({
    clientId: input.clientId,
    assessmentId: input.assessmentId,
    resultId: input.resultId,
    mediaId,
    contentType,
  })

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(ASSESSMENT_MEDIA_BUCKET)
    .upload(storagePath, buffer, {
      upsert: false,
      contentType,
      cacheControl: '3600',
    })

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message.includes('bucket')
        ? 'Assessment media storage is not set up. Run yarn db:push.'
        : uploadError.message,
    }
  }

  const { count } = await supabase
    .from('client_assessment_media')
    .select('id', { count: 'exact', head: true })
    .eq('result_id', input.resultId)

  const { data: mediaRow, error: insertError } = await supabase
    .from('client_assessment_media')
    .insert({
      id: mediaId,
      result_id: input.resultId,
      storage_path: storagePath,
      content_type: contentType,
      file_size_bytes: file.size,
      file_name: file.name.slice(0, 200),
      sort_order: count ?? 0,
    })
    .select('*')
    .single()

  if (insertError || !mediaRow) {
    await supabase.storage.from(ASSESSMENT_MEDIA_BUCKET).remove([storagePath])
    return {
      success: false,
      error: insertError?.message ?? 'Could not save media record.',
    }
  }

  const { data: signed } = await supabase.storage
    .from(ASSESSMENT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, 3600)

  revalidateAssessmentPaths(input.clientId)
  return {
    success: true,
    data: { ...mediaRow, signedUrl: signed?.signedUrl ?? null },
  }
}

export async function deleteAssessmentMedia(
  mediaId: string
): Promise<ActionResult<{ clientId: string }>> {
  const { supabase } = await requireUser()

  const { data: media, error } = await supabase
    .from('client_assessment_media')
    .select('id, storage_path, result_id')
    .eq('id', mediaId)
    .maybeSingle()

  if (error || !media) {
    return { success: false, error: 'Media not found.' }
  }

  const { data: result } = await supabase
    .from('client_assessment_results')
    .select('id, assessment_id')
    .eq('id', media.result_id)
    .maybeSingle()

  if (!result) {
    return { success: false, error: 'Media not found.' }
  }

  const { data: assessment } = await supabase
    .from('client_assessments')
    .select('client_id')
    .eq('id', result.assessment_id)
    .maybeSingle()

  const clientId = assessment?.client_id
  if (!clientId) {
    return { success: false, error: 'Media not found.' }
  }

  await supabase.storage.from(ASSESSMENT_MEDIA_BUCKET).remove([media.storage_path])

  const { error: deleteError } = await supabase
    .from('client_assessment_media')
    .delete()
    .eq('id', mediaId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidateAssessmentPaths(clientId)
  return { success: true, data: { clientId } }
}
