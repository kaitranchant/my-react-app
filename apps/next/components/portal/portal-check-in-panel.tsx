'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { submitClientCheckIn } from '@/app/portal/check-in-actions'
import { CheckInForm } from '@/components/check-ins/check-in-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  checkInToFormValues,
  createEmptyCheckInValues,
  formatCheckInDate,
  formatCheckInSummary,
} from '@/lib/check-ins'
import { toDateKey } from '@/lib/calendar'
import {
  toClientCheckInValues,
  type CheckInFormValues,
} from '@/lib/validations/check-in'
import {
  ProgressPhotoThumbnails,
  ProgressPhotoUpload,
} from '@/components/progress-photos/progress-photo-upload'
import type { ClientCheckIn, ClientProgressPhotoWithUrl } from 'app/types/database'

type PortalCheckInPanelProps = {
  todayCheckIn: ClientCheckIn | null
  recentCheckIns?: ClientCheckIn[]
  todayPhotos?: ClientProgressPhotoWithUrl[]
}

export function PortalCheckInPanel({
  todayCheckIn,
  recentCheckIns = [],
  todayPhotos = [],
}: PortalCheckInPanelProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(!todayCheckIn)
  const today = toDateKey(new Date())
  const canEdit =
    !todayCheckIn ||
    (todayCheckIn.submitted_by === 'client' && todayCheckIn.reviewed_at == null)

  const initialValues = todayCheckIn
    ? checkInToFormValues(todayCheckIn)
    : createEmptyCheckInValues(today)

  async function handleSubmit(values: CheckInFormValues) {
    const result = await submitClientCheckIn(toClientCheckInValues(values))
    if (result.success) {
      toast.success(todayCheckIn ? 'Check-in updated' : 'Check-in submitted')
      setIsEditing(false)
      router.refresh()
      return { success: true }
    }
    toast.error(result.error)
    return { success: false, error: result.error }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Weekly check-in</CardTitle>
            <CardDescription>
              Share how your week went so your coach can adjust your program.
            </CardDescription>
          </div>
          {todayCheckIn && !todayCheckIn.reviewed_at && (
            <Badge variant="secondary">Submitted</Badge>
          )}
          {todayCheckIn?.reviewed_at && (
            <Badge variant="outline">Reviewed by coach</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isEditing && canEdit ? (
          <CheckInForm
            variant="client"
            initialValues={initialValues}
            recentCheckIns={recentCheckIns}
            checkInId={todayCheckIn?.id ?? null}
            progressPhotos={todayPhotos}
            onSubmit={handleSubmit}
            onCancel={todayCheckIn ? () => setIsEditing(false) : undefined}
            submitLabel={todayCheckIn ? 'Update check-in' : 'Submit check-in'}
          />
        ) : todayCheckIn ? (
          <>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{formatCheckInDate(todayCheckIn.check_in_date)}</p>
              <p className="text-muted-foreground">{formatCheckInSummary(todayCheckIn)}</p>
              {todayCheckIn.soreness_notes && (
                <p className="text-muted-foreground text-xs">
                  Soreness: {todayCheckIn.soreness_notes}
                </p>
              )}
              {todayCheckIn.has_pain && todayCheckIn.pain_notes && (
                <p className="text-red-700 text-xs">
                  Pain noted: {todayCheckIn.pain_notes}
                </p>
              )}
              {todayCheckIn.client_notes && (
                <p className="leading-relaxed whitespace-pre-wrap">
                  {todayCheckIn.client_notes}
                </p>
              )}
            </div>

            <ProgressPhotoThumbnails photos={todayPhotos} />

            {todayCheckIn.coach_notes && (
              <div className="bg-brand/5 border-brand/10 rounded-lg border p-4 text-sm leading-relaxed">
                <p className="text-brand mb-1 font-medium">Coach feedback</p>
                <p className="whitespace-pre-wrap">{todayCheckIn.coach_notes}</p>
              </div>
            )}

            {canEdit && (
              <div className="grid gap-4">
                <ProgressPhotoUpload
                  checkInId={todayCheckIn.id}
                  photos={todayPhotos}
                  variant="client"
                />
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                    Edit check-in
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <CheckInForm
            variant="client"
            initialValues={initialValues}
            recentCheckIns={recentCheckIns}
            onSubmit={handleSubmit}
            submitLabel="Submit check-in"
          />
        )}
      </CardContent>
    </Card>
  )
}
