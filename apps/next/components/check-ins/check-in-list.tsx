'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteCoachCheckIn,
  submitCoachCheckIn,
  updateCheckInCoachNotes,
  updateCoachCheckIn,
} from '@/app/(dashboard)/check-ins/actions'
import { CheckInForm } from '@/components/check-ins/check-in-form'
import { ProgressPhotoThumbnails } from '@/components/progress-photos/progress-photo-upload'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  checkInToFormValues,
  createEmptyCheckInValues,
  formatCheckInDate,
  formatCheckInSummary,
  isCheckInPendingReview,
} from '@/lib/check-ins'
import type { CheckInFormValues } from '@/lib/validations/check-in'
import type { Client, ClientCheckIn, ClientProgressPhotoWithUrl, WeightUnit } from 'app/types/database'

type CheckInListItem = ClientCheckIn & {
  client?: Pick<Client, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

type CheckInListProps = {
  checkIns: CheckInListItem[]
  showClient?: boolean
  clientId?: string
  emptyMessage?: string
  photoCounts?: Record<string, number>
  photosByCheckInId?: Record<string, ClientProgressPhotoWithUrl[]>
  weightUnit?: WeightUnit
}

function CoachResponseEditor({ checkIn }: { checkIn: CheckInListItem }) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(checkIn.coach_notes ?? '')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setNotes(checkIn.coach_notes ?? '')
  }, [checkIn.coach_notes])

  async function handleSave() {
    setIsSaving(true)
    const result = await updateCheckInCoachNotes(checkIn.id, notes || null)
    setIsSaving(false)

    if (result.success) {
      toast.success('Coach response saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="border-brand/20 bg-brand/5 grid gap-3 rounded-xl border-2 p-4">
      <div className="space-y-1">
        <p className="text-brand text-sm font-medium">Coach response</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Your dedicated coaching moment — feedback the client will see after review.
        </p>
      </div>
      <Textarea
        rows={4}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Share encouragement, adjustments, or next steps…"
        className="bg-background border-brand/20"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving || notes === (checkIn.coach_notes ?? '')}
        >
          {isSaving ? 'Saving…' : 'Save response'}
        </Button>
      </div>
    </div>
  )
}

