'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

import { isCoachClientNotificationEnabled } from '@/lib/coach-client-notification-preferences'
import { sendOnboardingDocumentsEmail } from '@/lib/email/onboarding-documents-request'
import { getAppBaseUrl } from '@/lib/email/config'
import {
  buildOnboardingInPersonSignUrl,
  buildOnboardingSignUrl,
  getOnboardingSignExpiryDate,
} from '@/lib/invite'
import { fetchCoachOnboardingDocuments, fetchClientCompletedOnboardingDocumentIds } from '@/lib/onboarding-data'
import { notifyCoachOnboardingDocumentsComplete } from '@/lib/notifications/notify-coach-onboarding-documents-complete'
import {
  ONBOARDING_DOCUMENTS_BUCKET,
  clientSignatureImagePath,
  clientSignedPdfPath,
  createOnboardingDocumentSignedUrl,
  isFillOnlyOnboardingDocument,
} from '@/lib/onboarding-documents'
import {
  dataUrlToPngBytes,
  mergeSignatureIntoPdf,
} from '@/lib/onboarding-pdf-signing'
import {
  formatOnboardingSignDate,
  getNextPendingSigningRequest,
  isOnboardingPacketComplete,
  signerEmailMatchesPacket,
} from '@/lib/onboarding-signing'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  completeDocumentSignSchema,
  createOnboardingPacketSchema,
  type CompleteDocumentSignValues,
  type CreateOnboardingPacketValues,
} from '@/lib/validations/onboarding-documents'

export type OnboardingActionResult =
  | { success: true }
  | { success: false; error: string }

export type CreateOnboardingPacketResult =
  | {
      success: true
      packetId: string
      signUrl: string | null
      inPersonUrl: string
    }
  | { success: false; error: string; signUrl?: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')
  return { supabase, user }
}

function revalidateClientPaths(clientId: string) {
  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
}

async function getCoachName(supabase: Awaited<ReturnType<typeof createClient>>, coachId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', coachId)
    .maybeSingle()

  return data?.full_name?.trim() || data?.business_name?.trim() || 'Your coach'
}

export async function createOnboardingPacket(
  values: CreateOnboardingPacketValues
): Promise<CreateOnboardingPacketResult> {
  const parsed = createOnboardingPacketSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { supabase, user } = await requireUser()
  const { clientId, documentIds, deliveryMethod, signerEmail } = parsed.data

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const documents = await fetchCoachOnboardingDocuments(supabase, user.id)
  const selectedDocuments = documents.filter((document) =>
    documentIds.includes(document.id)
  )

  if (selectedDocuments.length !== documentIds.length) {
    return { success: false, error: 'One or more documents were not found.' }
  }

  const email =
    deliveryMethod === 'email'
      ? (signerEmail?.trim() || client.email?.trim() || '')
      : client.email?.trim() || signerEmail?.trim() || null

  if (deliveryMethod === 'email' && !email) {
    return {
      success: false,
      error: 'Add an email for this client before sending documents.',
    }
  }

  const packetId = randomUUID()
  const signToken = deliveryMethod === 'email' ? randomUUID() : null
  const signExpiresAt = signToken ? getOnboardingSignExpiryDate() : null

  const { error: packetError } = await supabase.from('client_onboarding_packets').insert({
    id: packetId,
    client_id: clientId,
    coach_id: user.id,
    sign_token: signToken,
    sign_expires_at: signExpiresAt,
    delivery_method: deliveryMethod,
    signer_email: email,
  })

  if (packetError) {
    return { success: false, error: 'Failed to create onboarding packet.' }
  }

  const requestRows = selectedDocuments.map((document, index) => ({
    packet_id: packetId,
    document_id: document.id,
    sort_order: index,
    status: 'pending' as const,
  }))

  const { error: requestsError } = await supabase
    .from('client_document_signing_requests')
    .insert(requestRows)

  if (requestsError) {
    await supabase.from('client_onboarding_packets').delete().eq('id', packetId)
    return { success: false, error: 'Failed to create signing requests.' }
  }

  const signUrl = signToken ? buildOnboardingSignUrl(signToken) : null
  const inPersonUrl = buildOnboardingInPersonSignUrl(clientId, packetId)

  if (deliveryMethod === 'email' && signUrl && email) {
    const sendEnabled = await isCoachClientNotificationEnabled(
      user.id,
      'sendClientOnboardingDocuments'
    )

    if (sendEnabled) {
      const coachName = await getCoachName(supabase, user.id)
      const emailResult = await sendOnboardingDocumentsEmail({
        clientName: client.full_name,
        clientEmail: email,
        coachName,
        signUrl,
        documentNames: selectedDocuments.map((document) => document.name),
      })

      if (!emailResult.ok) {
        revalidateClientPaths(clientId)
        return {
          success: true,
          packetId,
          signUrl,
          inPersonUrl,
        }
      }
    }
  }

  revalidateClientPaths(clientId)
  return { success: true, packetId, signUrl, inPersonUrl }
}

