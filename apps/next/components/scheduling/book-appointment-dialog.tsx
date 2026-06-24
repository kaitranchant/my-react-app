'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  bookCoachingAppointmentAsCoach,
  getCoachAvailableSlots,
} from '@/app/(dashboard)/scheduling/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { formatDayHeader, toDateKey } from '@/lib/calendar'
import type { AvailableSlot } from '@/lib/session-booking-slots'
import type { ClientSessionPack } from '@/lib/session-booking-types'
import { isSessionPackActive, sessionsRemaining } from '@/lib/session-booking-slots'

const selectInDialogClassName = 'z-[100] max-h-60'

type BookAppointmentDialogProps = {
  clients: Array<{ id: string; full_name: string | null }>
  sessionPacks: ClientSessionPack[]
  dateOptions: string[]
  defaultLocation?: string | null
  requiresSessionPack?: boolean
}

export function BookAppointmentDialog({
  clients,
  sessionPacks,
  dateOptions,
  defaultLocation,
  requiresSessionPack = false,
}: BookAppointmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [clientId, setClientId] = React.useState('')
  const [dateKey, setDateKey] = React.useState('')
  const [slots, setSlots] = React.useState<AvailableSlot[]>([])
  const [startsAt, setStartsAt] = React.useState<string | undefined>()
  const [sessionPackId, setSessionPackId] = React.useState<string | undefined>()
  const [location, setLocation] = React.useState(defaultLocation ?? '')
  const [notes, setNotes] = React.useState('')
  const [repeatWeekly, setRepeatWeekly] = React.useState(false)
  const [repeatWeeks, setRepeatWeeks] = React.useState('4')

  const clientPacks = sessionPacks.filter(
    (pack) =>
      pack.client_id === clientId &&
      isSessionPackActive(pack, dateKey)
  )

  React.useEffect(() => {
    if (!open) return
    setClientId(clients[0]?.id ?? '')
    setDateKey(dateOptions[0] ?? toDateKey(new Date()))
    setStartsAt(undefined)
    setSessionPackId(undefined)
    setLocation(defaultLocation ?? '')
    setNotes('')
    setRepeatWeekly(false)
    setRepeatWeeks('4')
  }, [open, clients, dateOptions, defaultLocation])

  React.useEffect(() => {
    if (!open || !dateKey) {
      setSlots([])
      return
    }

    let cancelled = false
    setLoadingSlots(true)

    getCoachAvailableSlots(dateKey).then((result) => {
      if (cancelled) return
      setLoadingSlots(false)
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
  }, [open, dateKey])

  React.useEffect(() => {
    setStartsAt(undefined)
    setSessionPackId(undefined)
  }, [clientId, dateKey])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!clientId || !startsAt) {
      toast.error('Select a client and time slot.')
      return
    }

    setPending(true)
    const result = await bookCoachingAppointmentAsCoach({
      clientId,
      startsAt,
      sessionPackId: sessionPackId ?? null,
      location: location || null,
      notes: notes || null,
      repeatWeekly,
      repeatWeeks: repeatWeekly ? Number(repeatWeeks) : undefined,
    })
    setPending(false)

    if (result.success) {
      toast.success(
        repeatWeekly
          ? `${repeatWeeks} weekly sessions booked`
          : 'Session booked'
      )
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const timePlaceholder = loadingSlots
    ? 'Loading times…'
    : slots.length === 0
      ? 'No times available'
      : 'Select slot'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="mr-2 size-4" />
          Book session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a session</DialogTitle>
          <DialogDescription>
            Schedule a 1:1 coaching session for a client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Select value={dateKey} onValueChange={setDateKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className={selectInDialogClassName}>
                  {dateOptions.map((key) => (
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
                onValueChange={setStartsAt}
                disabled={loadingSlots || slots.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={timePlaceholder} />
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

          {!loadingSlots && slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No open times on this date. Add weekly hours under Availability, or
              pick another date.
            </p>
          ) : null}

          {(requiresSessionPack || clientPacks.length > 0) && (
            <div className="space-y-2">
              <Label>Session pack {requiresSessionPack ? '' : '(optional)'}</Label>
              <Select
                value={sessionPackId}
                onValueChange={setSessionPackId}
                disabled={clientPacks.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pack" />
                </SelectTrigger>
                <SelectContent className={selectInDialogClassName}>
                  {clientPacks.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>
                      {pack.label} ({sessionsRemaining(pack)} left)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Gym, studio, Zoom…"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Pre-session plan (optional)"
            />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={repeatWeekly}
                onChange={(event) => setRepeatWeekly(event.target.checked)}
                className="size-4 rounded border"
              />
              Repeat weekly
            </label>
            {repeatWeekly ? (
              <div className="space-y-2">
                <Label>Number of weeks</Label>
                <Input
                  type="number"
                  min={2}
                  max={12}
                  value={repeatWeeks}
                  onChange={(event) => setRepeatWeeks(event.target.value)}
                  className="w-24"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending || !startsAt}>
              Book session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
