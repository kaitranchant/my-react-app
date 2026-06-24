'use client'

import * as React from 'react'
import { Loader2, ScanLine } from 'lucide-react'
import { toast } from 'sonner'

import { parseCoachInbodyScanImage } from '@/app/(dashboard)/inbody/actions'
import { Button } from '@/components/ui/button'
import { processProgressPhotoImage } from '@/lib/progress-photo-client'
import { cn } from '@/lib/utils'
import type { InbodyScanFormValues } from '@/lib/validations/inbody-scan'

type InbodyScanPhotoUploadProps = {
  clientId: string
  disabled?: boolean
  onScanComplete: (values: InbodyScanFormValues) => void
}

export function InbodyScanPhotoUpload({
  clientId,
  disabled = false,
  onScanComplete,
}: InbodyScanPhotoUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || disabled || isScanning) return

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(URL.createObjectURL(file))

    try {
      setIsScanning(true)
      const processed = await processProgressPhotoImage(file)
      const formData = new FormData()
      formData.set('file', processed)

      const result = await parseCoachInbodyScanImage(clientId, formData)
      setIsScanning(false)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      onScanComplete(result.values)

      if (result.missingRequired.length > 0) {
        toast.warning(
          `Some fields could not be read: ${result.missingRequired.join(', ')}. Review and fill in any missing values.`
        )
      } else {
        toast.success('Scan read — review the values and save when ready.')
      }
    } catch (error) {
      setIsScanning(false)
      toast.error(
        error instanceof Error ? error.message : 'Could not read this image.'
      )
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled || isScanning}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isScanning}
          onClick={() => fileInputRef.current?.click()}
        >
          {isScanning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanLine className="size-4" />
          )}
          {isScanning ? 'Reading scan…' : 'Scan from photo'}
        </Button>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Upload a photo or screenshot of the InBody result sheet to pre-fill the
          form.
        </p>
      </div>

      {previewUrl && (
        <div
          className={cn(
            'relative w-full max-w-xs overflow-hidden rounded-lg border',
            isScanning && 'opacity-60'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="InBody result preview"
            className="max-h-48 w-full object-contain"
          />
        </div>
      )}
    </div>
  )
}