export async function resendOnboardingDocumentsEmail(
  packetId: string
): Promise<CreateOnboardingPacketResult> {
  const { supabase, user } = await requireUser()

  const { data: packet, error } = await supabase
    .from('client_onboarding_packets')
    .select('id, client_id, sign_token, sign_expires_at, signer_email, completed_at, delivery_method')
    .eq('id', packetId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !packet) {
    return { success: false, error: 'Onboarding packet not found.' }
  }

  if (packet.completed_at) {
    return { success: false, error: 'All documents are already signed.' }
  }

  if (!packet.signer_email?.trim()) {
    return { success: false, error: 'This packet does not have a signer email.' }
  }

  let signToken = packet.sign_token
  const signExpiresAt = getOnboardingSignExpiryDate()

  if (!signToken) {
    signToken = randomUUID()
    await supabase
      .from('client_onboarding_packets')
      .update({
        sign_token: signToken,
        sign_expires_at: signExpiresAt,
        delivery_method: 'email',
      })
      .eq('id', packetId)
  } else {
    await supabase
      .from('client_onboarding_packets')
      .update({ sign_expires_at: signExpiresAt })
      .eq('id', packetId)
  }

  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', packet.client_id)
    .maybeSingle()

  const { data: requestRows } = await supabase
    .from('client_document_signing_requests')
    .select('document:coach_onboarding_documents(name)')
    .eq('packet_id', packetId)
    .eq('status', 'pending')

  const documentNames =
    requestRows?.map((row) => {
      const document = Array.isArray(row.document) ? row.document[0] : row.document
      return document?.name ?? 'Document'
    }) ?? []

  const signUrl = buildOnboardingSignUrl(signToken!)
  const sendEnabled = await isCoachClientNotificationEnabled(
    user.id,
    'sendClientOnboardingDocuments'
  )

  if (sendEnabled) {
    const coachName = await getCoachName(supabase, user.id)
    const emailResult = await sendOnboardingDocumentsEmail({
      clientName: client?.full_name ?? 'Client',
      clientEmail: packet.signer_email,
      coachName,
      signUrl,
      documentNames,
    })

    if (!emailResult.ok) {
      revalidateClientPaths(packet.client_id)
      return {
        success: false,
        error: 'Email could not be sent. Copy the link instead.',
        signUrl,
      }
    }
  }

  revalidateClientPaths(packet.client_id)
  return {
    success: true,
    packetId,
    signUrl,
    inPersonUrl: buildOnboardingInPersonSignUrl(packet.client_id, packetId),
  }
}

