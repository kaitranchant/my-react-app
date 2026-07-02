'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  bookCoachingAppointmentAsCoach,
  cancelCoachingAppointment,
  deleteCoachingAppointment,
  endCoachingAppointmentSeries,
  getCoachAvailableSlots,
  updateCoachingAppointment,
  updateCoachingAppointmentNotes,
  updateCoachingAppointmentStatus,
} from '@/app/(dashboard)/scheduling/actions'
import { SessionTypeSelect } from '@/components/scheduling/session-type-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDayHeader, addDaysToDateKey } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { formatAppointmentRange, getDateKeyFromInstant } from '@/lib/session-booking-slots'
import { getBrowserTimeZone } from '@/lib/browser-timezone'
import type { AvailableSlot } from '@/lib/session-booking-slots'
import {
  appointmentStatusLabels,
  type ClientSessionPack,
  type CoachingAppointment,
} from '@/lib/session-booking-types'
import { isSessionPackActive, sessionsRemaining } from '@/lib/session-booking-slots'
import type { CoachingSessionType } from 'app/types/database'

const selectInDialogClassName = 'z-[100] max-h-60'

type AppointmentManageDialogProps = {
  appointment: CoachingAppointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
  clients: Array<{ id: string; full_name: string | null }>
  dateOptions: string[]
}

