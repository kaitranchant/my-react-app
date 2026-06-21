'use client'

import * as React from 'react'
import { Camera, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { uploadClientFormReview } from '@/app/portal/form-review-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  FORM_REVIEW_FILE_ACCEPT,
  FORM_REVIEW_UPLOAD_HINT,
  getFormReviewMaxUploadBytes,
  resolveFormReviewContentType,
} from '@/lib/form-reviews'

type FormReviewSubmitDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  exerciseId: string
  scheduledWorkoutId: string
  scheduledExerciseId: string
  onSubmitted?: () => void
}

export function FormReviewSubmitDialog({
  open,
  onOpenChange,
  exerciseName,
  exerciseId,
  scheduledWorkoutId,
  scheduledExerciseId,
  onSubmitted,
}: FormReviewSubmitDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState(false)
  const [clientNotes, setClientNotes] = React.useState('')
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(
    null
  )

  React.useEffect(() => {
    if (!open) {
      setClientNotes('')
      setSelectedFileName(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error('Choose a photo or video to upload.')
      return
    }

    const contentType = resolveFormReviewContentType(file)
    if (!contentType) {
      toast.error('Unsupported file type. Use MP4, WebM, MOV, JPEG, PNG, or WebP.')
      return
    }

    const maxUploadBytes = getFormReviewMaxUploadBytes(contentType)
    if (file.size > maxUploadBytes) {
      toast.error(
        contentType.startsWith('image/')
          ? 'Photos must be under 10 MB.'
          : 'Videos must be under 50 MB.'
      )
      return
    }

    setPending(true)
    const formData = new FormData()
    formData.set('file', file)

    const result = await uploadClientFormReview(
      {
        title: exerciseName,
        clientNotes: clientNotes.trim() || null,
        exerciseId,
        scheduledWorkoutId,
        scheduledExerciseId,
      },
      formData
    )
    setPending(false)

    if (result.success) {
      toast.success('Form review submitted')
      onOpenChange(false)
      onSubmitted?.()
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit form review</DialogTitle>
          <DialogDescription>
            Upload a photo or video of{' '}
            <span className="text-foreground">{exerciseName}</span> for your coach
            to review. {FORM_REVIEW_UPLOAD_HINT}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="workout-form-review-notes">
              Notes for your coach (optional)
            </Label>
            <Textarea
              id="workout-form-review-notes"
              value={clientNotes}
              onChange={(event) => setClientNotes(event.target.value)}
              placeholder="Which set or cue should they focus on?"
              rows={3}
              maxLength={500}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-form-review-file">Photo or video</Label>
            <input
              ref={fileInputRef}
              id="workout-form-review-file"
              type="file"
              accept={FORM_REVIEW_FILE_ACCEPT}
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
              {selectedFileName ?? 'Choose photo or video'}
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !selectedFileName}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
