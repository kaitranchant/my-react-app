'use client'

import * as React from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'

import {
  setClientAvatarPreset,
  uploadClientAvatar,
  uploadMyClientAvatar,
  setMyClientAvatarPreset,
} from '@/app/(dashboard)/clients/avatar-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  CLIENT_AVATAR_PRESETS,
  getClientAvatarPreset,
  parseClientAvatarPreset,
  type ClientAvatarPresetId,
} from '@/lib/client-avatar-presets'
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
  onPendingPreset?: (presetId: ClientAvatarPresetId | null) => void
  selectedPresetId?: ClientAvatarPresetId | null
  onUploaded?: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  forClientPortal?: boolean
  showPresetPicker?: boolean
}

const sizeClasses = {
  sm: 'size-10 text-xs',
  md: 'size-14 text-sm',
  lg: 'size-20 text-base',
} as const

const presetIconSizes = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-7',
} as const

const presetButtonSizes = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-10',
} as const

function PresetAvatarContent({
  presetId,
  name,
  size,
}: {
  presetId: ClientAvatarPresetId
  name: string
  size: 'sm' | 'md' | 'lg'
}) {
  const preset = getClientAvatarPreset(presetId)
  if (!preset) return null
  const Icon = preset.icon

  return (
    <AvatarFallback className={cn('font-semibold', preset.className)}>
      <Icon className={presetIconSizes[size]} aria-hidden />
      <span className="sr-only">{preset.label} avatar for {name}</span>
    </AvatarFallback>
  )
}

export function ClientAvatarUpload({
  name,
  avatarUrl,
  clientId,
  onPendingFile,
  onPendingPreset,
  selectedPresetId = null,
  onUploaded,
  size = 'md',
  disabled = false,
  className,
  forClientPortal = false,
  showPresetPicker = true,
}: ClientAvatarUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [localPresetId, setLocalPresetId] =
    React.useState<ClientAvatarPresetId | null>(selectedPresetId)

  const savedPresetId = parseClientAvatarPreset(avatarUrl)
  const activePresetId =
    localPresetId ?? selectedPresetId ?? savedPresetId ?? null

  React.useEffect(() => {
    setLocalPresetId(selectedPresetId)
  }, [selectedPresetId])

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

  async function handlePresetSelect(presetId: ClientAvatarPresetId) {
    const next = activePresetId === presetId ? null : presetId
    clearPreview()
    onPendingFile?.(null)
    setLocalPresetId(next)
    onPendingPreset?.(next)

    if (forClientPortal) {
      setUploading(true)
      const result = await setMyClientAvatarPreset(next)
      setUploading(false)
      if (result.success) {
        onUploaded?.(result.avatarUrl)
        toast.success(next ? 'Icon updated' : 'Icon removed')
      } else {
        toast.error(result.error)
        setLocalPresetId(savedPresetId)
        onPendingPreset?.(savedPresetId)
      }
      return
    }

    if (!clientId) return

    setUploading(true)
    const result = await setClientAvatarPreset(clientId, next)
    setUploading(false)
    if (result.success) {
      onUploaded?.(result.avatarUrl)
      toast.success(next ? 'Icon updated' : 'Icon removed')
    } else {
      toast.error(result.error)
      setLocalPresetId(savedPresetId)
      onPendingPreset?.(savedPresetId)
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const processed = await processAvatarImage(file)
      setLocalPresetId(null)
      onPendingPreset?.(null)

      if (forClientPortal) {
        setUploading(true)
        const formData = new FormData()
        formData.set('file', processed)
        const result = await uploadMyClientAvatar(formData)
        setUploading(false)

        if (result.success) {
          clearPreview()
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
          clearPreview()
          setPreviewUrl(result.avatarUrl)
          onUploaded?.(result.avatarUrl)
          toast.success('Photo updated')
        } else {
          toast.error(result.error)
        }
      } else {
        clearPreview()
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

  const displayUrl =
    previewUrl ??
    (activePresetId ? undefined : (avatarUrl ?? undefined))

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            sizeClasses[size]
          )}
          aria-label="Upload profile photo"
        >
          <Avatar className={cn('size-full', sizeClasses[size])}>
            {displayUrl && (
              <AvatarImage src={displayUrl} alt={name} className="object-cover" />
            )}
            {activePresetId && !displayUrl ? (
              <PresetAvatarContent
                presetId={activePresetId}
                name={name}
                size={size}
              />
            ) : (
              !displayUrl && (
                <AvatarFallback className="bg-brand text-brand-foreground font-semibold">
                  {initialsFromName(name || '?')}
                </AvatarFallback>
              )
            )}
          </Avatar>
          <span className="bg-foreground/70 text-background absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-0">
            <Camera className="size-4" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-muted-foreground text-xs">
            {uploading ? 'Saving…' : 'Optional · upload or pick an icon'}
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

      {showPresetPicker && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            Or choose an icon
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {CLIENT_AVATAR_PRESETS.map((preset) => {
              const Icon = preset.icon
              const isSelected = activePresetId === preset.id

              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  disabled={disabled || uploading}
                  onClick={() => void handlePresetSelect(preset.id)}
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full transition-all',
                    presetButtonSizes[size],
                    preset.className,
                    isSelected
                      ? 'ring-brand ring-2 ring-offset-2'
                      : 'hover:scale-105'
                  )}
                  aria-label={`${preset.label} icon`}
                  aria-pressed={isSelected}
                >
                  <Icon className={presetIconSizes[size]} aria-hidden />
                </button>
              )
            })}
          </div>
        </div>
      )}
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
  const presetId = parseClientAvatarPreset(avatarUrl)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {presetId ? (
        <PresetAvatarContent presetId={presetId} name={name} size={size} />
      ) : (
        <>
          {avatarUrl && (
            <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
          )}
          <AvatarFallback className="bg-brand text-brand-foreground font-semibold">
            {initialsFromName(name || '?')}
          </AvatarFallback>
        </>
      )}
    </Avatar>
  )
}
