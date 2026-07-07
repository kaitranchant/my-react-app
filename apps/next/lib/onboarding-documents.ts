import type { SupabaseClient } from '@supabase/supabase-js'

import type { CoachOnboardingDocument } from 'app/types/database'

export const ONBOARDING_DOCUMENTS_BUCKET = 'onboarding-documents'
export const ONBOARDING_PDF_MAX_BYTES = 10 * 1024 * 1024
export const ONBOARDING_SIGNED_URL_TTL_SECONDS = 3600

export const ONBOARDING_PDF_MIME_TYPES = ['application/pdf'] as const
export const ONBOARDING_SIGNATURE_MIME_TYPES = ['image/png'] as const

export type OnboardingPdfMimeType = (typeof ONBOARDING_PDF_MIME_TYPES)[number]

export const ONBOARDING_PDF_ACCEPT = 'application/pdf,.pdf'

export const ONBOARDING_PDF_UPLOAD_HINT =
  'PDF only, up to 10 MB. Upload your PAR-Q, liability waiver, or other onboarding forms.'

export function coachOnboardingTemplatePath(coachId: string, documentId: string) {
  return `coaches/${coachId}/templates/${documentId}.pdf`
}

export function clientSignedPdfPath(clientId: string, requestId: string) {
  return `clients/${clientId}/signed/${requestId}.pdf`
}

export function clientSignatureImagePath(clientId: string, requestId: string) {
  return `clients/${clientId}/signatures/${requestId}.png`
}

export function isOnboardingPdfMimeType(value: string): value is OnboardingPdfMimeType {
  return ONBOARDING_PDF_MIME_TYPES.includes(value as OnboardingPdfMimeType)
}

export function resolveOnboardingPdfContentType(
  file: Pick<File, 'name' | 'type'>
): OnboardingPdfMimeType | null {
  const normalizedType = file.type.trim().toLowerCase()
  if (normalizedType && isOnboardingPdfMimeType(normalizedType)) {
    return normalizedType
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return 'application/pdf'
  return null
}

export async function createOnboardingDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  ttlSeconds = ONBOARDING_SIGNED_URL_TTL_SECONDS
) {
  const { data, error } = await supabase.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds)

  if (error) return null
  return data.signedUrl
}

export type CoachOnboardingDocumentWithUrl = CoachOnboardingDocument & {
  signedUrl: string | null
}

export async function attachOnboardingDocumentUrls(
  supabase: SupabaseClient,
  documents: CoachOnboardingDocument[]
): Promise<CoachOnboardingDocumentWithUrl[]> {
  return Promise.all(
    documents.map(async (document) => ({
      ...document,
      signedUrl: await createOnboardingDocumentSignedUrl(
        supabase,
        document.storage_path
      ),
    }))
  )
}

export const onboardingDocumentTypeLabels: Record<
  CoachOnboardingDocument['document_type'],
  string
> = {
  par_q: 'PAR-Q',
  liability: 'Liability waiver',
  other: 'Other',
}

export function isFillOnlyOnboardingDocument(
  documentType: CoachOnboardingDocument['document_type'] | string
) {
  return documentType === 'par_q'
}

export function isSignatureOnboardingDocument(
  documentType: CoachOnboardingDocument['document_type'] | string
) {
  return !isFillOnlyOnboardingDocument(documentType)
}

export function partitionOnboardingDocuments(documents: CoachOnboardingDocument[]) {
  return {
    fillDocuments: documents.filter((document) =>
      isFillOnlyOnboardingDocument(document.document_type)
    ),
    signatureDocuments: documents.filter((document) =>
      isSignatureOnboardingDocument(document.document_type)
    ),
  }
}

export function getDefaultOnboardingDocumentSelections(
  documents: CoachOnboardingDocument[]
) {
  const defaults = documents.filter((document) => document.is_default)
  return {
    fillIds: defaults
      .filter((document) => isFillOnlyOnboardingDocument(document.document_type))
      .map((document) => document.id),
    signatureIds: defaults
      .filter((document) => isSignatureOnboardingDocument(document.document_type))
      .map((document) => document.id),
  }
}
