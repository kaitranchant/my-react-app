import type {
  ClientDocumentSigningRequest,
  ClientOnboardingPacket,
  DocumentSigningStatus,
} from 'app/types/database'

export type OnboardingSignPreview = {
  packetId: string
  clientName: string
  coachName: string
  signerEmail: string | null
  deliveryMethod: ClientOnboardingPacket['delivery_method']
  expiresAt: string | null
}

export type OnboardingSignDocument = {
  requestId: string
  documentName: string
  documentType: string
  sortOrder: number
  status: DocumentSigningStatus
}

export type ClientOnboardingDocumentStatus = {
  request: ClientDocumentSigningRequest
  documentName: string
  documentType: string
  signedPdfUrl: string | null
}

export function isOnboardingPacketComplete(
  requests: Pick<ClientDocumentSigningRequest, 'status'>[]
) {
  return requests.length > 0 && requests.every((request) => request.status === 'signed')
}

export function countPendingOnboardingDocuments(
  requests: Pick<ClientDocumentSigningRequest, 'status'>[]
) {
  return requests.filter((request) => request.status === 'pending').length
}

export function summarizeClientOnboardingDocuments(
  requests: Pick<ClientDocumentSigningRequest, 'status'>[]
): 'none' | 'pending' | 'complete' {
  if (requests.length === 0) return 'none'
  if (isOnboardingPacketComplete(requests)) return 'complete'
  return 'pending'
}

export function getNextPendingSigningRequest<
  T extends Pick<ClientDocumentSigningRequest, 'id' | 'status' | 'sort_order'>
>(requests: T[]) {
  return (
    [...requests]
      .filter((request) => request.status === 'pending')
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
  )
}

export function formatOnboardingSignDate(value: string | null | undefined) {
  if (!value) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function normalizeSignerEmail(email: string) {
  return email.trim().toLowerCase()
}

export function signerEmailMatchesPacket(
  packetEmail: string | null | undefined,
  signerEmail: string
) {
  if (!packetEmail) return true
  return normalizeSignerEmail(packetEmail) === normalizeSignerEmail(signerEmail)
}
