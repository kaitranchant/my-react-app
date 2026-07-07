'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Download,
  Mail,
  TabletSmartphone,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createOnboardingPacket,
  fetchClientOnboardingCompletion,
  fetchOnboardingTemplatesForCoach,
  getOnboardingSignLink,
  resendOnboardingDocumentsEmail,
} from '@/app/(dashboard)/clients/onboarding-actions'
import { OnboardingDocumentsStep } from '@/components/clients/onboarding-documents-step'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { buildOnboardingInPersonSignUrl } from '@/lib/invite'
import { formatOnboardingSignDate } from '@/lib/onboarding-signing'
import type { ClientOnboardingDocumentsSummary } from '@/lib/onboarding-data'
import { getActiveOnboardingPacket } from '@/lib/onboarding-data'
import { getDefaultOnboardingDocumentSelections, onboardingDocumentTypeLabels } from '@/lib/onboarding-documents'
import type { CoachOnboardingDocument } from 'app/types/database'

type ClientOnboardingDocumentsPanelProps = {
  clientId: string
  clientName: string
  clientEmail?: string | null
  summary: ClientOnboardingDocumentsSummary
}

export function ClientOnboardingDocumentsPanel({
  clientId,
  clientName,
  clientEmail = null,
  summary,
}: ClientOnboardingDocumentsPanelProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = React.useState<string | null>(null)
  const [documentsPending, setDocumentsPending] = React.useState(false)
  const [loadingDocuments, setLoadingDocuments] = React.useState(true)
  const [documents, setDocuments] = React.useState<CoachOnboardingDocument[]>([])
  const [completedDocumentIds, setCompletedDocumentIds] = React.useState<string[]>(
    []
  )
  const [selectedFillDocumentIds, setSelectedFillDocumentIds] = React.useState<
    string[]
  >([])
  const [selectedSignatureDocumentIds, setSelectedSignatureDocumentIds] =
    React.useState<string[]>([])
  const [deliveryMethod, setDeliveryMethod] = React.useState<'email' | 'in_person'>(
    'in_person'
  )

  const activePacket = getActiveOnboardingPacket(summary.packets)
  const latestRequests = summary.requests
  const hasHistory = latestRequests.length > 0

  React.useEffect(() => {
    let cancelled = false
    setLoadingDocuments(true)

    Promise.all([
      fetchOnboardingTemplatesForCoach(),
      fetchClientOnboardingCompletion(clientId),
    ])
      .then(([documentRows, completion]) => {
        if (cancelled) return
        setDocuments(documentRows)
        setCompletedDocumentIds(completion.completedDocumentIds)
        const defaults = getDefaultOnboardingDocumentSelections(documentRows)
        setSelectedFillDocumentIds(defaults.fillIds)
        setSelectedSignatureDocumentIds(defaults.signatureIds)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Could not load document templates.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDocuments(false)
      })

    return () => {
      cancelled = true
    }
  }, [clientId])

  async function refreshDocumentsState() {
    const completion = await fetchClientOnboardingCompletion(clientId)
    setCompletedDocumentIds(completion.completedDocumentIds)
    router.refresh()
  }

  function getPendingSignatureDocumentIds() {
    return selectedSignatureDocumentIds.filter(
      (documentId) => !completedDocumentIds.includes(documentId)
    )
  }

  async function startSignatureCollection(method: 'email' | 'in_person') {
    const signatureDocumentIds = getPendingSignatureDocumentIds()
    if (signatureDocumentIds.length === 0) {
      toast.error('Select at least one document that still needs a signature.')
      return
    }

    if (method === 'email' && !clientEmail?.trim()) {
      toast.error('Add an email address before sending documents by email.')
      return
    }

    setDocumentsPending(true)
    const result = await createOnboardingPacket({
      clientId,
      documentIds: signatureDocumentIds,
      deliveryMethod: method,
      signerEmail: method === 'email' ? clientEmail!.trim() : undefined,
    })
    setDocumentsPending(false)

    if (!result.success) {
      toast.error(result.error)
      if (result.signUrl) {
        await navigator.clipboard.writeText(result.signUrl)
        toast.message('Sign link copied to clipboard.')
      }
      return
    }

    if (method === 'email') {
      toast.success(`Documents sent to ${clientName}.`)
      void refreshDocumentsState()
      return
    }

    router.push(buildOnboardingInPersonSignUrl(clientId, result.packetId))
  }

  async function copySignLink(packetId: string) {
    setPendingAction(`copy-${packetId}`)
    const result = await getOnboardingSignLink(packetId)
    setPendingAction(null)

    if (!result.success) {
      toast.error('error' in result ? result.error : 'Could not get sign link.')
      return
    }

    if (!result.signUrl) {
      toast.error('Sign link is not available.')
      return
    }

    await navigator.clipboard.writeText(result.signUrl)
    toast.success('Sign link copied.')
  }

  async function resendEmail(packetId: string) {
    setPendingAction(`resend-${packetId}`)
    const result = await resendOnboardingDocumentsEmail(packetId)
    setPendingAction(null)

    if (!result.success) {
      toast.error(result.error)
      if (result.signUrl) {
        await navigator.clipboard.writeText(result.signUrl)
        toast.message('Sign link copied to clipboard.')
      }
      return
    }

    toast.success(`Documents resent to ${clientName}.`)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      {loadingDocuments ? (
        <p className="text-muted-foreground text-sm">Loading document templates…</p>
      ) : (
        <OnboardingDocumentsStep
          clientId={clientId}
          clientName={clientName}
          clientEmail={clientEmail}
          documents={documents}
          completedDocumentIds={completedDocumentIds}
          selectedFillIds={selectedFillDocumentIds}
          selectedSignatureIds={selectedSignatureDocumentIds}
          onToggleFill={(documentId, checked) =>
            setSelectedFillDocumentIds((current) =>
              checked
                ? [...current, documentId]
                : current.filter((id) => id !== documentId)
            )
          }
          onToggleSignature={(documentId, checked) =>
            setSelectedSignatureDocumentIds((current) =>
              checked
                ? [...current, documentId]
                : current.filter((id) => id !== documentId)
            )
          }
          deliveryMethod={deliveryMethod}
          onDeliveryMethodChange={setDeliveryMethod}
          onCompletedUpload={() => void refreshDocumentsState()}
          onStartInPersonSigning={() => void startSignatureCollection('in_person')}
          onSendEmail={() => void startSignatureCollection('email')}
          pending={documentsPending}
        />
      )}

      {hasHistory ? (
        <div className="grid gap-4 border-t pt-4">
          <h3 className="text-sm font-semibold">Document history</h3>

          {activePacket ? (
            <div className="bg-muted/40 flex flex-col gap-3 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Active signing packet</p>
                <p className="text-muted-foreground">
                  Requested {formatOnboardingSignDate(activePacket.requested_at)}
                  {activePacket.signer_email ? ` · ${activePacket.signer_email}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={buildOnboardingInPersonSignUrl(clientId, activePacket.id)}>
                    <TabletSmartphone className="size-4" />
                    Sign in person
                  </Link>
                </Button>
                {activePacket.signer_email ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingAction === `resend-${activePacket.id}`}
                    onClick={() => void resendEmail(activePacket.id)}
                  >
                    <Mail className="size-4" />
                    Resend email
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendingAction === `copy-${activePacket.id}`}
                  onClick={() => void copySignLink(activePacket.id)}
                >
                  <Copy className="size-4" />
                  Copy link
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            {latestRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{request.document.name}</p>
                    <Badge variant="secondary">
                      {onboardingDocumentTypeLabels[request.document.document_type]}
                    </Badge>
                    <Badge variant={request.status === 'signed' ? 'success' : 'warning'}>
                      {request.status === 'signed' ? 'Signed' : 'Pending'}
                    </Badge>
                  </div>
                  {request.signed_at ? (
                    <p className="text-muted-foreground text-xs">
                      Signed {formatOnboardingSignDate(request.signed_at)}
                      {request.signer_name ? ` by ${request.signer_name}` : ''}
                    </p>
                  ) : null}
                </div>
                {request.signed_pdf_storage_path && summary.signedPdfUrls[request.id] ? (
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={summary.signedPdfUrls[request.id]!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="size-4" />
                      Download
                    </a>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