function CheckInRow({
  checkIn,
  showClient,
  clientId,
  photoCount = 0,
  progressPhotos = [],
  weightUnit = 'lbs',
}: {
  checkIn: CheckInListItem
  showClient?: boolean
  clientId?: string
  photoCount?: number
  progressPhotos?: ClientProgressPhotoWithUrl[]
  weightUnit?: WeightUnit
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const pending = isCheckInPendingReview(checkIn)

  async function handleUpdate(values: CheckInFormValues) {
    const result = await updateCoachCheckIn(checkIn.id, values)
    if (result.success) {
      toast.success('Check-in updated')
      setIsEditing(false)
      router.refresh()
      return { success: true }
    }
    toast.error(result.error)
    return { success: false, error: result.error }
  }

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteCoachCheckIn(checkIn.id)
    setIsDeleting(false)

    if (result.success) {
      toast.success('Check-in deleted')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {showClient && checkIn.client && (
              <ClientAvatar
                name={checkIn.client.full_name}
                avatarUrl={checkIn.client.avatar_url}
                size="sm"
              />
            )}
            <div className="space-y-1">
              <CardTitle className="text-base">
                {showClient && checkIn.client ? (
                  <Link
                    href={`/clients/${checkIn.client.id}?tab=check-ins`}
                    className="hover:text-brand transition-colors"
                  >
                    {checkIn.client.full_name}
                  </Link>
                ) : (
                  formatCheckInDate(checkIn.check_in_date)
                )}
              </CardTitle>
              <CardDescription>
                {showClient && checkIn.client
                  ? `${formatCheckInDate(checkIn.check_in_date)} · ${formatCheckInSummary(checkIn, weightUnit)}`
                  : formatCheckInSummary(checkIn, weightUnit)}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {photoCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <Camera className="size-3" />
                {photoCount} photo{photoCount === 1 ? '' : 's'}
              </Badge>
            )}
            {pending && <Badge variant="secondary">Pending review</Badge>}
            {checkIn.reviewed_at && <Badge variant="outline">Reviewed</Badge>}
            {checkIn.submitted_by === 'coach' && (
              <Badge variant="outline">Logged by coach</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {checkIn.client_notes && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            <span className="text-muted-foreground font-medium">
              Client&apos;s reported feedback:{' '}
            </span>
            {checkIn.client_notes}
          </p>
        )}

        {checkIn.soreness_notes && (
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">Soreness: </span>
            {checkIn.soreness_notes}
          </p>
        )}

        {checkIn.has_pain && checkIn.pain_notes && (
          <p className="text-sm text-red-700">
            <span className="font-medium">Pain flagged: </span>
            {checkIn.pain_notes}
          </p>
        )}

        {!isEditing && progressPhotos.length > 0 && (
          <ProgressPhotoThumbnails photos={progressPhotos} />
        )}

        {checkIn.coach_notes && !isEditing && (
          <p className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
            <span className="text-muted-foreground font-medium">Coach response: </span>
            {checkIn.coach_notes}
          </p>
        )}

        {isEditing ? (
          <CheckInForm
            variant="coach"
            initialValues={checkInToFormValues(checkIn)}
            checkInId={checkIn.id}
            progressPhotos={progressPhotos}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            submitLabel="Update check-in"
          />
        ) : (
          <>
            <CoachResponseEditor checkIn={checkIn} />
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              {clientId && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={`/clients/${clientId}?tab=check-ins`}>View client</Link>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CheckInList({
  checkIns,
  showClient = false,
  clientId,
  emptyMessage = 'No check-ins yet.',
  photoCounts = {},
  photosByCheckInId = {},
  weightUnit = 'lbs',
}: CheckInListProps) {
  if (checkIns.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {checkIns.map((checkIn) => (
        <CheckInRow
          key={checkIn.id}
          checkIn={checkIn}
          showClient={showClient}
          clientId={clientId}
          photoCount={photoCounts[checkIn.id] ?? 0}
          progressPhotos={photosByCheckInId[checkIn.id] ?? []}
          weightUnit={weightUnit}
        />
      ))}
    </div>
  )
}

type CoachLogCheckInCardProps = {
  clients: Pick<Client, 'id' | 'full_name'>[]
  defaultClientId?: string
  allCheckIns?: ClientCheckIn[]
}

export function CoachLogCheckInCard({
  clients,
  defaultClientId,
  allCheckIns = [],
}: CoachLogCheckInCardProps) {
  const router = useRouter()
  const [selectedClientId, setSelectedClientId] = React.useState(
    defaultClientId ?? clients[0]?.id ?? ''
  )

  React.useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId)
    }
  }, [defaultClientId])

  const recentCheckIns = allCheckIns
    .filter((checkIn) => checkIn.client_id === selectedClientId)
    .slice(0, 3)

  const initialValues = createEmptyCheckInValues()

  async function handleSubmit(values: CheckInFormValues) {
    if (!selectedClientId) {
      toast.error('Select a client first.')
      return { success: false, error: 'Select a client first.' }
    }

    const result = await submitCoachCheckIn(selectedClientId, values)
    if (result.success) {
      toast.success('Check-in saved')
      router.refresh()
      return { success: true }
    }
    toast.error(result.error)
    return { success: false, error: result.error }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Add an active client before logging check-ins.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log check-in</CardTitle>
        <CardDescription>
          Record metrics on behalf of a client or backfill a past date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CheckInForm
          variant="coach"
          initialValues={initialValues}
          recentCheckIns={recentCheckIns}
          clients={clients}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  )
}
