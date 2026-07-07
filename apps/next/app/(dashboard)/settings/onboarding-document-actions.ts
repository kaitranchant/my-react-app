'use server'

import { revalidatePath } from 'next/cache'

import {
  ONBOARDING_DOCUMENTS_BUCKET,
} from '@/lib/onboarding-documents'
import { uploadCoachOnboardingDocumentFile } from '@/lib/onboarding-document-upload'
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
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No PDF provided.' }
  }

  const { supabase, user } = await requireUser()
  const result = await uploadCoachOnboardingDocumentFile(
    supabase,
    user.id,
    file,
    values
  )

  if (!result.success) {
    return result
  }

  revalidateOnboardingPaths()
  return result
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
