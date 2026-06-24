'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  cancelCoachingAppointment,
  getCoachAvailableSlots,
  rescheduleCoachingAppointment,
  updateCoachingAppointmentNotes,
  updateCoachingAppointmentStatus,
} from '@/app/(dashboard)/scheduling/actions'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDayHeader } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { formatAppointmentRange, getDateKeyFromInstant } from '@/lib/session-booking-slots'
import type { AvailableSlot } from '@/lib/session-booking-slots'
import {
  appointmentStatusLabels,
  type ClientSessionPack,
  type CoachingAppointment,
} from '@/lib/session-booking-types'
import { isSessionPackActive, sessionsRemaining } from '@/lib/session-booking-slots'

type AppointmentManageDialogProps = {
  appointment: CoachingAppointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  coachPreferences: CoachPreferences
  sessionPacks: ClientSessionPack[]
}

export function AppointmentManageDialog({
  appointment,
  open,
  onOpenChange,
  coachPreferences,
  sessionPacks,
}: AppointmentManageDialogProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [preNotes, setPreNotes] = React.useState('')
  const [postNotes, setPostNotes] = React.useState('')
  const [rescheduleDateKey, setRescheduleDateKey] = React.useState('')
  const [slots, setSlots] = React.useState<AvailableSlot[]>([])
  const [rescheduleStartsAt, setRescheduleStartsAt] = React.useState<string>()
  const [noShowPackId, setNoShowPackId] = React.useState<string>()
  const [showReschedule, setShowReschedule] = React.useState(false)

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

  React.useEffect(() => {
    if (!appointment || !open) return
    setPreNotes(appointment.pre_session_notes ?? appointment.notes ?? '')
    setPostNotes(appointment.post_session_notes ?? '')
    setShowReschedule(false)
    setRescheduleStartsAt(undefined)
    setNoShowPackId(appointment.session_pack_id ?? undefined)
    setRescheduleDateKey(
      getDateKeyFromInstant(appointment.starts_at, coachPreferences.timezone)
    )
  }, [appointment, coachPreferences.timezone, open])

  React.useEffect(() => {
    if (!open || !showReschedule || !rescheduleDateKey) {
      setSlots([])
      return
    }

    let cancelled = false
    getCoachAvailableSlots(rescheduleDateKey).then((result) => {
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
  }, [open, rescheduleDateKey, showReschedule])

  if (!appointment) {
    return null
  }

  const canManage = appointment.status === 'scheduled'

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

  async function handleCancel() {
    setPending(true)
    const result = await cancelCoachingAppointment({
      appointmentId: appointment!.id,
      notifyClient: true,
    })
    setPending(false)

    if (result.success) {
      await refreshAfterSuccess('Session cancelled and client notified')
    } else {
      toast.error(result.error)
    }
  }

  async function handleReschedule() {
    if (!rescheduleStartsAt) {
      toast.error('Select a new time slot.')
      return
    }

    setPending(true)
    const result = await rescheduleCoachingAppointment({
      appointmentId: appointment!.id,
      startsAt: rescheduleStartsAt,
      notifyClient: true,
    })
    setPending(false)

    if (result.success) {
      await refreshAfterSuccess('Session rescheduled and client notified')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
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

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{appointmentStatusLabels[appointment.status]}</Badge>
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
                  variant="outline"
                  disabled={pending}
                  onClick={() => setShowReschedule((value) => !value)}
                >
                  Reschedule
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={handleCancel}
                >
                  Cancel session
                </Button>
              </div>

              {showReschedule ? (
                <div className="bg-muted/40 space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>New date</Label>
                      <Select
                        value={rescheduleDateKey}
                        onValueChange={(value) => {
                          setRescheduleDateKey(value)
                          setRescheduleStartsAt(undefined)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 14 }, (_, index) => {
                            const date = new Date()
                            date.setDate(date.getDate() + index)
                            const key = date.toISOString().slice(0, 10)
                            return (
                              <SelectItem key={key} value={key}>
                                {formatDayHeader(key)} · {key}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>New time</Label>
                      <Select
                        value={rescheduleStartsAt}
                        onValueChange={setRescheduleStartsAt}
                        disabled={slots.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select slot" />
                        </SelectTrigger>
                        <SelectContent>
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
                      disabled={pending || !rescheduleStartsAt}
                      onClick={handleReschedule}
                    >
                      Confirm reschedule
                    </Button>
                  </DialogFooter>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
