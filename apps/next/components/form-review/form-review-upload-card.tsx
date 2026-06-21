'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Video } from 'lucide-react'
import { toast } from 'sonner'

import { uploadClientFormReview } from '@/app/portal/form-review-actions'
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
import { Textarea } from '@/components/ui/textarea'
import { FORM_REVIEW_MAX_UPLOAD_BYTES } from '@/lib/form-reviews'

type ExerciseOption = {
  id: string
  name: string
}

type FormReviewUploadCardProps = {
  exercises: ExerciseOption[]
}

const UNSET_EXERCISE = 'none'

export function FormReviewUploadCard({ exercises }: FormReviewUploadCardProps) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [clientNotes, setClientNotes] = React.useState('')
  const [exerciseId, setExerciseId] = React.useState(UNSET_EXERCISE)
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(
    null
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error('Choose a video to upload.')
      return
    }

    if (file.size > FORM_REVIEW_MAX_UPLOAD_BYTES) {
      toast.error('Video must be under 50 MB.')
      return
    }

    setPending(true)
    const formData = new FormData()
    formData.set('file', file)

    const result = await uploadClientFormReview(
      {
        title: title.trim() || null,
        clientNotes: clientNotes.trim() || null,
        exerciseId: exerciseId === UNSET_EXERCISE ? null : exerciseId,
      },
      formData
    )
    setPending(false)

    if (result.success) {
      toast.success('Video submitted for review')
      setTitle('')
      setClientNotes('')
      setExerciseId(UNSET_EXERCISE)
      setSelectedFileName(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit a video</CardTitle>
        <CardDescription>
          Upload a lift video for your coach to review. MP4, WebM, or MOV up to
          50 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="form-review-title">Title (optional)</Label>
            <Input
              id="form-review-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Squat set 3"
              maxLength={120}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-review-exercise">Exercise (optional)</Label>
            <Select
              value={exerciseId}
              onValueChange={setExerciseId}
              disabled={pending}
            >
              <SelectTrigger id="form-review-exercise">
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET_EXERCISE}>Not specified</SelectItem>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-review-notes">Notes for your coach (optional)</Label>
            <Textarea
              id="form-review-notes"
              value={clientNotes}
              onChange={(event) => setClientNotes(event.target.value)}
              placeholder="What should your coach look for?"
              rows={3}
              maxLength={500}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-review-file">Video</Label>
            <input
              ref={fileInputRef}
              id="form-review-file"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0]
                setSelectedFileName(file?.name ?? null)
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {selectedFileName ?? 'Choose video file'}
            </Button>
          </div>

          <Button type="submit" disabled={pending || !selectedFileName}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Video className="size-4" />
                Submit for review
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
