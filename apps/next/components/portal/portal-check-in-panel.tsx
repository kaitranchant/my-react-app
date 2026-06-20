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
import { getCheckInCadenceTitle } from '@/lib/check-in-cadence'
import {
  defaultCoachPreferences,
  getCoachDateKey,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import {
  checkInToFormValues,
  createEmptyCheckInValues,
  formatCheckInDate,
  formatCheckInSummary,
} from '@/lib/check-ins'
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
  periodCheckIn: ClientCheckIn | null
  recentCheckIns?: ClientCheckIn[]
  periodPhotos?: ClientProgressPhotoWithUrl[]
  coachPreferences?: CoachPreferences | null
}

export function PortalCheckInPanel({
  periodCheckIn,
  recentCheckIns = [],
  periodPhotos = [],
  coachPreferences = defaultCoachPreferences,
}: PortalCheckInPanelProps) {
  const router = useRouter()
  const preferences = coachPreferences ?? defaultCoachPreferences
  const [isEditing, setIsEditing] = React.useState(!periodCheckIn)
  const today = getCoachDateKey(preferences.timezone)
  const canEdit =
    !periodCheckIn ||
    (periodCheckIn.submitted_by === 'client' && periodCheckIn.reviewed_at == null)

  const initialValues = periodCheckIn
    ? checkInToFormValues(periodCheckIn)
    : createEmptyCheckInValues(today)

  const cadenceTitle = getCheckInCadenceTitle(
    preferences.defaultCheckInFrequency
  )
  const cadenceDescription =
    preferences.defaultCheckInFrequency === 'daily'
      ? 'Share how you are feeling today so your coach can adjust your program.'
      : preferences.defaultCheckInFrequency === 'weekly'
        ? 'Share how your week went so your coach can adjust your program.'
        : 'Share how the last two weeks went so your coach can adjust your program.'

  async function handleSubmit(values: CheckInFormValues) {
    const result = await submitClientCheckIn(toClientCheckInValues(values))
    if (result.success) {
      toast.success(periodCheckIn ? 'Check-in updated' : 'Check-in submitted')
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
            <CardTitle className="text-base">{cadenceTitle}</CardTitle>
            <CardDescription>{cadenceDescription}</CardDescription>
          </div>
          {periodCheckIn && !periodCheckIn.reviewed_at && (
            <Badge variant="secondary">Submitted</Badge>
          )}
          {periodCheckIn?.reviewed_at && (
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
            checkInId={periodCheckIn?.id ?? null}
            progressPhotos={periodPhotos}
            weightUnit={preferences.weightUnit}
            onSubmit={handleSubmit}
            onCancel={periodCheckIn ? () => setIsEditing(false) : undefined}
            submitLabel={periodCheckIn ? 'Update check-in' : 'Submit check-in'}
          />
        ) : periodCheckIn ? (
          <>
            <div className="space-y-2 text-sm">
              <p className="font-medium">
                {formatCheckInDate(periodCheckIn.check_in_date)}
              </p>
              <p className="text-muted-foreground">
                {formatCheckInSummary(periodCheckIn, preferences.weightUnit)}
              </p>
              {periodCheckIn.soreness_notes && (
                <p className="text-muted-foreground text-xs">
                  Soreness: {periodCheckIn.soreness_notes}
                </p>
              )}
              {periodCheckIn.has_pain && periodCheckIn.pain_notes && (
                <p className="text-red-700 text-xs">
                  Pain noted: {periodCheckIn.pain_notes}
                </p>
              )}
              {periodCheckIn.client_notes && (
                <p className="leading-relaxed whitespace-pre-wrap">
                  {periodCheckIn.client_notes}
                </p>
              )}
            </div>

            <ProgressPhotoThumbnails photos={periodPhotos} />

            {periodCheckIn.coach_notes && (
              <div className="bg-brand/5 border-brand/10 rounded-lg border p-4 text-sm leading-relaxed">
                <p className="text-brand mb-1 font-medium">Coach feedback</p>
                <p className="whitespace-pre-wrap">{periodCheckIn.coach_notes}</p>
              </div>
            )}

            {canEdit && (
              <div className="grid gap-4">
                <ProgressPhotoUpload
                  checkInId={periodCheckIn.id}
                  photos={periodPhotos}
                  variant="client"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
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
            weightUnit={preferences.weightUnit}
            onSubmit={handleSubmit}
            submitLabel="Submit check-in"
          />
        )}
      </CardContent>
    </Card>
  )
}
