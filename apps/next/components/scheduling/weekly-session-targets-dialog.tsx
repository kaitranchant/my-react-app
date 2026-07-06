'use client'

import * as React from 'react'
import { toast } from 'sonner'

import {
  updateClientWeeklySessionDefault,
  upsertClientWeeklySessionTarget,
} from '@/app/(dashboard)/scheduling/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  clientDefaultsFromClients,
  countScheduledSessionsForClient,
  resolveClientTarget,
  type ClientWeeklySessionDefault,
} from '@/lib/weekly-session-targets'
import type { CoachingAppointment } from '@/lib/session-booking-types'

type WeeklySessionTargetsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekStartKey: string
  clients: ClientWeeklySessionDefault[]
  weekOverrides: Map<string, number>
  appointments: CoachingAppointment[]
  onSaved: () => void
}

type DraftValue = {
  value: string
  dirty: boolean
}

function parseTargetInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function WeeklySessionTargetsDialog({
  open,
  onOpenChange,
  weekStartKey,
  clients,
  weekOverrides,
  appointments,
  onSaved,
}: WeeklySessionTargetsDialogProps) {
  const [defaultDrafts, setDefaultDrafts] = React.useState<
    Record<string, DraftValue>
  >({})
  const [overrideDrafts, setOverrideDrafts] = React.useState<
    Record<string, DraftValue>
  >({})
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      return
    }

    const nextDefaults: Record<string, DraftValue> = {}
    const nextOverrides: Record<string, DraftValue> = {}
    for (const client of clients) {
      nextDefaults[client.id] = {
        value:
          client.weekly_session_target == null
            ? ''
            : String(client.weekly_session_target),
        dirty: false,
      }
      const override = weekOverrides.get(client.id)
      nextOverrides[client.id] = {
        value: override == null ? '' : String(override),
        dirty: false,
      }
    }
    setDefaultDrafts(nextDefaults)
    setOverrideDrafts(nextOverrides)
  }, [clients, open, weekOverrides])

  const effectiveDefaults = React.useMemo(() => {
    const map = clientDefaultsFromClients(clients)
    for (const client of clients) {
      const draft = defaultDrafts[client.id]
      if (!draft?.dirty) {
        continue
      }
      map.set(client.id, parseTargetInput(draft.value))
    }
    return map
  }, [clients, defaultDrafts])

  function setDefaultDraft(clientId: string, value: string) {
    setDefaultDrafts((current) => ({
      ...current,
      [clientId]: { value, dirty: true },
    }))
  }

  function setOverrideDraft(clientId: string, value: string) {
    setOverrideDrafts((current) => ({
      ...current,
      [clientId]: { value, dirty: true },
    }))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      for (const client of clients) {
        const defaultDraft = defaultDrafts[client.id]
        if (defaultDraft?.dirty) {
          const weeklySessionTarget = parseTargetInput(defaultDraft.value)
          if (
            defaultDraft.value.trim() !== '' &&
            (weeklySessionTarget == null ||
              weeklySessionTarget < 1 ||
              weeklySessionTarget > 14)
          ) {
            toast.error('Default targets must be between 1 and 14.')
            return
          }

          const result = await updateClientWeeklySessionDefault({
            clientId: client.id,
            weeklySessionTarget,
          })
          if (!result.success) {
            toast.error(result.error)
            return
          }
        }

        const overrideDraft = overrideDrafts[client.id]
          if (overrideDraft?.dirty) {
            const trimmed = overrideDraft.value.trim()
            const overrideValue = trimmed === '' ? null : Number(trimmed)
            if (
              overrideValue != null &&
              (!Number.isFinite(overrideValue) ||
                overrideValue < 1 ||
                overrideValue > 14)
            ) {
              toast.error('This-week overrides must be between 1 and 14.')
              return
            }

            const result = await upsertClientWeeklySessionTarget({
              clientId: client.id,
              weekStartKey,
              targetSessions: overrideValue,
            })
          if (!result.success) {
            toast.error(result.error)
            return
          }
        }
      }

      toast.success('Weekly targets saved')
      onSaved()
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = clients.some(
    (client) =>
      defaultDrafts[client.id]?.dirty || overrideDrafts[client.id]?.dirty
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Weekly session targets</DialogTitle>
          <DialogDescription>
            Set each client&apos;s default sessions per week, or override the
            target for this week only. Leave this week blank to use the default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4rem] gap-2 px-1 text-xs font-medium">
            <span>Client</span>
            <span className="text-center">Default</span>
            <span className="text-center">This week</span>
            <span className="text-right">Scheduled</span>
          </div>

          {clients.length === 0 ? (
            <p className="text-muted-foreground px-1 py-6 text-sm">
              No active clients yet.
            </p>
          ) : (
            clients.map((client) => {
              const defaultDraft = defaultDrafts[client.id]
              const overrideDraft = overrideDrafts[client.id]
              const resolvedOverrides = new Map(weekOverrides)
              if (overrideDraft?.dirty) {
                const overrideValue = parseTargetInput(overrideDraft.value)
                if (overrideValue == null) {
                  resolvedOverrides.delete(client.id)
                } else {
                  resolvedOverrides.set(client.id, overrideValue)
                }
              }

              const resolvedTarget = resolveClientTarget(
                client.id,
                effectiveDefaults,
                resolvedOverrides
              )
              const scheduled = countScheduledSessionsForClient(
                appointments,
                client.id
              )

              return (
                <div
                  key={client.id}
                  className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4rem] items-center gap-2 rounded-md border px-2 py-2"
                >
                  <p className="truncate text-sm font-medium">
                    {client.full_name ?? 'Client'}
                  </p>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={14}
                    className="h-8 px-2 text-center text-sm tabular-nums"
                    placeholder="—"
                    value={defaultDraft?.value ?? ''}
                    onChange={(event) =>
                      setDefaultDraft(client.id, event.target.value)
                    }
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={14}
                    className="h-8 px-2 text-center text-sm tabular-nums"
                    placeholder="—"
                    value={overrideDraft?.value ?? ''}
                    onChange={(event) =>
                      setOverrideDraft(client.id, event.target.value)
                    }
                  />
                  <p
                    className={
                      resolvedTarget != null && scheduled < resolvedTarget
                        ? 'text-right text-sm font-medium text-amber-600 dark:text-amber-300'
                        : 'text-right text-sm font-medium tabular-nums'
                    }
                  >
                    {resolvedTarget == null ? '—' : `${scheduled}/${resolvedTarget}`}
                  </p>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving…' : 'Save targets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
