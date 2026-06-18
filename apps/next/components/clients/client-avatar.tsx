'use client'

import * as React from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'

import { uploadClientAvatar, uploadMyClientAvatar } from '@/app/(dashboard)/clients/avatar-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  fileToPreviewUrl,
  initialsFromName,
  processAvatarImage,
} from '@/lib/avatar-client'

type ClientAvatarUploadProps = {
  name: string
  avatarUrl?: string | null
  clientId?: string
  onPendingFile?: (file: File | null) => void
  onUploaded?: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  forClientPortal?: boolean
}

const sizeClasses = {
  sm: 'size-10 text-xs',
  md: 'size-14 text-sm',
  lg: 'size-20 text-base',
} as const

export function ClientAvatarUpload({
  name,
  avatarUrl,
  clientId,
  onPendingFile,
  onUploaded,
  size = 'md',
  disabled = false,
  className,
  forClientPortal = false,
}: ClientAvatarUploadProps) {
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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const processed = await processAvatarImage(file)

      if (forClientPortal) {
        setUploading(true)
        const formData = new FormData()
        formData.set('file', processed)
        const result = await uploadMyClientAvatar(formData)
        setUploading(false)

        if (result.success) {
          setPreviewUrl(result.avatarUrl)
          onUploaded?.(result.avatarUrl)
          toast.success('Photo updated')
        } else {
          toast.error(result.error)
        }
      } else if (clientId) {
        setUploading(true)
        const formData = new FormData()
        formData.set('file', processed)
        const result = await uploadClientAvatar(clientId, formData)
        setUploading(false)

        if (result.success) {
          setPreviewUrl(result.avatarUrl)
          onUploaded?.(result.avatarUrl)
          toast.success('Photo updated')
        } else {
          toast.error(result.error)
        }
      } else {
        if (previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl)
        }
        const url = await fileToPreviewUrl(processed)
        setPreviewUrl(url)
        onPendingFile?.(processed)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not process image.'
      )
    }
  }

  const displayUrl = previewUrl ?? avatarUrl ?? undefined

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          sizeClasses[size]
        )}
        aria-label="Change profile photo"
      >
        <Avatar className={cn('size-full', sizeClasses[size])}>
          {displayUrl && (
            <AvatarImage src={displayUrl} alt={name} className="object-cover" />
          )}
          <AvatarFallback className="bg-brand text-brand-foreground font-semibold">
            {initialsFromName(name || '?')}
          </AvatarFallback>
        </Avatar>
        <span className="bg-foreground/70 text-background absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-0">
          <Camera className="size-4" />
        </span>
      </button>
      <div className="min-w-0">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-muted-foreground text-xs">
          {uploading ? 'Uploading…' : 'Optional · 128px circle'}
        </p>
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

export function ClientAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
}: {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
      )}
      <AvatarFallback className="bg-brand text-brand-foreground font-semibold">
        {initialsFromName(name || '?')}
      </AvatarFallback>
    </Avatar>
  )
}
