'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Video } from 'lucide-react'
import { toast } from 'sonner'

import {
  removeExerciseDemoVideo,
  uploadExerciseDemoVideo,
} from '@/app/(dashboard)/library/exercises/demo-video-actions'
import { Button } from '@/components/ui/button'
import {
  EXERCISE_DEMO_FILE_ACCEPT,
  EXERCISE_DEMO_UPLOAD_HINT,
  getExerciseDemoVideoUrl,
} from '@/lib/exercise-demo-video'

type ExerciseDemoVideoUploadProps = {
  exerciseId: string
  demoVideoPath: string | null
}

export function ExerciseDemoVideoUpload({
  exerciseId,
  demoVideoPath,
}: ExerciseDemoVideoUploadProps) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  const storedUrl = getExerciseDemoVideoUrl(demoVideoPath)
  const displayUrl = previewUrl ?? storedUrl

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

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setPending(true)

    const formData = new FormData()
    formData.set('file', file)
    const result = await uploadExerciseDemoVideo(exerciseId, formData)
    setPending(false)

    if (result.success) {
      clearPreview()
      if (result.videoUrl) {
        setPreviewUrl(result.videoUrl)
      }
      toast.success('Demo video uploaded')
      router.refresh()
    } else {
      clearPreview()
      toast.error(result.error)
    }
  }

  async function handleRemove() {
    setPending(true)
    const result = await removeExerciseDemoVideo(exerciseId)
    setPending(false)

    if (result.success) {
      clearPreview()
      toast.success('Demo video removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const hasVideo = Boolean(displayUrl)

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Demo video</p>
          <p className="text-muted-foreground text-xs">{EXERCISE_DEMO_UPLOAD_HINT}</p>
        </div>
        {pending && <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />}
      </div>

      {hasVideo ? (
        <video
          key={displayUrl ?? undefined}
          src={displayUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="bg-muted max-h-48 w-full rounded-lg border object-contain"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-32 items-center justify-center rounded-lg border text-sm">
          <Video className="mr-2 size-4" />
          No demo video yet
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {hasVideo ? 'Replace video' : 'Upload video'}
        </Button>
        {hasVideo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
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
        accept={EXERCISE_DEMO_FILE_ACCEPT}
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}
