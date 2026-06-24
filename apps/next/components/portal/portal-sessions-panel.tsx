'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, CalendarOff } from 'lucide-react'
import { toast } from 'sonner'

import {
  bookCoachingAppointmentAsClient,
  getClientAvailableSlots,
} from '@/app/(dashboard)/scheduling/actions'
import { AppointmentsList } from '@/components/scheduling/appointments-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { AvailableSlot } from '@/lib/session-booking-slots'
import {
  isSessionPackActive,
  sessionsRemaining,
} from '@/lib/session-booking-slots'
import type {
  ClientSessionPack,
  CoachingAppointment,
  SessionBookingSettings,
} from '@/lib/session-booking-types'

type PortalSessionsPanelProps = {
  appointments: CoachingAppointment[]
  sessionPacks: ClientSessionPack[]
  settings: SessionBookingSettings
  coachPreferences: CoachPreferences
  dateOptions: string[]
  bookingEnabled: boolean
}

export function PortalSessionsPanel({
  appointments,
  sessionPacks,
  settings,
  coachPreferences,
  dateOptions,
  bookingEnabled,
}: PortalSessionsPanelProps) {
  const router = useRouter()
  const [dateKey, setDateKey] = React.useState(dateOptions[0] ?? '')
  const [slots, setSlots] = React.useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [startsAt, setStartsAt] = React.useState<string | undefined>()
  const [sessionPackId, setSessionPackId] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [pending, setPending] = React.useState(false)

  const activePacks = sessionPacks.filter((pack) =>
    isSessionPackActive(pack, dateKey)
  )

  React.useEffect(() => {
    if (!bookingEnabled || !dateKey) {
      setSlots([])
      return
    }

    let cancelled = false
    setLoadingSlots(true)

    getClientAvailableSlots(dateKey).then((result) => {
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
  }, [bookingEnabled, dateKey])

  React.useEffect(() => {
    setStartsAt(undefined)
    setSessionPackId('')
  }, [dateKey])

  async function handleBook(event: React.FormEvent) {
    event.preventDefault()
    if (!startsAt) {
      toast.error('Select a time slot.')
      return
    }

    setPending(true)
    const result = await bookCoachingAppointmentAsClient({
      startsAt,
      sessionPackId: sessionPackId || null,
      notes: notes || null,
      location: null,
      coachingType: null,
    })
    setPending(false)

    if (result.success) {
      toast.success('Session booked')
      setNotes('')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const upcoming = appointments.filter(
    (appointment) =>
      appointment.status === 'scheduled' &&
      new Date(appointment.starts_at).getTime() >= Date.now()
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsList
            appointments={upcoming}
            coachPreferences={coachPreferences}
            showClient={false}
            allowClientCancel
            emptyIcon={CalendarOff}
            emptyTitle="No upcoming sessions"
            emptyDescription={
              bookingEnabled
                ? 'Pick a date and time below to book your next session.'
                : 'Your coach will schedule sessions with you directly.'
            }
          />
        </CardContent>
      </Card>

      {bookingEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Book a session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBook} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Select value={dateKey} onValueChange={setDateKey}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateOptions.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
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
                      <SelectValue
                        placeholder={
                          loadingSlots ? 'Loading…' : 'Select slot'
                        }
                      />
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

              {(settings.booking_requires_session_pack || activePacks.length > 0) && (
                <div className="space-y-2">
                  <Label>
                    Session pack {settings.booking_requires_session_pack ? '' : '(optional)'}
                  </Label>
                  <Select value={sessionPackId} onValueChange={setSessionPackId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePacks.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.label} ({sessionsRemaining(pack)} left)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes for your coach</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={pending || slots.length === 0}>
                Book session
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CalendarClock}
              title="Self-booking is not enabled"
              description="Your coach has not opened booking yet. Send them a message to schedule a session."
              action={{ label: 'Message coach', href: '/portal/messages' }}
            />
          </CardContent>
        </Card>
      )}

      {sessionPacks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Session packs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {sessionPacks.map((pack) => (
                <li key={pack.id} className="flex justify-between gap-3">
                  <span>{pack.label}</span>
                  <span className="text-muted-foreground">
                    {sessionsRemaining(pack)} of {pack.total_sessions} left
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
