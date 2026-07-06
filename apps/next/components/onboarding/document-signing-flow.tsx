'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle2, Eraser, FilePenLine } from 'lucide-react'
import { toast } from 'sonner'

import {
  completeDocumentSign,
  getSigningTemplateUrl,
} from '@/app/(dashboard)/clients/onboarding-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getNextPendingSigningRequest } from '@/lib/onboarding-signing'
import type { DocumentSigningStatus } from 'app/types/database'

const PdfDocumentViewer = dynamic(
  () =>
    import('@/components/onboarding/pdf-document-viewer').then(
      (module) => module.PdfDocumentViewer
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-muted-foreground text-sm">Loading document…</p>
    ),
  }
)

type SigningDocument = {
  request_id: string
  document_name: string
  document_type: string
  sort_order: number
  status: DocumentSigningStatus
}

type DocumentSigningFlowProps = {
  clientId: string
  preview: {
    packetId: string
    clientId: string
    clientName: string
    coachName: string
    signerEmail: string | null
    expiresAt: string | null
  }
  documents: SigningDocument[]
  token?: string
  packetId?: string
  mode: 'public' | 'coach'
  embedded?: boolean
  onComplete?: () => void
}

export function DocumentSigningFlow({
  clientId,
  preview,
  documents,
  token,
  packetId,
  mode,
  embedded = false,
  onComplete,
}: DocumentSigningFlowProps) {
  const router = useRouter()
  const signatureRef = React.useRef<SignatureCanvas | null>(null)
  const [currentRequestId, setCurrentRequestId] = React.useState(
    () => getNextPendingSigningRequest(
      documents.map((document) => ({
        id: document.request_id,
        status: document.status,
        sort_order: document.sort_order,
      }))
    )?.id ?? documents[0]?.request_id ?? ''
  )
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = React.useState(true)
  const [signerName, setSignerName] = React.useState(preview.clientName)
  const [signerEmail, setSignerEmail] = React.useState(preview.signerEmail ?? '')
  const [consent, setConsent] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [complete, setComplete] = React.useState(
    documents.every((document) => document.status === 'signed')
  )

  const currentDocument = documents.find(
    (document) => document.request_id === currentRequestId
  )
  const signedCount = documents.filter((document) => document.status === 'signed').length

  React.useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      if (!currentRequestId) return
      setLoadingPdf(true)
      const result = await getSigningTemplateUrl({
        token,
        packetId,
        requestId: currentRequestId,
      })
      if (cancelled) return

      if (!result.success) {
        setPdfUrl(null)
        toast.error(result.error)
      } else {
        setPdfUrl(result.signedUrl)
      }
      setLoadingPdf(false)
    }

    void loadPdf()
    return () => {
      cancelled = true
    }
  }, [currentRequestId, packetId, token])

  async function handleSubmit() {
    if (!currentRequestId || !currentDocument) return

    if (!consent) {
      toast.error('Please confirm you agree to sign this document.')
      return
    }

    if (!signerName.trim()) {
      toast.error('Enter your full name.')
      return
    }

    if (mode === 'public' && preview.signerEmail && !signerEmail.trim()) {
      toast.error('Enter your email address.')
      return
    }

    if (signatureRef.current?.isEmpty()) {
      toast.error('Draw your signature before submitting.')
      return
    }

    const signatureDataUrl = signatureRef.current?.toDataURL('image/png')
    if (!signatureDataUrl) {
      toast.error('Could not capture signature.')
      return
    }

    setPending(true)
    const result = await completeDocumentSign({
      values: {
        token,
        packetId,
        requestId: currentRequestId,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        consent: true,
      },
      signatureDataUrl,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    signatureRef.current?.clear()
    setConsent(false)

    if (result.complete) {
      setComplete(true)
      toast.success('All documents signed. Thank you!')
      if (!onComplete && mode === 'coach') {
        router.push(`/clients/${clientId}`)
      }
      return
    }

    toast.success(`${currentDocument.document_name} signed.`)

    if (result.nextRequestId) {
      setCurrentRequestId(result.nextRequestId)
    } else {
      setComplete(true)
    }

    router.refresh()
  }

  if (complete) {
    return (
      <div
        className={
          embedded
            ? 'flex flex-col items-center gap-4 rounded-lg border p-6 text-center'
            : 'mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-card'
        }
      >
        <CheckCircle2 className="text-brand size-12" />
        <div className="space-y-2">
          <h1 className={embedded ? 'text-lg font-semibold' : 'text-xl font-semibold'}>
            Documents complete
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'coach'
              ? `${preview.clientName} has signed all onboarding documents.`
              : 'Thank you. Your coach has been notified.'}
          </p>
        </div>
        {onComplete ? (
          <Button onClick={onComplete}>Done</Button>
        ) : mode === 'coach' ? (
          <Button onClick={() => router.push(`/clients/${clientId}`)}>Back to client</Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={
        embedded
          ? 'flex flex-col gap-4'
          : 'mx-auto flex max-w-3xl flex-col gap-6'
      }
    >
      <div className="space-y-2">
        {!embedded ? (
          <p className="text-muted-foreground text-sm">Onboarding documents</p>
        ) : null}
        <h2 className={embedded ? 'text-lg font-semibold' : 'page-title'}>
          Sign documents for {preview.clientName}
        </h2>
        <p className="helper-text">
          From {preview.coachName}. Document {signedCount + 1} of {documents.length}
          {currentDocument ? `: ${currentDocument.document_name}` : ''}
        </p>
      </div>

      <div className={embedded ? 'rounded-lg border p-3' : 'rounded-2xl border bg-card p-4 shadow-card sm:p-6'}>
        {loadingPdf || !pdfUrl ? (
          <p className="text-muted-foreground text-sm">Loading document…</p>
        ) : (
          <PdfDocumentViewer fileUrl={pdfUrl} />
        )}
      </div>

      <div className={embedded ? 'rounded-lg border p-3' : 'rounded-2xl border bg-card p-4 shadow-card sm:p-6'}>
        <div className="mb-4 flex items-center gap-2">
          <FilePenLine className="size-4" />
          <h2 className="font-medium">Signature</h2>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="signer-name">Full name</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
              />
            </div>
            {mode === 'public' && preview.signerEmail ? (
              <div className="grid gap-2">
                <Label htmlFor="signer-email">Email</Label>
                <Input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(event) => setSignerEmail(event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Draw your signature</Label>
            <div className="overflow-hidden rounded-md border bg-white">
              <SignatureCanvas
                ref={signatureRef}
                penColor="#111827"
                canvasProps={{
                  className: 'h-40 w-full touch-none',
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => signatureRef.current?.clear()}
            >
              <Eraser className="size-4" />
              Clear signature
            </Button>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I have read this document and agree to sign it electronically. I
              understand my signature will be added to the PDF.
            </span>
          </label>

          <Button variant="brand" disabled={pending} onClick={() => void handleSubmit()}>
            Sign document
          </Button>
        </div>
      </div>
    </div>
  )
}
