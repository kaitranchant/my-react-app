'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'

import {
  removeCoachAvatar,
  uploadCoachAvatar,
} from '@/app/(dashboard)/settings/avatar-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  initialsFromName,
  processAvatarImage,
} from '@/lib/avatar-client'

export function CoachAvatarUpload({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function clearPreview() {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const processed = await processAvatarImage(file)
      setUploading(true)

      const formData = new FormData()
      formData.set('file', processed)
      const result = await uploadCoachAvatar(formData)
      setUploading(false)

      if (result.success) {
        clearPreview()
        setPreviewUrl(result.avatarUrl)
        toast.success('Photo updated')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      setUploading(false)
      toast.error(
        error instanceof Error ? error.message : 'Could not process image.'
      )
    }
  }

  async function handleRemove() {
    setUploading(true)
    const result = await removeCoachAvatar()
    setUploading(false)

    if (result.success) {
      clearPreview()
      setPreviewUrl(null)
      toast.success('Photo removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const displayUrl = previewUrl ?? avatarUrl ?? undefined
  const hasPhoto = Boolean(displayUrl)

  return (
    <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="group relative size-20 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Upload profile photo"
        >
          <Avatar className="size-full">
            {displayUrl && (
              <AvatarImage
                src={displayUrl}
                alt={name}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-brand text-brand-foreground text-base font-semibold">
              {initialsFromName(name || '?')}
            </AvatarFallback>
          </Avatar>
          <span className="bg-foreground/70 text-background absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-50">
            <Camera className="size-5" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-muted-foreground text-xs">
            {uploading
              ? 'Saving…'
              : 'JPG, PNG, or WebP · cropped to a square'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {hasPhoto ? 'Change photo' : 'Upload photo'}
        </Button>
        {hasPhoto && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
            className="text-muted-foreground"
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}
