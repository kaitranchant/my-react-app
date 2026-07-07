import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  ONBOARDING_DOCUMENTS_BUCKET,
  ONBOARDING_PDF_MAX_BYTES,
  clientSignedPdfPath,
  resolveOnboardingPdfContentType,
} from '@/lib/onboarding-documents'
import {
  uploadCompletedOnboardingDocumentSchema,
  type UploadCompletedOnboardingDocumentValues,
} from '@/lib/validations/onboarding-documents'
import { notifyCoachOnboardingDocumentsComplete } from '@/lib/notifications/notify-coach-onboarding-documents-complete'
import type { Database } from 'app/types/database'

export type ClientOnboardingDocumentUploadResult =
  | { success: true; requestId: string }
  | { success: false; error: string }

type AdminClient = NonNullable<
  ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>
>

export async function uploadClientCompletedOnboardingDocument(input: {
  supabase: SupabaseClient<Database>
  admin: AdminClient
  coachId: string
  file: File
  values: UploadCompletedOnboardingDocumentValues
}): Promise<ClientOnboardingDocumentUploadResult> {
  const parsed = uploadCompletedOnboardingDocumentSchema.safeParse(input.values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { clientId, documentId } = parsed.data
  const signerName = parsed.data.signerName?.trim()

  if (input.file.size === 0) {
    return { success: false, error: 'No PDF provided.' }
  }

  const contentType = resolveOnboardingPdfContentType(input.file)
  if (!contentType) {
    return { success: false, error: 'Unsupported file type. Upload a PDF.' }
  }

  if (input.file.size > ONBOARDING_PDF_MAX_BYTES) {
    return { success: false, error: 'PDF must be under 10 MB.' }
  }

  const { data: client, error: clientError } = await input.supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('id', clientId)
    .eq('coach_id', input.coachId)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const { data: document, error: documentError } = await input.supabase
    .from('coach_onboarding_documents')
    .select('id, name')
    .eq('id', documentId)
    .eq('coach_id', input.coachId)
    .maybeSingle()

  if (documentError || !document) {
    return { success: false, error: 'Document not found.' }
  }

  const { data: existingSigned } = await input.supabase
    .from('client_document_signing_requests')
    .select('id, packet:client_onboarding_packets!inner(client_id, coach_id)')
    .eq('document_id', documentId)
    .eq('status', 'signed')
    .eq('packet.client_id', clientId)
    .eq('packet.coach_id', input.coachId)
    .limit(1)

  if ((existingSigned ?? []).length > 0) {
    return { success: false, error: 'This document is already on file for this client.' }
  }

  const { data: pendingRows } = await input.supabase
    .from('client_document_signing_requests')
    .select(
      'id, packet_id, packet:client_onboarding_packets!inner(client_id, coach_id, completed_at)'
    )
    .eq('document_id', documentId)
    .eq('status', 'pending')
    .eq('packet.client_id', clientId)
    .eq('packet.coach_id', input.coachId)

  const pendingRequest =
    (pendingRows ?? []).find((row) => {
      const packet = Array.isArray(row.packet) ? row.packet[0] : row.packet
      return packet && !packet.completed_at
    }) ?? null

  let requestId = pendingRequest?.id
  let packetId = pendingRequest?.packet_id

  if (!requestId || !packetId) {
    packetId = randomUUID()
    requestId = randomUUID()

    const { error: packetError } = await input.supabase
      .from('client_onboarding_packets')
      .insert({
        id: packetId,
        client_id: clientId,
        coach_id: input.coachId,
        delivery_method: 'in_person',
        signer_email: client.email?.trim() || null,
      })

    if (packetError) {
      return { success: false, error: 'Failed to create onboarding packet.' }
    }

    const { error: requestError } = await input.supabase
      .from('client_document_signing_requests')
      .insert({
        id: requestId,
        packet_id: packetId,
        document_id: documentId,
        sort_order: 0,
        status: 'pending',
      })

    if (requestError) {
      await input.supabase.from('client_onboarding_packets').delete().eq('id', packetId)
      return { success: false, error: 'Failed to create document request.' }
    }
  }

  const signedPdfPath = clientSignedPdfPath(clientId, requestId)
  const buffer = Buffer.from(await input.file.arrayBuffer())
  const signedAt = new Date().toISOString()
  const resolvedSignerName = signerName || client.full_name?.trim() || 'Client'

  const { error: uploadError } = await input.admin.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .upload(signedPdfPath, buffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    return { success: false, error: 'Failed to upload document.' }
  }

  const { error: updateError } = await input.admin
    .from('client_document_signing_requests')
    .update({
      status: 'signed',
      signer_name: resolvedSignerName,
      signed_at: signedAt,
      signed_pdf_storage_path: signedPdfPath,
      signature_image_path: null,
    })
    .eq('id', requestId)

  if (updateError) {
    return { success: false, error: 'Failed to save document status.' }
  }

  const { data: packetRequests } = await input.admin
    .from('client_document_signing_requests')
    .select('id, status')
    .eq('packet_id', packetId)

  const allSigned = (packetRequests ?? []).every((request) => request.status === 'signed')
  if (allSigned) {
    await input.admin
      .from('client_onboarding_packets')
      .update({
        completed_at: signedAt,
        sign_token: null,
        sign_expires_at: null,
      })
      .eq('id', packetId)

    const { data: packetRequestsWithDocs } = await input.admin
      .from('client_document_signing_requests')
      .select('document:coach_onboarding_documents(name)')
      .eq('packet_id', packetId)

    const documentNames =
      packetRequestsWithDocs?.map((request) => {
        const doc = Array.isArray(request.document)
          ? request.document[0]
          : request.document
        return doc?.name ?? 'Document'
      }) ?? []

    void notifyCoachOnboardingDocumentsComplete({
      coachId: input.coachId,
      clientId,
      clientName: client.full_name ?? 'Client',
      documentNames,
    })
  }

  return { success: true, requestId }
}