export async function getOnboardingSignLink(
  packetId: string
): Promise<CreateOnboardingPacketResult> {
  const { supabase, user } = await requireUser()

  const { data: packet, error } = await supabase
    .from('client_onboarding_packets')
    .select('id, client_id, sign_token, completed_at')
    .eq('id', packetId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !packet) {
    return { success: false, error: 'Onboarding packet not found.' }
  }

  if (packet.completed_at) {
    return { success: false, error: 'All documents are already signed.' }
  }

  let signToken = packet.sign_token
  if (!signToken) {
    signToken = randomUUID()
    await supabase
      .from('client_onboarding_packets')
      .update({
        sign_token: signToken,
        sign_expires_at: getOnboardingSignExpiryDate(),
      })
      .eq('id', packetId)
  }

  const signUrl = buildOnboardingSignUrl(signToken)
  return {
    success: true,
    packetId,
    signUrl,
    inPersonUrl: buildOnboardingInPersonSignUrl(packet.client_id, packetId),
  }
}

type PacketContext = {
  packetId: string
  clientId: string
  coachId: string
  signerEmail: string | null
}

async function resolvePacketForSigning({
  token,
  packetId,
  coachUserId,
}: {
  token?: string
  packetId?: string
  coachUserId?: string
}): Promise<{ admin: NonNullable<ReturnType<typeof createAdminClient>>; packet: PacketContext } | { error: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return { error: 'Signing is temporarily unavailable.' }
  }

  let query = admin.from('client_onboarding_packets').select('*')

  if (token) {
    query = query.eq('sign_token', token)
  } else if (packetId && coachUserId) {
    query = query.eq('id', packetId).eq('coach_id', coachUserId)
  } else {
    return { error: 'Invalid signing session.' }
  }

  const { data: packet, error } = await query.maybeSingle()
  if (error || !packet) {
    return { error: 'This signing link is invalid or expired.' }
  }

  if (packet.completed_at) {
    return { error: 'All documents in this packet are already signed.' }
  }

  if (packet.sign_expires_at && new Date(packet.sign_expires_at) <= new Date()) {
    return { error: 'This signing link has expired. Ask your coach for a new one.' }
  }

  return {
    admin,
    packet: {
      packetId: packet.id,
      clientId: packet.client_id,
      coachId: packet.coach_id,
      signerEmail: packet.signer_email,
    },
  }
}

async function maybeCompletePacket(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  packet: PacketContext
) {
  const { data: requests } = await admin
    .from('client_document_signing_requests')
    .select('id, status, document:coach_onboarding_documents(name)')
    .eq('packet_id', packet.packetId)

  if (!requests || !isOnboardingPacketComplete(requests)) {
    return
  }

  await admin
    .from('client_onboarding_packets')
    .update({
      completed_at: new Date().toISOString(),
      sign_token: null,
      sign_expires_at: null,
    })
    .eq('id', packet.packetId)

  const { data: client } = await admin
    .from('clients')
    .select('full_name')
    .eq('id', packet.clientId)
    .maybeSingle()

  const documentNames = requests.map((request) => {
    const document = Array.isArray(request.document) ? request.document[0] : request.document
    return document?.name ?? 'Document'
  })

  void notifyCoachOnboardingDocumentsComplete({
    coachId: packet.coachId,
    clientId: packet.clientId,
    clientName: client?.full_name ?? 'Client',
    documentNames,
  })
}

