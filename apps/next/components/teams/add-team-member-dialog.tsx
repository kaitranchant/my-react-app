'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { addTeamMember } from '@/app/(dashboard)/teams/actions'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toDateKey } from '@/lib/calendar'
import {
  addTeamMemberSchema,
  type AddTeamMemberValues,
  type MemberStartDateMode,
} from '@/lib/validations/team'
import type { Client } from 'app/types/database'

type AddTeamMemberDialogProps = {
  teamId: string
  teamStartDate: string | null
  activeProgramId: string | null
  clients: Pick<Client, 'id' | 'full_name' | 'status'>[]
  memberClientIds: string[]
  trigger?: React.ReactNode
}

export function AddTeamMemberDialog({
  teamId,
  teamStartDate,
  activeProgramId,
  clients,
  memberClientIds,
  trigger,
}: AddTeamMemberDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const hasActiveProgram = Boolean(activeProgramId)

  const assignableClients = clients.filter(
    (client) => client.status !== 'archived'
  )

  const form = useForm<AddTeamMemberValues>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      clientId: '',
      startDateMode: 'team_start',
      customStartDate: toDateKey(new Date()),
    },
  })

  const startDateMode = form.watch('startDateMode')

  React.useEffect(() => {
    if (!open) return
    form.reset({
      clientId: '',
      startDateMode: 'team_start',
      customStartDate: toDateKey(new Date()),
    })
  }, [form, open])

  async function onSubmit(values: AddTeamMemberValues) {
    setPending(true)
    const payload: AddTeamMemberValues = {
      clientId: values.clientId,
    }

    if (hasActiveProgram) {
      payload.startDateMode = values.startDateMode as MemberStartDateMode
      if (values.startDateMode === 'custom') {
        payload.customStartDate = values.customStartDate
      }
    }

    const result = await addTeamMember(teamId, payload)
    setPending(false)

    if (result.success) {
      toast.success(
        result.assigned
          ? 'Client added and program assigned'
          : 'Client added to team'
      )
      setOpen(false)
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  const defaultTrigger = (
    <Button type="button" size="sm">
      <UserPlus className="size-4" />
      Add member
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Add a client to this team.
            {hasActiveProgram
              ? ' Choose when their program should start.'
              : ''}
          </DialogDescription>
        </DialogHeader>

        {assignableClients.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add clients from the Clients page first.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableClients.map((client) => {
                          const isMember = memberClientIds.includes(client.id)
                          return (
                            <SelectItem
                              key={client.id}
                              value={client.id}
                              disabled={isMember}
                            >
                              {client.full_name}
                              {isMember ? ' (already on team)' : ''}
                              {client.status === 'paused' ? ' (paused)' : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hasActiveProgram && (
                <FormField
                  control={form.control}
                  name="startDateMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program start date</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose start date" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="team_start">
                            Team start date
                            {teamStartDate
                              ? ` (${new Date(`${teamStartDate}T12:00:00`).toLocaleDateString()})`
                              : ''}
                          </SelectItem>
                          <SelectItem value="today">Start today</SelectItem>
                          <SelectItem value="custom">Custom date</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {hasActiveProgram && startDateMode === 'custom' && (
                <FormField
                  control={form.control}
                  name="customStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom start date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending || form.formState.isSubmitting}
                >
                  {pending ? 'Adding…' : 'Add member'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
