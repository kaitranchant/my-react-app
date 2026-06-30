'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createClientSubscriptionAction } from '@/app/(dashboard)/billing/actions'
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

type CreateSubscriptionDialogProps = {
  clients: Array<{ id: string; full_name: string | null; email: string | null }>
  disabled?: boolean
}

function parseAmountToCents(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return Math.round(parsed * 100)
}

export function CreateSubscriptionDialog({
  clients,
  disabled = false,
}: CreateSubscriptionDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [clientId, setClientId] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [interval, setInterval] = React.useState<'month' | 'year'>('month')
  const [description, setDescription] = React.useState('')

  const billableClients = clients.filter((client) => client.email?.trim())

  function resetForm() {
    setClientId('')
    setAmount('')
    setInterval('month')
    setDescription('')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const amountCents = parseAmountToCents(amount)
    if (!clientId) {
      toast.error('Select a client.')
      return
    }
    if (!amountCents) {
      toast.error('Enter a valid amount.')
      return
    }
    if (!description.trim()) {
      toast.error('Description is required.')
      return
    }

    setLoading(true)
    try {
      const result = await createClientSubscriptionAction({
        clientId,
        amountCents,
        interval,
        description: description.trim(),
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Subscription created. Share the checkout link with your client.')
      resetForm()
      setOpen(false)
    } catch {
      toast.error('Could not create subscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled || billableClients.length === 0}>
          <Plus className="size-4" />
          Recurring billing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up recurring billing</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="subscription-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="subscription-client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {billableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name ?? 'Unnamed client'}
                    {client.email ? ` (${client.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subscription-amount">Amount (USD)</Label>
              <Input
                id="subscription-amount"
                inputMode="decimal"
                placeholder="250.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription-interval">Interval</Label>
              <Select
                value={interval}
                onValueChange={(value) => setInterval(value as 'month' | 'year')}
              >
                <SelectTrigger id="subscription-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscription-description">Description</Label>
            <Textarea
              id="subscription-description"
              placeholder="Monthly coaching retainer"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Your client can complete payment from their portal billing page once
            this subscription is created.
          </p>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
