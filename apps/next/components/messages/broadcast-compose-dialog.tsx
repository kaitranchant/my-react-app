'use client'

import * as React from 'react'
import { Megaphone } from 'lucide-react'
import { toast } from 'sonner'

import {
  sendCoachBroadcast,
  sendCoachVoiceBroadcast,
} from '@/app/(dashboard)/messages/broadcast-actions'
import { VoiceNoteRecorder } from '@/components/messages/voice-note-recorder'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type BroadcastClientOption = {
  id: string
  name: string
}

export type BroadcastTeamOption = {
  id: string
  name: string
  clientIds: string[]
}

type BroadcastComposeDialogProps = {
  clients: BroadcastClientOption[]
  teams: BroadcastTeamOption[]
}

export function BroadcastComposeDialog({
  clients,
  teams,
}: BroadcastComposeDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [body, setBody] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [teamFilter, setTeamFilter] = React.useState<string>('all')
  const [pending, setPending] = React.useState(false)
  const [pendingVoiceFile, setPendingVoiceFile] = React.useState<File | null>(
    null
  )
  const [pendingVoiceDuration, setPendingVoiceDuration] = React.useState(0)

  const visibleClients =
    teamFilter === 'all'
      ? clients
      : clients.filter((client) => {
          const team = teams.find((item) => item.id === teamFilter)
          return team?.clientIds.includes(client.id)
        })

  function toggleClient(clientId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(clientId)
      } else {
        next.delete(clientId)
      }
      return next
    })
  }

  function selectVisible() {
    setSelectedIds(new Set(visibleClients.map((client) => client.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function resetForm() {
    setBody('')
    setSelectedIds(new Set())
    setTeamFilter('all')
    setPendingVoiceFile(null)
    setPendingVoiceDuration(0)
  }

  async function handleSend() {
    const recipientIds = Array.from(selectedIds)
    if (recipientIds.length === 0) {
      toast.error('Select at least one client.')
      return
    }

    setPending(true)

    if (pendingVoiceFile) {
      const formData = new FormData()
      formData.set('file', pendingVoiceFile)
      formData.set('durationSeconds', String(pendingVoiceDuration))
      if (body.trim()) {
        formData.set('caption', body.trim())
      }
      const result = await sendCoachVoiceBroadcast(recipientIds, formData)
      setPending(false)
      if (result.success) {
        toast.success(`Voice broadcast sent to ${recipientIds.length} clients`)
        resetForm()
        setOpen(false)
      } else {
        toast.error(result.error)
      }
      return
    }

    if (!body.trim()) {
      setPending(false)
      toast.error('Write a message or record a voice note.')
      return
    }

    const result = await sendCoachBroadcast(recipientIds, body.trim())
    setPending(false)

    if (result.success) {
      toast.success(`Broadcast sent to ${recipientIds.length} clients`)
      resetForm()
      setOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Megaphone className="size-4" />
          Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Broadcast message</DialogTitle>
          <DialogDescription>
            Send one message to multiple clients. It appears in each client&apos;s
            thread.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by team</Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Recipients ({selectedIds.size} selected)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectVisible}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {visibleClients.length === 0 ? (
                <p className="text-muted-foreground text-sm">No clients found.</p>
              ) : (
                visibleClients.map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={selectedIds.has(client.id)}
                      onChange={(event) =>
                        toggleClient(client.id, event.target.checked)
                      }
                    />
                    <span>{client.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Message</Label>
            <Textarea
              id="broadcast-body"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your broadcast…"
              disabled={pending}
            />
          </div>

          <div className="flex items-center gap-2">
            <VoiceNoteRecorder
              disabled={pending}
              onRecorded={(file, durationSeconds) => {
                setPendingVoiceFile(file)
                setPendingVoiceDuration(durationSeconds)
                toast.success('Voice note ready to send')
              }}
            />
            {pendingVoiceFile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingVoiceFile(null)
                  setPendingVoiceDuration(0)
                }}
              >
                Remove voice note
              </Button>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={pending || selectedIds.size === 0}
          >
            {pending
              ? 'Sending…'
              : `Send to ${selectedIds.size} client${selectedIds.size === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
