'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Check,
  ExternalLink,
  FilePenLine,
  FileUp,
  Mail,
  TabletSmartphone,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  ONBOARDING_PDF_ACCEPT,
  onboardingDocumentTypeLabels,
  partitionOnboardingDocuments,
} from '@/lib/onboarding-documents'
import type { CoachOnboardingDocument } from 'app/types/database'

type OnboardingDocumentsStepProps = {
  clientId: string | null
  clientName: string
  clientEmail: string | null
  documents: CoachOnboardingDocument[]
  completedDocumentIds: string[]
  selectedFillIds: string[]
  selectedSignatureIds: string[]
  onToggleFill: (documentId: string, checked: boolean) => void
  onToggleSignature: (documentId: string, checked: boolean) => void
  deliveryMethod: 'email' | 'in_person'
  onDeliveryMethodChange: (method: 'email' | 'in_person') => void
  onCompletedUpload: () => void
  onStartInPersonSigning: () => void
  onSendEmail: () => void
  pending?: boolean
}

type UploadTarget = {
  documentId: string
  label: string
}

async function uploadCompletedDocument(input: {
  clientId: string
  documentId: string
  file: File
  signerName?: string
}) {
  const formData = new FormData()
  formData.set('file', input.file)
  formData.set('clientId', input.clientId)
  formData.set('documentId', input.documentId)
  if (input.signerName) {
    formData.set('signerName', input.signerName)
  }

  const response = await fetch('/api/onboarding-documents/client-upload', {
    method: 'POST',
    body: formData,
  })

  const result = (await response.json()) as
    | { success: true }
    | { success: false; error: string }

  if (!response.ok || !result.success) {
    throw new Error('error' in result ? result.error : 'Upload failed.')
  }
}