export function AppointmentManageDialog({
  appointment,
  open,
  onOpenChange,
  coachPreferences,
  sessionPacks,
  clients,
  dateOptions,
}: AppointmentManageDialogProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [preNotes, setPreNotes] = React.useState('')
  const [postNotes, setPostNotes] = React.useState('')
  const [slots, setSlots] = React.useState<AvailableSlot[]>([])
  const [noShowPackId, setNoShowPackId] = React.useState<string>()
  const [showEditDetails, setShowEditDetails] = React.useState(false)
  const [editClientId, setEditClientId] = React.useState('')
  const [editDateKey, setEditDateKey] = React.useState('')
  const [editStartsAt, setEditStartsAt] = React.useState<string>()
  const [editLocation, setEditLocation] = React.useState('')
  const [editSessionType, setEditSessionType] =
    React.useState<CoachingSessionType>('coaching')
  const [editSessionPackId, setEditSessionPackId] = React.useState<string>()
  const [showDuplicate, setShowDuplicate] = React.useState(false)
  const [duplicateDateKey, setDuplicateDateKey] = React.useState('')
  const [duplicateStartsAt, setDuplicateStartsAt] = React.useState<string>()
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [cancelScope, setCancelScope] = React.useState<'single' | 'this_and_future'>(
    'single'
  )

  const deleteConfirm = useConfirmDialog({
    title: 'Delete session?',
    description:
      appointment?.status === 'scheduled'
        ? 'This permanently removes the session from your calendar. The client will not be notified — use Cancel session if you want to notify them.'
        : 'This permanently removes the session from your calendar. This cannot be undone.',
    confirmLabel: 'Delete session',
    destructive: true,
    onConfirm: async () => {
      if (!appointment) return
      const result = await deleteCoachingAppointment({
        appointmentId: appointment.id,
      })
      if (result.success) {
        await refreshAfterSuccess('Session deleted')
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  const endSeriesConfirm = useConfirmDialog({
    title: 'Stop recurring sessions?',
    description:
      'This cancels all future sessions from today onward and stops the weekly series. To cancel from a specific session instead, use Cancel session.',
    confirmLabel: 'Stop recurring sessions',
    destructive: true,
    onConfirm: async () => {
      if (!appointment?.series_id) return
      const result = await endCoachingAppointmentSeries(appointment.series_id)
      if (result.success) {
        await refreshAfterSuccess('Recurring sessions stopped')
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  const clientPacks = React.useMemo(() => {
    if (!appointment) return []
    const dateKey = getDateKeyFromInstant(
      appointment.starts_at,
      coachPreferences.timezone
    )
    return sessionPacks.filter(
      (pack) =>
        pack.client_id === appointment.client_id &&
        isSessionPackActive(pack, dateKey)
    )
  }, [appointment, coachPreferences.timezone, sessionPacks])

  const editClientPacks = React.useMemo(() => {
    if (!editClientId || !editDateKey) return []
    return sessionPacks.filter(
      (pack) =>
        pack.client_id === editClientId && isSessionPackActive(pack, editDateKey)
    )
  }, [editClientId, editDateKey, sessionPacks])

  React.useEffect(() => {
    if (!appointment || !open) return
    setPreNotes(appointment.pre_session_notes ?? appointment.notes ?? '')
    setPostNotes(appointment.post_session_notes ?? '')
    setShowEditDetails(false)
    setShowDuplicate(false)
    setDuplicateStartsAt(undefined)
    setNoShowPackId(appointment.session_pack_id ?? undefined)
    setShowCancelDialog(false)
    setCancelScope('single')
    const appointmentDateKey = getDateKeyFromInstant(
      appointment.starts_at,
      coachPreferences.timezone
    )
    setEditClientId(appointment.client_id)
    setEditDateKey(appointmentDateKey)
    setEditStartsAt(appointment.starts_at)
    setEditLocation(appointment.location ?? '')
    setEditSessionType(appointment.session_type)
    setEditSessionPackId(appointment.session_pack_id ?? undefined)
    setDuplicateDateKey(addDaysToDateKey(appointmentDateKey, 7))
  }, [appointment, coachPreferences.timezone, open])

  const slotDateKey = showEditDetails
    ? editDateKey
    : showDuplicate
      ? duplicateDateKey
      : ''

  React.useEffect(() => {
    if (!open || !slotDateKey) {
      setSlots([])
      return
    }

    let cancelled = false
    getCoachAvailableSlots(
      slotDateKey,
      getBrowserTimeZone(),
      showEditDetails ? appointment?.id : undefined
    ).then((result) => {
      if (cancelled) return
      if (result.success) {
        setSlots(result.slots)
      } else {
        setSlots([])
        toast.error(result.error)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, slotDateKey, showEditDetails, appointment?.id])

  React.useEffect(() => {
    if (!showEditDetails) return
    setEditStartsAt(undefined)
    setEditSessionPackId(undefined)
  }, [editClientId, editDateKey])

  if (!appointment) {
    return null
  }

  const canManage = appointment.status === 'scheduled'
  const hasActiveSeries =
    Boolean(appointment.series_id) && appointment.series?.status === 'active'

  async function refreshAfterSuccess(message: string) {
    toast.success(message)
    onOpenChange(false)
    router.refresh()
  }

  async function handleSaveNotes() {
    setPending(true)
    const result = await updateCoachingAppointmentNotes({
      appointmentId: appointment!.id,
      preSessionNotes: preNotes || null,
      postSessionNotes: postNotes || null,
    })
    setPending(false)

    if (result.success) {
      await refreshAfterSuccess('Session notes saved')
    } else {
      toast.error(result.error)
    }
  }

  async function handleStatus(status: CoachingAppointment['status']) {
    setPending(true)
    const result = await updateCoachingAppointmentStatus({
      appointmentId: appointment!.id,
      status,
      sessionPackId:
        status === 'no_show' && !appointment!.session_pack_id
          ? noShowPackId ?? null
          : undefined,
    })
    setPending(false)

    if (result.success) {
      const label = appointmentStatusLabels[status]
      await refreshAfterSuccess(`Session marked ${label.toLowerCase()}`)
    } else {
      toast.error(result.error)
    }
  }

  async function handleCancel(
    scope: 'single' | 'this_and_future' = 'single'
  ): Promise<boolean> {
    setPending(true)
    const result = await cancelCoachingAppointment({
      appointmentId: appointment!.id,
      notifyClient: true,
      cancelScope: scope,
    })
    setPending(false)

    if (result.success) {
      await refreshAfterSuccess(
        scope === 'this_and_future'
          ? 'This and future sessions cancelled'
          : 'Session cancelled and client notified'
      )
      return true
    }

    toast.error(result.error)
    return false
  }

  async function handleConfirmCancel() {
    const succeeded = await handleCancel(cancelScope)
    if (succeeded) {
      setShowCancelDialog(false)
    }
  }

  async function handleSaveDetails() {
    if (!editStartsAt) {
      toast.error('Select a time slot.')
      return
    }

    setPending(true)
    const result = await updateCoachingAppointment({
      appointmentId: appointment!.id,
      clientId: editClientId,
      startsAt: editStartsAt,
      location: editLocation || null,
      sessionType: editSessionType,
      sessionPackId: editSessionPackId ?? null,
      notifyClient: true,
      clientTimeZone: getBrowserTimeZone(),
    })
    setPending(false)

    if (result.success) {
      await refreshAfterSuccess('Session updated and client notified')
    } else {
      toast.error(result.error)
    }
  }

  async function handleDuplicate() {
    if (!duplicateStartsAt) {
      toast.error('Select a time slot.')
      return
    }

    setPending(true)
    const result = await bookCoachingAppointmentAsCoach({
      clientId: appointment!.client_id,
      startsAt: duplicateStartsAt,
      sessionPackId: appointment!.session_pack_id ?? null,
      location: appointment!.location ?? null,
      notes: preNotes || null,
      coachingType: appointment!.coaching_type ?? null,
      sessionType: appointment!.session_type,
      clientTimeZone: getBrowserTimeZone(),
    })
    setPending(false)

    if (result.success) {
      await refreshAfterSuccess('Session duplicated')
    } else {
      toast.error(result.error)
    }
  }

  const slotPicker = (
    dateKey: string,
    startsAt: string | undefined,
    onDateChange: (value: string) => void,
    onTimeChange: (value: string | undefined) => void,
    confirmLabel: string,
    onConfirm: () => void
  ) => (
    <div className="bg-muted/40 space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Select
            value={dateKey}
            onValueChange={(value) => {
              onDateChange(value)
              onTimeChange(undefined)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] max-h-60">
              {(dateOptions.length > 0
                ? dateOptions
                : Array.from({ length: 14 }, (_, index) => {
                    const date = new Date()
                    date.setDate(date.getDate() + index)
                    return date.toISOString().slice(0, 10)
                  })
              ).map((key) => (
                <SelectItem key={key} value={key}>
                  {formatDayHeader(key)} · {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Select
            value={startsAt}
            onValueChange={onTimeChange}
            disabled={slots.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select slot" />
            </SelectTrigger>
            <SelectContent className="z-[100] max-h-60">
              {slots.map((slot) => (
                <SelectItem key={slot.startsAt} value={slot.startsAt}>
                  {slot.startTimeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="px-0 pb-0">
        <Button
          type="button"
          size="sm"
          disabled={pending || !startsAt}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        viewport
        className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] max-w-lg flex-col overflow-hidden sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pr-12">
          <DialogTitle>Manage session</DialogTitle>
          <DialogDescription>
            {formatAppointmentRange(
              appointment.starts_at,
              appointment.ends_at,
              coachPreferences.timezone
            )}
            {appointment.client?.full_name
              ? ` · ${appointment.client.full_name}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-6">
          <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{appointmentStatusLabels[appointment.status]}</Badge>
            {hasActiveSeries ? (
              <Badge variant="secondary">Recurring weekly</Badge>
            ) : null}
            {appointment.location ? (
              <span className="text-muted-foreground text-sm">
                {appointment.location}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pre-session-notes">Pre-session notes</Label>
            <Textarea
              id="pre-session-notes"
              value={preNotes}
              onChange={(event) => setPreNotes(event.target.value)}
              rows={3}
              placeholder="Session plan, focus areas, equipment needed…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-session-notes">Post-session notes</Label>
            <Textarea
              id="post-session-notes"
              value={postNotes}
              onChange={(event) => setPostNotes(event.target.value)}
              rows={3}
              placeholder="Progress, adjustments, homework…"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleSaveNotes}
          >
            Save notes
          </Button>

          {canManage ? (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Session details</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setShowDuplicate(false)
                    setShowEditDetails((value) => {
                      if (!value && appointment) {
                        setEditStartsAt(appointment.starts_at)
                        setEditSessionPackId(appointment.session_pack_id ?? undefined)
                      }
                      return !value
                    })
                  }}
                >
                  {showEditDetails ? 'Hide editor' : 'Edit details'}
                </Button>
              </div>

              {showEditDetails ? (
                <div className="bg-muted/40 space-y-3 rounded-lg border p-3">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={editClientId} onValueChange={setEditClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent className={selectInDialogClassName}>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name ?? 'Unnamed client'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <SessionTypeSelect
                    value={editSessionType}
                    onValueChange={setEditSessionType}
                    contentClassName={selectInDialogClassName}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Select
                        value={editDateKey}
                        onValueChange={(value) => {
                          setEditDateKey(value)
                          setEditStartsAt(undefined)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectInDialogClassName}>
                          {(dateOptions.length > 0
                            ? dateOptions
                            : Array.from({ length: 14 }, (_, index) => {
                                const date = new Date()
                                date.setDate(date.getDate() + index)
                                return date.toISOString().slice(0, 10)
                              })
                          ).map((key) => (
                            <SelectItem key={key} value={key}>
                              {formatDayHeader(key)} · {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Select
                        value={editStartsAt}
                        onValueChange={setEditStartsAt}
                        disabled={slots.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select slot" />
                        </SelectTrigger>
                        <SelectContent className={selectInDialogClassName}>
                          {slots.map((slot) => (
                            <SelectItem key={slot.startsAt} value={slot.startsAt}>
                              {slot.startTimeLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editClientPacks.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Session pack (optional)</Label>
                      <Select
                        value={editSessionPackId}
                        onValueChange={setEditSessionPackId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pack" />
                        </SelectTrigger>
                        <SelectContent className={selectInDialogClassName}>
                          {editClientPacks.map((pack) => (
                            <SelectItem key={pack.id} value={pack.id}>
                              {pack.label} ({sessionsRemaining(pack)} left)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={editLocation}
                      onChange={(event) => setEditLocation(event.target.value)}
                      placeholder="Gym, studio, Zoom…"
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || !editStartsAt}
                    onClick={() => void handleSaveDetails()}
                  >
                    Save changes
                  </Button>
                </div>
              ) : null}

              {!appointment.session_pack_id && clientPacks.length > 0 ? (
                <div className="space-y-2">
                  <Label>Deduct session pack on no-show (optional)</Label>
                  <Select value={noShowPackId} onValueChange={setNoShowPackId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientPacks.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.label} ({sessionsRemaining(pack)} left)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleStatus('completed')}
                >
                  Mark completed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleStatus('no_show')}
                >
                  Mark no show
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (hasActiveSeries) {
                      setCancelScope('single')
                      setShowCancelDialog(true)
                    } else {
                      void handleCancel('single')
                    }
                  }}
                >
                  Cancel session
                </Button>
              </div>

              {hasActiveSeries ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => endSeriesConfirm.open()}
                >
                  Stop all future sessions
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 border-t pt-4">
            <p className="text-muted-foreground text-sm">
              {canManage
                ? 'Cancel keeps the session on your calendar as cancelled and notifies the client. Delete removes it entirely.'
                : 'Remove this session from your calendar permanently.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setShowEditDetails(false)
                  setShowDuplicate((value) => !value)
                }}
              >
                Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={pending}
                onClick={deleteConfirm.open}
              >
                Delete session
              </Button>
            </div>
            {showDuplicate ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Book another session for {appointment.client?.full_name ?? 'this client'}{' '}
                  with the same location and pre-session notes.
                </p>
                {slotPicker(
                  duplicateDateKey,
                  duplicateStartsAt,
                  setDuplicateDateKey,
                  setDuplicateStartsAt,
                  'Confirm duplicate',
                  handleDuplicate
                )}
              </>
            ) : null}
          </div>
        </div>
        </div>
        {deleteConfirm.dialog}
        {endSeriesConfirm.dialog}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel recurring session</DialogTitle>
              <DialogDescription>
                Choose whether to cancel just this session or this one and all
                later sessions in the series.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="cancel-scope"
                  checked={cancelScope === 'single'}
                  onChange={() => setCancelScope('single')}
                  className="mt-1 size-4 rounded-full border"
                />
                <span>
                  <span className="font-medium">This session only</span>
                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    Later weekly sessions stay scheduled.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="cancel-scope"
                  checked={cancelScope === 'this_and_future'}
                  onChange={() => setCancelScope('this_and_future')}
                  className="mt-1 size-4 rounded-full border"
                />
                <span>
                  <span className="font-medium">This and all future sessions</span>
                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    Cancels from this session onward and stops the weekly series.
                  </span>
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setShowCancelDialog(false)}
              >
                Keep session
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => void handleConfirmCancel()}
              >
                {pending ? 'Cancelling…' : 'Cancel session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
