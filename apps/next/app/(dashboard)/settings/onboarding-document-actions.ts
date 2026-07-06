'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

import {
  ONBOARDING_DOCUMENTS_BUCKET,
  ONBOARDING_PDF_MAX_BYTES,
  coachOnboardingTemplatePath,
  resolveOnboardingPdfContentType,
} from '@/lib/onboarding-documents'
import { createClient } from '@/lib/supabase/server'
import {
  uploadOnboardingDocumentSchema,
  type UploadOnboardingDocumentValues,
} from '@/lib/validations/onboarding-documents'

export type OnboardingDocumentActionResult =
  | { success: true; documentId: string }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')
  return { supabase, user }
}

function revalidateOnboardingPaths() {
  revalidatePath('/settings')
  revalidatePath('/clients')
}

export async function uploadCoachOnboardingDocument(
  formData: FormData,
  values: UploadOnboardingDocumentValues
): Promise<OnboardingDocumentActionResult> {
  const parsed = uploadOnboardingDocumentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No PDF provided.' }
  }

  const contentType = resolveOnboardingPdfContentType(file)
  if (!contentType) {
    return { success: false, error: 'Unsupported file type. Upload a PDF.' }
  }

  if (file.size > ONBOARDING_PDF_MAX_BYTES) {
    return { success: false, error: 'PDF must be under 10 MB.' }
  }

  const { supabase, user } = await requireUser()
  const documentId = randomUUID()
  const storagePath = coachOnboardingTemplatePath(user.id, documentId)
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: 'Failed to upload PDF.' }
  }

  const { error: insertError } = await supabase
    .from('coach_onboarding_documents')
    .insert({
      id: documentId,
      coach_id: user.id,
      name: parsed.data.name,
      document_type: parsed.data.documentType,
      storage_path: storagePath,
      is_default: parsed.data.isDefault ?? false,
    })

  if (insertError) {
    await supabase.storage.from(ONBOARDING_DOCUMENTS_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to save document.' }
  }

  revalidateOnboardingPaths()
  return { success: true, documentId }
}

export async function updateCoachOnboardingDocument(
  documentId: string,
  values: Pick<UploadOnboardingDocumentValues, 'name' | 'documentType' | 'isDefault'>
): Promise<OnboardingDocumentActionResult> {
  const parsed = uploadOnboardingDocumentSchema
    .pick({ name: true, documentType: true, isDefault: true })
    .safeParse(values)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('coach_onboarding_documents')
    .update({
      name: parsed.data.name,
      document_type: parsed.data.documentType,
      is_default: parsed.data.isDefault ?? false,
    })
    .eq('id', documentId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: 'Failed to update document.' }
  }

  revalidateOnboardingPaths()
  return { success: true, documentId }
}

export async function deleteCoachOnboardingDocument(
  documentId: string
): Promise<OnboardingDocumentActionResult> {
  const { supabase, user } = await requireUser()

  const { data: document, error: fetchError } = await supabase
    .from('coach_onboarding_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !document) {
    return { success: false, error: 'Document not found.' }
  }

  const { error: deleteError } = await supabase
    .from('coach_onboarding_documents')
    .delete()
    .eq('id', documentId)
    .eq('coach_id', user.id)

  if (deleteError) {
    return { success: false, error: 'Failed to delete document.' }
  }

  await supabase.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .remove([document.storage_path])

  revalidateOnboardingPaths()
  return { success: true, documentId }
}
