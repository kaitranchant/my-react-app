'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createAvailabilityException,
  deleteAvailabilityException,
} from '@/app/(dashboard)/scheduling/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import type { CoachAvailabilityException } from '@/lib/session-booking-types'

type AvailabilityExceptionsPanelProps = {
  initialExceptions: CoachAvailabilityException[]
}

function formatExceptionWindow(exception: CoachAvailabilityException): string {
  if (!exception.start_time || !exception.end_time) {
    return 'All day'
  }
  return `${exception.start_time.slice(0, 5)} – ${exception.end_time.slice(0, 5)}`
}

export function AvailabilityExceptionsPanel({
  initialExceptions,
}: AvailabilityExceptionsPanelProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [exceptionDate, setExceptionDate] = React.useState(toDateKey(new Date()))
  const [exceptionType, setExceptionType] = React.useState<'blocked' | 'extra_hours'>(
    'blocked'
  )
  const [allDay, setAllDay] = React.useState(true)
  const [startTime, setStartTime] = React.useState('09:00')
  const [endTime, setEndTime] = React.useState('17:00')
  const [notes, setNotes] = React.useState('')

  const sortedExceptions = [...initialExceptions].sort((a, b) =>
    a.exception_date.localeCompare(b.exception_date)
  )

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await createAvailabilityException({
      exceptionDate,
      exceptionType,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      notes: notes.trim() || null,
    })

    setPending(false)

    if (result.success) {
      toast.success(
        exceptionType === 'blocked' ? 'Blocked date added' : 'Extra hours added'
      )
      setOpen(false)
      setNotes('')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(exceptionId: string) {
    setDeletingId(exceptionId)
    const result = await deleteAvailabilityException(exceptionId)
    setDeletingId(null)

    if (result.success) {
      toast.success('Exception removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="helper-text">
          Block vacation days or add one-off availability outside your weekly hours.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 size-4" />
              Add exception
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Availability exception</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={exceptionDate}
                  onChange={(event) => setExceptionDate(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={exceptionType}
                  onValueChange={(value) =>
                    setExceptionType(value as 'blocked' | 'extra_hours')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocked">Block time off</SelectItem>
                    <SelectItem value="extra_hours">Extra availability</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time range</Label>
                <Select
                  value={allDay ? 'all_day' : 'custom'}
                  onValueChange={(value) => setAllDay(value === 'all_day')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_day">All day</SelectItem>
                    <SelectItem value="custom">Specific hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!allDay ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Vacation, holiday, special session…"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Save exception
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sortedExceptions.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <CalendarOff className="size-4 shrink-0" />
          <span>No upcoming exceptions.</span>
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {sortedExceptions.map((exception) => (
            <li
              key={exception.id}
              className="flex items-start justify-between gap-3 p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {formatDayHeader(exception.exception_date)} ·{' '}
                  {exception.exception_date}
                </p>
                <p className="text-muted-foreground text-sm">
                  {exception.exception_type === 'blocked'
                    ? 'Blocked'
                    : 'Extra hours'}{' '}
                  · {formatExceptionWindow(exception)}
                </p>
                {exception.notes ? (
                  <p className="text-muted-foreground text-sm">{exception.notes}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove exception"
                disabled={deletingId === exception.id}
                onClick={() => handleDelete(exception.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
