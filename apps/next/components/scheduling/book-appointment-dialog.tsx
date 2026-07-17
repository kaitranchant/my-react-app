'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  bookCoachingAppointmentAsCoach,
  getCoachAvailableSlots,
} from '@/app/(dashboard)/scheduling/actions'
import { SessionTypeSelect } from '@/components/scheduling/session-type-select'
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
import { formatDayHeader, getWeekStartDateKey, parseDateKey, toDateKey, WEEKDAY_OPTIONS } from '@/lib/calendar'
import { getBrowserTimeZone } from '@/lib/browser-timezone'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { AvailableSlot } from '@/lib/session-booking-slots'
import type { ClientSessionPack } from '@/lib/session-booking-types'
import { isSessionPackActive, sessionsRemaining } from '@/lib/session-booking-slots'
import { defaultCoachingSessionType } from '@/lib/coaching-session-types'
import type { CoachingSessionType } from 'app/types/database'

const selectInDialogClassName = 'z-[100] max-h-60'

type BookAppointmentDialogProps = {
  clients: Array<{ id: string; full_name: string | null }>
  sessionPacks: ClientSessionPack[]
  dateOptions: string[]
  defaultLocation?: string | null
  requiresSessionPack?: boolean
  weekStartsOn?: CoachPreferences['weekStartsOn']
}

export function BookAppointmentDialog({
  clients,
  sessionPacks,
  dateOptions,
  defaultLocation,
  requiresSessionPack = false,
  weekStartsOn = 'monday',
}: BookAppointmentDialogProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const handledBookShortcutRef = React.useRef(false)
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [clientId, setClientId] = React.useState('')
  const [dateKey, setDateKey] = React.useState('')
  const [slots, setSlots] = React.useState<AvailableSlot[]>([])
  const [startsAt, setStartsAt] = React.useState<string | undefined>()
  const [sessionPackId, setSessionPackId] = React.useState<string | undefined>()
  const [sessionType, setSessionType] =
    React.useState<CoachingSessionType>(defaultCoachingSessionType)
  const [location, setLocation] = React.useState(defaultLocation ?? '')
  const [notes, setNotes] = React.useState('')
  const [repeatWeekly, setRepeatWeekly] = React.useState(false)
  const [repeatMode, setRepeatMode] = React.useState<'fixed' | 'ongoing'>('fixed')
  const [repeatWeeks, setRepeatWeeks] = React.useState('4')
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = React.useState<number[]>([])

  const clientPacks = sessionPacks.filter(
    (pack) =>
      pack.client_id === clientId &&
      isSessionPackActive(pack, dateKey)
  )

  React.useEffect(() => {
    if (handledBookShortcutRef.current) return
    if (searchParams.get('book') !== '1') return

    handledBookShortcutRef.current = true
    setOpen(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('book')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  React.useEffect(() => {
    if (!open) return
    setClientId(clients[0]?.id ?? '')
    setDateKey(dateOptions[0] ?? toDateKey(new Date()))
    setStartsAt(undefined)
    setSessionPackId(undefined)
    setSessionType(defaultCoachingSessionType)
    setLocation(defaultLocation ?? '')
    setNotes('')
    setRepeatWeekly(false)
    setRepeatMode('fixed')
    setRepeatWeeks('4')
    setRepeatDaysOfWeek([])
  }, [open, clients, dateOptions, defaultLocation])

  React.useEffect(() => {
    if (!dateKey) return
    setRepeatDaysOfWeek([parseDateKey(dateKey).getDay()])
  }, [dateKey])

  function toggleRepeatDay(dayOfWeek: number) {
    setRepeatDaysOfWeek((current) => {
      if (current.includes(dayOfWeek)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((day) => day !== dayOfWeek)
      }
      return [...current, dayOfWeek].sort((left, right) => left - right)
    })
  }

  React.useEffect(() => {
    if (!open || !dateKey) {
      setSlots([])
      return
    }

    let cancelled = false
    setLoadingSlots(true)

    getCoachAvailableSlots(dateKey, getBrowserTimeZone()).then((result) => {
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
      sessionType,
      repeatWeekly,
      repeatIndefinitely: repeatWeekly && repeatMode === 'ongoing',
      repeatWeeks:
        repeatWeekly && repeatMode === 'fixed' ? Number(repeatWeeks) : undefined,
      repeatDaysOfWeek: repeatWeekly ? repeatDaysOfWeek : undefined,
      clientTimeZone: getBrowserTimeZone(),
    })
    setPending(false)

    if (result.success) {
      const dayLabel =
        repeatWeekly && repeatDaysOfWeek.length > 1
          ? `${repeatDaysOfWeek.length} days per week`
          : 'weekly'
      toast.success(
        repeatWeekly
          ? repeatMode === 'ongoing'
            ? `Recurring sessions booked (${dayLabel})`
            : `${repeatWeeks} weeks booked (${dayLabel})`
          : 'Session booked'
      )
      setOpen(false)
      const bookedDateKey =
        dateKey ||
        (startsAt ? toDateKey(new Date(startsAt)) : toDateKey(new Date()))
      const weekStart = getWeekStartDateKey(bookedDateKey, weekStartsOn)
      window.dispatchEvent(new Event('scheduling:appointments-changed'))
      router.push(`/scheduling?view=week&week=${weekStart}`)
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
      <DialogContent
        viewport
        className="flex max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pr-12">
          <DialogTitle>Book a session</DialogTitle>
          <DialogDescription>
            Schedule a session for a client.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div
            data-nested-keyboard-scroll=""
            className="min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-y-contain px-6 py-4 [-webkit-overflow-scrolling:touch]"
          >
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

          <SessionTypeSelect
            value={sessionType}
            onValueChange={setSessionType}
            contentClassName={selectInDialogClassName}
          />

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
              No open times on this date — all slots are already booked. Pick
              another date or time.
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
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Repeat on</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const selected = repeatDaysOfWeek.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleRepeatDay(day.value)}
                          className={
                            selected
                              ? 'bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 rounded-md px-2.5 py-1 text-xs font-medium'
                          }
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Select one or more days. Each day repeats at the same time
                    every week.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Repeat schedule</Label>
                  <div className="grid gap-2">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="repeat-mode"
                        checked={repeatMode === 'fixed'}
                        onChange={() => setRepeatMode('fixed')}
                        className="mt-1 size-4 rounded-full border"
                      />
                      <span>
                        For a set number of weeks
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="repeat-mode"
                        checked={repeatMode === 'ongoing'}
                        onChange={() => setRepeatMode('ongoing')}
                        className="mt-1 size-4 rounded-full border"
                      />
                      <span>
                        Ongoing every week until I stop it
                      </span>
                    </label>
                  </div>
                </div>
                {repeatMode === 'fixed' ? (
                  <div className="space-y-2">
                    <Label>Number of weeks</Label>
                    <Input
                      type="number"
                      min={2}
                      max={52}
                      value={repeatWeeks}
                      onChange={(event) => setRepeatWeeks(event.target.value)}
                      className="w-24"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Sessions repeat on the selected days at the same time.
                    Conflicts are skipped for future weeks; stop a series anytime
                    from a session&apos;s manage dialog.
                  </p>
                )}
              </div>
            ) : null}
          </div>
          </div>

          <DialogFooter className="bg-background shrink-0 border-t px-6 py-4">
            <Button type="submit" disabled={pending || !startsAt}>
              {pending ? 'Booking…' : 'Book session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