function OnboardingDocumentRow({
  document,
  checked,
  completed,
  disabled,
  uploadLabel,
  onToggle,
  onUpload,
  uploading,
}: {
  document: CoachOnboardingDocument
  checked: boolean
  completed: boolean
  disabled?: boolean
  uploadLabel: string
  onToggle: (checked: boolean) => void
  onUpload: () => void
  uploading?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <label className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={completed || disabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{document.name}</span>
            {completed ? (
              <Badge variant="success" className="gap-1">
                <Check className="size-3" />
                On file
              </Badge>
            ) : null}
          </span>
          <span className="text-muted-foreground block text-xs">
            {onboardingDocumentTypeLabels[document.document_type]}
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <a
            href={`/api/onboarding-documents/${document.id}/view`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="size-4" />
            Open
          </a>
        </Button>
        {!completed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={disabled || uploading}
            onClick={onUpload}
          >
            <Upload className="size-4" />
            {uploading ? 'Uploading…' : uploadLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function SectionUploadButton({
  clientId,
  targets,
  uploadLabel,
  onUploaded,
  disabled,
}: {
  clientId: string | null
  targets: UploadTarget[]
  uploadLabel: string
  onUploaded: () => void
  disabled?: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [selectedDocumentId, setSelectedDocumentId] = React.useState(
    () => targets[0]?.documentId ?? ''
  )
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    if (!targets.some((target) => target.documentId === selectedDocumentId)) {
      setSelectedDocumentId(targets[0]?.documentId ?? '')
    }
  }, [selectedDocumentId, targets])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !clientId || !selectedDocumentId) return

    setUploading(true)
    try {
      await uploadCompletedDocument({
        clientId,
        documentId: selectedDocumentId,
        file,
      })
      toast.success('Document uploaded.')
      onUploaded()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (targets.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-2">
        <Label className="text-xs">{uploadLabel}</Label>
        <Select
          value={selectedDocumentId}
          onValueChange={setSelectedDocumentId}
          disabled={disabled || uploading || !clientId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose document" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((target) => (
              <SelectItem key={target.documentId} value={target.documentId}>
                {target.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        disabled={disabled || uploading || !clientId || !selectedDocumentId}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileUp className="size-4" />
        {uploading ? 'Uploading…' : 'Choose PDF'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ONBOARDING_PDF_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
    </div>
  )
}

export function OnboardingDocumentsStep({
  clientId,
  clientName,
  clientEmail,
  documents,
  completedDocumentIds,
  selectedFillIds,
  selectedSignatureIds,
  onToggleFill,
  onToggleSignature,
  deliveryMethod,
  onDeliveryMethodChange,
  onCompletedUpload,
  onStartInPersonSigning,
  onSendEmail,
  pending = false,
}: OnboardingDocumentsStepProps) {
  const [uploadingDocumentId, setUploadingDocumentId] = React.useState<string | null>(
    null
  )
  const completedSet = React.useMemo(
    () => new Set(completedDocumentIds),
    [completedDocumentIds]
  )
  const { fillDocuments, signatureDocuments } = partitionOnboardingDocuments(documents)
  const uploadsDisabled = !clientId || pending

  const incompleteFillTargets = fillDocuments
    .filter((document) => !completedSet.has(document.id))
    .map((document) => ({ documentId: document.id, label: document.name }))

  const incompleteSignatureTargets = signatureDocuments
    .filter((document) => !completedSet.has(document.id))
    .map((document) => ({ documentId: document.id, label: document.name }))

  const selectedSignatureCount = selectedSignatureIds.filter(
    (id) => !completedSet.has(id)
  ).length

  async function handleRowUpload(documentId: string) {
    if (!clientId) {
      toast.error('Save client details before uploading documents.')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ONBOARDING_PDF_ACCEPT
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      setUploadingDocumentId(documentId)
      try {
        await uploadCompletedDocument({ clientId, documentId, file })
        toast.success('Document uploaded.')
        onCompletedUpload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Upload failed.')
      } finally {
        setUploadingDocumentId(null)
      }
    }
    input.click()
  }

  if (documents.length === 0) {
    return (
      <div className="grid gap-3 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          No document templates yet. Upload PAR-Q and liability PDFs in Settings, or
          finish now to create the client and send documents later.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/settings#onboarding">Upload document templates</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {!clientId ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          Save client details first to upload completed documents or start signing.
        </p>
      ) : null}

      {fillDocuments.length > 0 ? (
        <section className="grid gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileUp className="text-muted-foreground size-4" />
              <h3 className="text-sm font-semibold">Fill & upload</h3>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Open each form in a new tab, fill it out, then upload the completed PDF.
              You can also upload forms that were already filled out elsewhere.
            </p>
          </div>

          <div className="grid gap-2">
            {fillDocuments.map((document) => (
              <OnboardingDocumentRow
                key={document.id}
                document={document}
                checked={selectedFillIds.includes(document.id)}
                completed={completedSet.has(document.id)}
                disabled={uploadsDisabled}
                uploadLabel="Upload filled"
                uploading={uploadingDocumentId === document.id}
                onToggle={(checked) => onToggleFill(document.id, checked)}
                onUpload={() => void handleRowUpload(document.id)}
              />
            ))}
          </div>

          <SectionUploadButton
            clientId={clientId}
            targets={incompleteFillTargets}
            uploadLabel="Upload an already-filled form"
            onUploaded={onCompletedUpload}
            disabled={uploadsDisabled}
          />
        </section>
      ) : null}

      {signatureDocuments.length > 0 ? (
        <section className="grid gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FilePenLine className="text-muted-foreground size-4" />
              <h3 className="text-sm font-semibold">Collect signatures</h3>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sign in the app with your client, send a link by email, or upload a PDF
              that was already signed.
            </p>
          </div>

          <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
            <p>
              <span className="font-medium">{clientName || 'Client'}</span>
              {clientEmail ? ` · ${clientEmail}` : ''}
            </p>
            {selectedSignatureCount > 0 ? (
              <p className="text-muted-foreground mt-1">
                {selectedSignatureCount} document
                {selectedSignatureCount === 1 ? '' : 's'} selected for signing
              </p>
            ) : (
              <p className="text-muted-foreground mt-1">
                Select documents below to sign in person or send by email.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            {signatureDocuments.map((document) => (
              <OnboardingDocumentRow
                key={document.id}
                document={document}
                checked={selectedSignatureIds.includes(document.id)}
                completed={completedSet.has(document.id)}
                disabled={uploadsDisabled}
                uploadLabel="Upload signed"
                uploading={uploadingDocumentId === document.id}
                onToggle={(checked) => onToggleSignature(document.id, checked)}
                onUpload={() => void handleRowUpload(document.id)}
              />
            ))}
          </div>

          <SectionUploadButton
            clientId={clientId}
            targets={incompleteSignatureTargets}
            uploadLabel="Upload an already-signed document"
            onUploaded={onCompletedUpload}
            disabled={uploadsDisabled}
          />

          {selectedSignatureCount > 0 ? (
            <div className="grid gap-2">
              <Label>How should they sign?</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={deliveryMethod === 'in_person' ? 'brand' : 'outline'}
                  disabled={pending || !clientId}
                  onClick={() => onDeliveryMethodChange('in_person')}
                >
                  <TabletSmartphone className="size-4" />
                  Sign in person
                </Button>
                <Button
                  type="button"
                  variant={deliveryMethod === 'email' ? 'brand' : 'outline'}
                  disabled={pending || !clientId}
                  onClick={() => onDeliveryMethodChange('email')}
                >
                  <Mail className="size-4" />
                  Email link
                </Button>
              </div>
              <Button
                type="button"
                variant="brand"
                className="w-fit"
                disabled={pending || !clientId}
                onClick={
                  deliveryMethod === 'email' ? onSendEmail : onStartInPersonSigning
                }
              >
                {deliveryMethod === 'email' ? (
                  <>
                    <Mail className="size-4" />
                    Send documents
                  </>
                ) : (
                  <>
                    <TabletSmartphone className="size-4" />
                    Start signing
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
