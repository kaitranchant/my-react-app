'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ExternalLink, Eye, FileText, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteCoachOnboardingDocument,
  updateCoachOnboardingDocument,
} from '@/app/(dashboard)/settings/onboarding-document-actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ONBOARDING_PDF_ACCEPT,
  ONBOARDING_PDF_MAX_BYTES,
  ONBOARDING_PDF_UPLOAD_HINT,
  onboardingDocumentTypeLabels,
} from '@/lib/onboarding-documents'
import type { CoachOnboardingDocument } from 'app/types/database'
import type { OnboardingDocumentType } from 'app/types/database'

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

type DocumentPreview = {
  id: string
  name: string
  url: string
}

type OnboardingDocumentTemplatesSettingsProps = {
  documents: CoachOnboardingDocument[]
}

export function OnboardingDocumentTemplatesSettings({
  documents: initialDocuments,
}: OnboardingDocumentTemplatesSettingsProps) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = React.useState(initialDocuments)
  const [uploadPending, setUploadPending] = React.useState(false)
  const [name, setName] = React.useState('')
  const [documentType, setDocumentType] =
    React.useState<OnboardingDocumentType>('par_q')
  const [preview, setPreview] = React.useState<DocumentPreview | null>(null)
  const [previewPendingId, setPreviewPendingId] = React.useState<string | null>(
    null
  )
  const previewRequestRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  async function handleUpload(file: File) {
    if (!name.trim()) {
      toast.error('Enter a document name before uploading.')
      return
    }

    if (file.size > ONBOARDING_PDF_MAX_BYTES) {
      toast.error('PDF must be under 10 MB.')
      return
    }

    setUploadPending(true)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('name', name.trim())
    formData.set('documentType', documentType)
    formData.set('isDefault', 'true')

    try {
      const response = await fetch('/api/onboarding-documents/upload', {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as
        | { success: true }
        | { success: false; error: string }

      if (!response.ok || !result.success) {
        toast.error('error' in result ? result.error : 'Failed to upload PDF.')
        return
      }

      toast.success('Document uploaded.')
      setName('')
      router.refresh()
    } catch {
      toast.error('Failed to upload PDF. Please try again.')
    } finally {
      setUploadPending(false)
    }
  }

  async function handleDelete(documentId: string) {
    const result = await deleteCoachOnboardingDocument(documentId)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Document deleted.')
    router.refresh()
  }

  async function handleRename(
    documentId: string,
    nextName: string,
    nextType: OnboardingDocumentType
  ) {
    const result = await updateCoachOnboardingDocument(documentId, {
      name: nextName,
      documentType: nextType,
      isDefault: true,
    })

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Document updated.')
    router.refresh()
  }

  async function openDocumentPreview(document: CoachOnboardingDocument) {
    if (previewRequestRef.current === document.id) return

    previewRequestRef.current = document.id
    setPreviewPendingId(document.id)

    try {
      const response = await fetch(`/api/onboarding-documents/${document.id}/url`)
      const result = (await response.json()) as
        | { success: true; url: string }
        | { success: false; error: string }

      if (!response.ok || !result.success) {
        toast.error('error' in result ? result.error : 'Could not open document.')
        return
      }

      setPreview({
        id: document.id,
        name: document.name,
        url: result.url,
      })
    } catch {
      toast.error('Could not open document.')
    } finally {
      if (previewRequestRef.current === document.id) {
        previewRequestRef.current = null
      }
      setPreviewPendingId((current) => (current === document.id ? null : current))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          Onboarding documents
        </CardTitle>
        <CardDescription>
          Upload PDF templates such as PAR-Q and liability waivers. Use them when
          onboarding clients from the Users list.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 rounded-lg border p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="onboarding-doc-name">Document name</Label>
              <Input
                id="onboarding-doc-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="PAR-Q"
              />
            </div>
            <div className="grid gap-2">
              <Label>Document type</Label>
              <Select
                value={documentType}
                onValueChange={(value) =>
                  setDocumentType(value as OnboardingDocumentType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="par_q">PAR-Q</SelectItem>
                  <SelectItem value="liability">Liability waiver</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ONBOARDING_PDF_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleUpload(file)
                event.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Upload PDF
            </Button>
            <p className="helper-text">{ONBOARDING_PDF_UPLOAD_HINT}</p>
          </div>
        </div>

        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No documents uploaded yet. Add your PAR-Q and liability waiver PDFs to
            start onboarding clients.
          </p>
        ) : (
          <div className="grid gap-3">
            {documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                viewPending={previewPendingId === document.id}
                onView={() => void openDocumentPreview(document)}
                onDelete={() => void handleDelete(document.id)}
                onSave={(nextName, nextType) =>
                  void handleRename(document.id, nextName, nextType)
                }
              />
            ))}
          </div>
        )}
      </CardContent>

      <Sheet
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div className="space-y-1">
                <SheetTitle>{preview?.name ?? 'Document preview'}</SheetTitle>
                <SheetDescription>Uploaded onboarding template</SheetDescription>
              </div>
              {preview ? (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open in new tab
                  </a>
                </Button>
              ) : null}
            </div>
          </SheetHeader>
          <div className="px-4 pb-4">
            {preview ? <PdfDocumentViewer fileUrl={preview.url} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

function DocumentRow({
  document,
  viewPending,
  onView,
  onDelete,
  onSave,
}: {
  document: CoachOnboardingDocument
  viewPending: boolean
  onView: () => void
  onDelete: () => void
  onSave: (name: string, type: OnboardingDocumentType) => void
}) {
  const [name, setName] = React.useState(document.name)
  const [documentType, setDocumentType] = React.useState(document.document_type)

  React.useEffect(() => {
    setName(document.name)
    setDocumentType(document.document_type)
  }, [document])

  const dirty =
    name.trim() !== document.name || documentType !== document.document_type

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select
            value={documentType}
            onValueChange={(value) =>
              setDocumentType(value as OnboardingDocumentType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="par_q">PAR-Q</SelectItem>
              <SelectItem value="liability">Liability waiver</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground hidden text-xs sm:inline">
          {onboardingDocumentTypeLabels[document.document_type]}
        </span>
        {dirty ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSave(name.trim(), documentType)}
          >
            Save
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={viewPending}
          onClick={onView}
        >
          <Eye className="size-4" />
          {viewPending ? 'Opening…' : 'View'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
