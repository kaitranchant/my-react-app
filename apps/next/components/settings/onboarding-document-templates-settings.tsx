'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteCoachOnboardingDocument,
  updateCoachOnboardingDocument,
  uploadCoachOnboardingDocument,
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
  ONBOARDING_PDF_ACCEPT,
  ONBOARDING_PDF_UPLOAD_HINT,
  onboardingDocumentTypeLabels,
} from '@/lib/onboarding-documents'
import type { CoachOnboardingDocument } from 'app/types/database'
import type { OnboardingDocumentType } from 'app/types/database'

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

  React.useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  async function handleUpload(file: File) {
    if (!name.trim()) {
      toast.error('Enter a document name before uploading.')
      return
    }

    setUploadPending(true)
    const formData = new FormData()
    formData.set('file', file)

    const result = await uploadCoachOnboardingDocument(formData, {
      name: name.trim(),
      documentType,
      isDefault: true,
    })
    setUploadPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Document uploaded.')
    setName('')
    router.refresh()
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
                onDelete={() => void handleDelete(document.id)}
                onSave={(nextName, nextType) =>
                  void handleRename(document.id, nextName, nextType)
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DocumentRow({
  document,
  onDelete,
  onSave,
}: {
  document: CoachOnboardingDocument
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
        <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
