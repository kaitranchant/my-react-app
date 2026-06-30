'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createClientInvoiceAction } from '@/app/(dashboard)/billing/actions'
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

type CreateInvoiceDialogProps = {
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

export function CreateInvoiceDialog({
  clients,
  disabled = false,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [clientId, setClientId] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')

  const billableClients = clients.filter((client) => client.email?.trim())

  function resetForm() {
    setClientId('')
    setAmount('')
    setDescription('')
    setDueDate('')
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
      const result = await createClientInvoiceAction({
        clientId,
        amountCents,
        description: description.trim(),
        dueDate: dueDate || undefined,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Invoice sent to client.')
      resetForm()
      setOpen(false)
    } catch {
      toast.error('Could not create invoice.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled || billableClients.length === 0}>
          <Plus className="size-4" />
          Create invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="invoice-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="invoice-client">
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

          <div className="space-y-2">
            <Label htmlFor="invoice-amount">Amount (USD)</Label>
            <Input
              id="invoice-amount"
              inputMode="decimal"
              placeholder="100.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-description">Description</Label>
            <Textarea
              id="invoice-description"
              placeholder="Monthly coaching — March"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-due-date">Due date (optional)</Label>
            <Input
              id="invoice-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
