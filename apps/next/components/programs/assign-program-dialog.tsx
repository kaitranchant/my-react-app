'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { assignProgramToClient } from '@/app/(dashboard)/library/programs/actions'
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
  assignProgramToClientFormSchema,
  type AssignProgramToClientFormValues,
} from '@/lib/validations/program'
import type { Client, ProgramStatus } from 'app/types/database'

type AssignProgramDialogProps = {
  programId: string
  programName: string
  programStatus: ProgramStatus
  clients: Pick<Client, 'id' | 'full_name' | 'status'>[]
  trigger?: React.ReactNode
}

export function AssignProgramDialog({
  programId,
  programName,
  programStatus,
  clients,
  trigger,
}: AssignProgramDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const assignableClients = clients.filter(
    (client) => client.status !== 'archived'
  )

  const form = useForm<AssignProgramToClientFormValues>({
    resolver: zodResolver(assignProgramToClientFormSchema),
    defaultValues: {
      clientId: '',
      startDate: toDateKey(new Date()),
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      clientId: '',
      startDate: toDateKey(new Date()),
    })
  }, [form, open])

  async function onSubmit(values: AssignProgramToClientFormValues) {
    setPending(true)
    const result = await assignProgramToClient(values.clientId, {
      programId,
      startDate: values.startDate?.trim() ? values.startDate.trim() : undefined,
    })
    setPending(false)

    if (result.success) {
      if (result.scheduledCount > 0) {
        const skippedMessage =
          result.skippedCount > 0
            ? ` ${result.skippedCount} day${
                result.skippedCount === 1 ? '' : 's'
              } skipped (already had workouts).`
            : ''
        toast.success(
          `Program assigned — ${result.scheduledCount} workout${
            result.scheduledCount === 1 ? '' : 's'
          } added to calendar.${skippedMessage}`
        )
      } else {
        toast.success('Program assigned')
      }
      setOpen(false)
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  const defaultTrigger = (
    <Button
      type="button"
      size="sm"
      disabled={programStatus === 'archived'}
    >
      <UserPlus className="size-4" />
      Assign to client
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to client</DialogTitle>
          <DialogDescription>
            Assign <span className="text-foreground font-medium">{programName}</span>{' '}
            to a client. Day 1 becomes their program start date and scheduled
            workouts are added to their calendar.
          </DialogDescription>
        </DialogHeader>

        {assignableClients.length === 0 ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Add a client first, then assign this program from here or from their
              Programs tab.
            </p>
            <Button type="button" variant="outline" asChild>
              <Link href="/clients">Go to clients</Link>
            </Button>
          </div>
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
                        {assignableClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                            {client.status === 'paused' ? ' (paused)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  {pending ? 'Assigning…' : 'Assign program'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
