import type { SupabaseClient } from '@supabase/supabase-js'

import { createOnboardingDocumentSignedUrl } from '@/lib/onboarding-documents'
import { isOnboardingPacketComplete } from '@/lib/onboarding-signing'
import type {
  ClientDocumentSigningRequest,
  ClientOnboardingPacket,
  CoachOnboardingDocument,
  Database,
} from 'app/types/database'

export type ClientOnboardingDocumentsSummary = {
  packets: ClientOnboardingPacket[]
  requests: Array<
    ClientDocumentSigningRequest & {
      document: Pick<CoachOnboardingDocument, 'id' | 'name' | 'document_type'>
    }
  >
  signedPdfUrls: Record<string, string | null>
}

export async function fetchCoachOnboardingDocuments(
  supabase: SupabaseClient<Database>,
  coachId: string
) {
  const { data, error } = await supabase
    .from('coach_onboarding_documents')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function fetchClientOnboardingDocumentsSummary(
  supabase: SupabaseClient<Database>,
  clientId: string,
  coachId: string
): Promise<ClientOnboardingDocumentsSummary> {
  const { data: packets } = await supabase
    .from('client_onboarding_packets')
    .select('*')
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .order('requested_at', { ascending: false })

  const packetList = packets ?? []
  if (packetList.length === 0) {
    return { packets: [], requests: [], signedPdfUrls: {} }
  }

  const packetIds = packetList.map((packet) => packet.id)
  const { data: requestRows } = await supabase
    .from('client_document_signing_requests')
    .select('*, document:coach_onboarding_documents(id, name, document_type)')
    .in('packet_id', packetIds)
    .order('sort_order', { ascending: true })

  const requests =
    (requestRows ?? []).map((row) => {
      const document = Array.isArray(row.document) ? row.document[0] : row.document
      return {
        ...row,
        document: document ?? {
          id: row.document_id,
          name: 'Document',
          document_type: 'other' as const,
        },
      }
    }) ?? []

  const signedPdfUrls: Record<string, string | null> = {}
  await Promise.all(
    requests.map(async (request) => {
      if (!request.signed_pdf_storage_path) {
        signedPdfUrls[request.id] = null
        return
      }
      signedPdfUrls[request.id] = await createOnboardingDocumentSignedUrl(
        supabase,
        request.signed_pdf_storage_path
      )
    })
  )

  return {
    packets: packetList,
    requests,
    signedPdfUrls,
  }
}

export async function fetchPendingOnboardingCountsByClientId(
  supabase: SupabaseClient<Database>,
  clientIds: string[],
  coachId: string
) {
  if (clientIds.length === 0) return {} as Record<string, number>

  const { data: packets } = await supabase
    .from('client_onboarding_packets')
    .select('id, client_id, completed_at')
    .eq('coach_id', coachId)
    .in('client_id', clientIds)
    .is('completed_at', null)

  const activePackets = packets ?? []
  if (activePackets.length === 0) return {} as Record<string, number>

  const packetIds = activePackets.map((packet) => packet.id)
  const { data: requests } = await supabase
    .from('client_document_signing_requests')
    .select('packet_id, status')
    .in('packet_id', packetIds)
    .eq('status', 'pending')

  const packetClientById = new Map(
    activePackets.map((packet) => [packet.id, packet.client_id])
  )
  const counts: Record<string, number> = {}

  for (const request of requests ?? []) {
    const clientId = packetClientById.get(request.packet_id)
    if (!clientId) continue
    counts[clientId] = (counts[clientId] ?? 0) + 1
  }

  return counts
}

export function getActiveOnboardingPacket(
  packets: ClientOnboardingPacket[]
): ClientOnboardingPacket | null {
  return packets.find((packet) => !packet.completed_at) ?? null
}

export function getPacketDocumentNames(
  requests: ClientOnboardingDocumentsSummary['requests'],
  packetId: string
) {
  return requests
    .filter((request) => request.packet_id === packetId)
    .map((request) => request.document.name)
}

export function isClientOnboardingDocumentsComplete(
  requests: Pick<ClientDocumentSigningRequest, 'status'>[]
) {
  return requests.length > 0 && isOnboardingPacketComplete(requests)
}

export async function fetchClientCompletedOnboardingDocumentIds(
  supabase: SupabaseClient<Database>,
  clientId: string,
  coachId: string
) {
  const { data: packets } = await supabase
    .from('client_onboarding_packets')
    .select('id')
    .eq('client_id', clientId)
    .eq('coach_id', coachId)

  const packetIds = (packets ?? []).map((packet) => packet.id)
  if (packetIds.length === 0) return [] as string[]

  const { data: requests } = await supabase
    .from('client_document_signing_requests')
    .select('document_id, status')
    .in('packet_id', packetIds)
    .eq('status', 'signed')

  return Array.from(new Set((requests ?? []).map((request) => request.document_id)))
}
