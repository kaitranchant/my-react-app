'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  fetchClientLimitResolutionState,
  resolveClientLimitByKeepingClients,
  type ClientLimitResolutionState,
} from '@/app/(dashboard)/billing/client-limit-actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
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

type RequiredState = Extract<ClientLimitResolutionState, { required: true }>

const UPGRADE_ROUTES = ['/pricing', '/settings']

export function ClientLimitResolutionGate() {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = React.useState<RequiredState | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [browsingUpgrade, setBrowsingUpgrade] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    const next = await fetchClientLimitResolutionState()
    if (next.required) {
      setState(next)
      setSelectedIds((current) => {
        if (current.length > 0) {
          const valid = new Set(next.clients.map((c) => c.id))
          const kept = current.filter((id) => valid.has(id)).slice(0, next.clientLimit)
          if (kept.length > 0) return kept
        }
        return next.clients.slice(0, next.clientLimit).map((c) => c.id)
      })
    } else {
      setState(null)
      setBrowsingUpgrade(false)
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    void load()
  }, [load, pathname])

  React.useEffect(() => {
    if (!browsingUpgrade) return
    if (!UPGRADE_ROUTES.some((route) => pathname.startsWith(route))) {
      setBrowsingUpgrade(false)
    }
  }, [browsingUpgrade, pathname])

  function toggleClient(clientId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        if (!state || current.length >= state.clientLimit) {
          toast.error(
            `You can keep at most ${state?.clientLimit ?? 0} clients on ${state?.planLabel ?? 'this plan'}.`
          )
          return current
        }
        if (current.includes(clientId)) return current
        return [...current, clientId]
      }
      return current.filter((id) => id !== clientId)
    })
  }

  async function handleKeepSelected() {
    if (!state) return
    if (selectedIds.length > state.clientLimit) {
      toast.error(`Keep at most ${state.clientLimit} clients.`)
      return
    }

    setPending(true)
    const result = await resolveClientLimitByKeepingClients(selectedIds)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Client roster updated for your plan')
    setState(null)
    router.refresh()
  }

  function handleUpgradePlan() {
    setBrowsingUpgrade(true)
    router.push('/pricing')
  }

  const onUpgradeRoute = UPGRADE_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const showGate =
    !loading && state != null && !(browsingUpgrade && onUpgradeRoute)

  if (!showGate || !state) return null

  const archiveCount = Math.max(0, state.billableClientCount - selectedIds.length)

  return (
    <Dialog open>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle>Choose clients to keep</DialogTitle>
          <DialogDescription>
            Your facility seat ended and you&apos;re back on {state.planLabel},
            which includes up to {state.clientLimit} clients. You currently have{' '}
            {state.billableClientCount}. Keep up to {state.clientLimit}, or
            upgrade for a higher limit. Unselected clients will be archived.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <p className="text-muted-foreground text-xs">
            Selected {selectedIds.length} of {state.clientLimit} allowed
            {archiveCount > 0
              ? ` · ${archiveCount} will be archived`
              : ''}
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border p-2">
            {state.clients.map((client) => {
              const checked = selectedIds.includes(client.id)
              return (
                <Label
                  key={client.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2"
                >
                  <input
                    type="checkbox"
                    className="accent-primary size-4 shrink-0"
                    checked={checked}
                    onChange={(event) =>
                      toggleClient(client.id, event.target.checked)
                    }
                  />
                  <ClientAvatar
                    name={client.full_name}
                    avatarUrl={client.avatar_url}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {client.full_name}
                  </span>
                </Label>
              )
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleUpgradePlan}>
            Upgrade plan
          </Button>
          <Button
            type="button"
            onClick={() => void handleKeepSelected()}
            disabled={pending}
          >
            {pending
              ? 'Saving…'
              : archiveCount > 0
                ? selectedIds.length === 0
                  ? `Archive all ${archiveCount}`
                  : `Keep ${selectedIds.length} & archive ${archiveCount}`
                : `Keep ${selectedIds.length} clients`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
