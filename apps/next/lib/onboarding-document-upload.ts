import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  ONBOARDING_DOCUMENTS_BUCKET,
  ONBOARDING_PDF_MAX_BYTES,
  coachOnboardingTemplatePath,
  resolveOnboardingPdfContentType,
} from '@/lib/onboarding-documents'
import {
  uploadOnboardingDocumentSchema,
  type UploadOnboardingDocumentValues,
} from '@/lib/validations/onboarding-documents'
import type { Database } from 'app/types/database'

export type OnboardingDocumentUploadResult =
  | { success: true; documentId: string }
  | { success: false; error: string }

export async function uploadCoachOnboardingDocumentFile(
  supabase: SupabaseClient<Database>,
  coachId: string,
  file: File,
  values: UploadOnboardingDocumentValues
): Promise<OnboardingDocumentUploadResult> {
  const parsed = uploadOnboardingDocumentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  if (file.size === 0) {
    return { success: false, error: 'No PDF provided.' }
  }

  const contentType = resolveOnboardingPdfContentType(file)
  if (!contentType) {
    return { success: false, error: 'Unsupported file type. Upload a PDF.' }
  }

  if (file.size > ONBOARDING_PDF_MAX_BYTES) {
    return { success: false, error: 'PDF must be under 10 MB.' }
  }

  const documentId = randomUUID()
  const storagePath = coachOnboardingTemplatePath(coachId, documentId)
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
      coach_id: coachId,
      name: parsed.data.name,
      document_type: parsed.data.documentType,
      storage_path: storagePath,
      is_default: parsed.data.isDefault ?? false,
    })

  if (insertError) {
    await supabase.storage.from(ONBOARDING_DOCUMENTS_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to save document.' }
  }

  return { success: true, documentId }
}