export async function completeDocumentSign(input: {
  values: CompleteDocumentSignValues
  signatureDataUrl?: string | null
}) {
  const parsed = completeDocumentSignSchema.safeParse(input.values)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { token, packetId, requestId, signerName, signerEmail } = parsed.data

  let coachUserId: string | undefined
  if (!token) {
    const { user } = await requireUser()
    coachUserId = user.id
  }

  const resolved = await resolvePacketForSigning({ token, packetId, coachUserId })
  if ('error' in resolved) {
    return { success: false as const, error: resolved.error }
  }

  const { admin, packet } = resolved

  if (
    token &&
    signerEmail &&
    !signerEmailMatchesPacket(packet.signerEmail, signerEmail)
  ) {
    return {
      success: false as const,
      error: 'Email does not match the address this packet was sent to.',
    }
  }

  const { data: request, error: requestError } = await admin
    .from('client_document_signing_requests')
    .select('*, document:coach_onboarding_documents(*)')
    .eq('id', requestId)
    .eq('packet_id', packet.packetId)
    .maybeSingle()

  if (requestError || !request) {
    return { success: false as const, error: 'Document not found.' }
  }

  if (request.status === 'signed') {
    return { success: false as const, error: 'This document is already signed.' }
  }

  const document = Array.isArray(request.document)
    ? request.document[0]
    : request.document

  if (!document?.storage_path) {
    return { success: false as const, error: 'Document template is missing.' }
  }

  const isFillOnly = isFillOnlyOnboardingDocument(document.document_type)

  if (
    !isFillOnly &&
    (!input.signatureDataUrl || !input.signatureDataUrl.startsWith('data:image/png'))
  ) {
    return { success: false as const, error: 'Signature is required.' }
  }

  const { data: templateFile, error: downloadError } = await admin.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .download(document.storage_path)

  if (downloadError || !templateFile) {
    return { success: false as const, error: 'Could not load document for signing.' }
  }

  const signedAt = new Date()
  const signedAtLabel = formatOnboardingSignDate(signedAt.toISOString()) ?? signedAt.toISOString()
  const templateBytes = new Uint8Array(await templateFile.arrayBuffer())
  const signedPdfBuffer = isFillOnly
    ? Buffer.from(templateBytes)
    : await mergeSignatureIntoPdf({
        templatePdfBytes: templateBytes,
        signaturePngBytes: new Uint8Array(
          dataUrlToPngBytes(input.signatureDataUrl!)
        ),
        signerName,
        signedAtLabel,
      })

  const signaturePath = isFillOnly
    ? null
    : clientSignatureImagePath(packet.clientId, requestId)
  const signedPdfPath = clientSignedPdfPath(packet.clientId, requestId)

  if (!isFillOnly && signaturePath && input.signatureDataUrl) {
    const signatureBytes = new Uint8Array(dataUrlToPngBytes(input.signatureDataUrl))
    const { error: signatureUploadError } = await admin.storage
      .from(ONBOARDING_DOCUMENTS_BUCKET)
      .upload(signaturePath, signatureBytes, {
        contentType: 'image/png',
        upsert: true,
      })

    if (signatureUploadError) {
      return { success: false as const, error: 'Failed to save signature.' }
    }
  }

  const { error: signedPdfUploadError } = await admin.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .upload(signedPdfPath, signedPdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (signedPdfUploadError) {
    return { success: false as const, error: 'Failed to save signed document.' }
  }

  const { error: updateError } = await admin
    .from('client_document_signing_requests')
    .update({
      status: 'signed',
      signer_name: signerName,
      signed_at: signedAt.toISOString(),
      signature_image_path: signaturePath,
      signed_pdf_storage_path: signedPdfPath,
    })
    .eq('id', requestId)

  if (updateError) {
    return { success: false as const, error: 'Failed to update signing status.' }
  }

  await maybeCompletePacket(admin, packet)
  revalidateClientPaths(packet.clientId)

  const { data: remainingRequests } = await admin
    .from('client_document_signing_requests')
    .select('id, status, sort_order')
    .eq('packet_id', packet.packetId)

  const nextRequest = getNextPendingSigningRequest(remainingRequests ?? [])
  const complete = isOnboardingPacketComplete(remainingRequests ?? [])

  return {
    success: true as const,
    complete,
    nextRequestId: nextRequest?.id ?? null,
    clientName: signerName,
  }
}

export async function getSigningTemplateUrl(input: {
  token?: string
  packetId?: string
  requestId: string
}) {
  let coachUserId: string | undefined
  if (!input.token) {
    const { user } = await requireUser()
    coachUserId = user.id
  }

  const resolved = await resolvePacketForSigning({
    token: input.token,
    packetId: input.packetId,
    coachUserId,
  })

  if ('error' in resolved) {
    return { success: false as const, error: resolved.error }
  }

  const { admin, packet } = resolved
  const { data: request } = await admin
    .from('client_document_signing_requests')
    .select('document:coach_onboarding_documents(storage_path)')
    .eq('id', input.requestId)
    .eq('packet_id', packet.packetId)
    .maybeSingle()

  const document = Array.isArray(request?.document)
    ? request.document[0]
    : request?.document

  if (!document?.storage_path) {
    return { success: false as const, error: 'Document not found.' }
  }

  const { data, error } = await admin.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path, 3600)

  if (error || !data?.signedUrl) {
    return { success: false as const, error: 'Could not load document.' }
  }

  return { success: true as const, signedUrl: data.signedUrl }
}

