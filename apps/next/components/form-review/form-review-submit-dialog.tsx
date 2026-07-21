'use client'

import * as React from 'react'
import { Camera, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { uploadCoachFormReview } from '@/app/(dashboard)/clients/[clientId]/calendar/workout-log-actions'
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
import type { ClientFormReviewWithUrl } from 'app/types/database'

type FormReviewSubmitDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  exerciseId: string
  clientId: string
  scheduledWorkoutId: string
  scheduledExerciseId: string
  variant: 'coach' | 'client'
  onSubmitted?: (review: ClientFormReviewWithUrl) => void
}

export function FormReviewSubmitDialog({
  open,
  onOpenChange,
  exerciseName,
  exerciseId,
  clientId,
  scheduledWorkoutId,
  scheduledExerciseId,
  variant,
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

    const values = {
      title: exerciseName,
      clientNotes: variant === 'client' ? clientNotes.trim() || null : null,
      exerciseId,
      scheduledWorkoutId,
      scheduledExerciseId,
    }
    const result =
      variant === 'client'
        ? await uploadClientFormReview(values, formData)
        : await uploadCoachFormReview(clientId, values, formData)
    setPending(false)

    if (result.success) {
      toast.success(
        variant === 'client'
          ? 'Form review submitted'
          : 'Form review media added'
      )
      onOpenChange(false)
      onSubmitted?.(result.data)
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {variant === 'client'
              ? 'Submit form review'
              : 'Add form review media'}
          </DialogTitle>
          <DialogDescription>
            Upload a photo or video of{' '}
            <span className="text-foreground">{exerciseName}</span>{' '}
            {variant === 'client'
              ? 'for your coach to review.'
              : "for this client. It will appear in the exercise's history."}{' '}
            {FORM_REVIEW_UPLOAD_HINT}
          </DialogDescription>
        </DialogHeader>

        <form
          className="min-w-0 space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {variant === 'client' ? (
            <div className="min-w-0 space-y-2">
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
          ) : null}

          <div className="min-w-0 space-y-2">
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
              className="w-full min-w-0 justify-start overflow-hidden"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <Upload className="size-4 shrink-0" />
              )}
              <span className="min-w-0 truncate">
                {selectedFileName ?? 'Choose photo or video'}
              </span>
            </Button>
          </div>

          <DialogFooter className="w-full min-w-0">
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
                  {variant === 'client' ? 'Submit' : 'Add media'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
