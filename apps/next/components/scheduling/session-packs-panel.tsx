'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createSessionPack,
  deleteSessionPack,
  getSessionPackUsage,
} from '@/app/(dashboard)/scheduling/actions'
import { Badge } from '@/components/ui/badge'
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
import { formatAppointmentRange } from '@/lib/session-booking-slots'
import { sessionsRemaining } from '@/lib/session-booking-slots'
import {
  appointmentStatusLabels,
  type ClientSessionPack,
  type CoachingAppointment,
} from '@/lib/session-booking-types'

type SessionPacksPanelProps = {
  clients: Array<{ id: string; full_name: string | null }>
  packs: ClientSessionPack[]
  coachTimezone: import('@/lib/coach-preferences').CoachPreferences['timezone']
}

function formatPrice(priceCents: number | null) {
  if (priceCents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
}

function PackUsageHistory({
  packId,
  coachTimezone,
}: {
  packId: string
  coachTimezone: import('@/lib/coach-preferences').CoachPreferences['timezone']
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [usage, setUsage] = React.useState<CoachingAppointment[]>([])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    getSessionPackUsage(packId).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.success) {
        setUsage(result.usage)
      } else {
        toast.error(result.error)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, packId])

  return (
    <div className="pt-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronUp className="mr-1 size-4" />
        ) : (
          <ChevronDown className="mr-1 size-4" />
        )}
        Usage history
      </Button>
      {open ? (
        <div className="mt-2 space-y-2">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : usage.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions charged yet.</p>
          ) : (
            <ul className="space-y-2">
              {usage.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {formatAppointmentRange(
                      entry.starts_at,
                      entry.ends_at,
                      coachTimezone
                    )}
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {appointmentStatusLabels[entry.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function SessionPacksPanel({
  clients,
  packs,
  coachTimezone,
}: SessionPacksPanelProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [clientId, setClientId] = React.useState(clients[0]?.id ?? '')
  const [label, setLabel] = React.useState('10-session pack')
  const [totalSessions, setTotalSessions] = React.useState('10')
  const [price, setPrice] = React.useState('500')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [notes, setNotes] = React.useState('')

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const priceCents = price.trim()
      ? Math.round(Number(price) * 100)
      : null
    const result = await createSessionPack({
      clientId,
      label,
      totalSessions: Number(totalSessions),
      expiresAt: expiresAt || null,
      priceCents: Number.isFinite(priceCents) ? priceCents : null,
      notes: notes || null,
    })
    setPending(false)

    if (result.success) {
      toast.success('Session pack created')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(packId: string) {
    const result = await deleteSessionPack(packId)
    if (result.success) {
      toast.success('Session pack removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="helper-text">
          Track prepaid session credits for in-person and hybrid clients.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 size-4" />
              Add pack
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create session pack</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name ?? 'Unnamed client'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Total sessions</Label>
                  <Input
                    type="number"
                    min={1}
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price paid (optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expires (optional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Create pack
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {packs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">No session packs yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Session packs track prepaid credits. For example:{' '}
            <span className="text-foreground">10-session pack · $500 · expires in 90 days</span>
          </p>
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {packs.map((pack) => (
            <li key={pack.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{pack.label}</p>
                    <Badge variant="secondary" className="font-normal">
                      {sessionsRemaining(pack)} of {pack.total_sessions} remaining
                    </Badge>
                  </div>
                  <div className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
                    <span>Client: {pack.client?.full_name ?? '—'}</span>
                    <span>Price paid: {formatPrice(pack.price_cents)}</span>
                    <span>Total sessions: {pack.total_sessions}</span>
                    <span>
                      Expires: {pack.expires_at ? pack.expires_at : 'No expiry'}
                    </span>
                  </div>
                  <PackUsageHistory packId={pack.id} coachTimezone={coachTimezone} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete pack"
                  onClick={() => handleDelete(pack.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