export async function fetchClientsForOnboarding() {
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, email, status')
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function fetchOnboardingTemplatesForCoach() {
  const { supabase, user } = await requireUser()
  return fetchCoachOnboardingDocuments(supabase, user.id)
}

export async function fetchClientOnboardingCompletion(clientId: string) {
  const { supabase, user } = await requireUser()
  const completedDocumentIds = await fetchClientCompletedOnboardingDocumentIds(
    supabase,
    clientId,
    user.id
  )
  return { completedDocumentIds }
}

export async function getOnboardingSignSession(input: {
  token?: string
  packetId?: string
}) {
  const admin = createAdminClient()
  if (!admin) {
    return { success: false as const, error: 'Signing is temporarily unavailable.' }
  }

  if (input.token) {
    const { data: previewRows, error } = await admin.rpc('get_onboarding_sign_preview', {
      p_token: input.token,
    })

    if (error || !previewRows?.[0]) {
      return { success: false as const, error: 'This signing link is invalid or expired.' }
    }

    const preview = previewRows[0]
    const { data: documents, error: documentsError } = await admin.rpc(
      'get_onboarding_sign_documents',
      { p_token: input.token }
    )

    if (documentsError) {
      return { success: false as const, error: 'Could not load documents.' }
    }

    return {
      success: true as const,
      mode: 'public' as const,
      preview: {
        packetId: preview.packet_id,
        clientId: preview.client_id,
        clientName: preview.client_name,
        coachName: preview.coach_name,
        signerEmail: preview.signer_email,
        expiresAt: preview.expires_at,
      },
      documents: documents ?? [],
      token: input.token,
    }
  }

  if (!input.packetId) {
    return { success: false as const, error: 'Invalid signing session.' }
  }

  const { user } = await requireUser()
  const { data: packet, error } = await admin
    .from('client_onboarding_packets')
    .select('*, client:clients(full_name)')
    .eq('id', input.packetId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !packet) {
    return { success: false as const, error: 'Onboarding packet not found.' }
  }

  if (packet.completed_at) {
    return { success: false as const, error: 'All documents are already signed.' }
  }

  const { data: requests } = await admin
    .from('client_document_signing_requests')
    .select('id, status, sort_order, document:coach_onboarding_documents(name, document_type)')
    .eq('packet_id', packet.id)
    .order('sort_order', { ascending: true })

  const client = Array.isArray(packet.client) ? packet.client[0] : packet.client
  const coachName = await getCoachName(await createClient(), user.id)

  return {
    success: true as const,
    mode: 'coach' as const,
    preview: {
      packetId: packet.id,
      clientId: packet.client_id,
      clientName: client?.full_name ?? 'Client',
      coachName,
      signerEmail: packet.signer_email,
      expiresAt: packet.sign_expires_at,
    },
    documents:
      requests?.map((request) => {
        const document = Array.isArray(request.document)
          ? request.document[0]
          : request.document
        return {
          request_id: request.id,
          document_name: document?.name ?? 'Document',
          document_type: document?.document_type ?? 'other',
          sort_order: request.sort_order,
          status: request.status,
        }
      }) ?? [],
    packetId: packet.id,
  }
}
