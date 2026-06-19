'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { assignProgramToClient } from '@/app/(dashboard)/library/programs/actions'
import { assignProgramToTeam } from '@/app/(dashboard)/teams/actions'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toDateKey } from '@/lib/calendar'
import {
  assignProgramToClientFormSchema,
  assignProgramToTeamFormSchema,
  type AssignProgramToClientFormValues,
  type AssignProgramToTeamFormValues,
} from '@/lib/validations/program'
import type { Client, ProgramStatus, Team } from 'app/types/database'

type AssignProgramDialogProps = {
  programId: string
  programName: string
  programStatus: ProgramStatus
  clients: Pick<Client, 'id' | 'full_name' | 'status'>[]
  teams?: Pick<Team, 'id' | 'name'>[]
  trigger?: React.ReactNode
}

export function AssignProgramDialog({
  programId,
  programName,
  programStatus,
  clients,
  teams = [],
  trigger,
}: AssignProgramDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [mode, setMode] = React.useState<'client' | 'team'>('client')

  const assignableClients = clients.filter(
    (client) => client.status !== 'archived'
  )

  const clientForm = useForm<AssignProgramToClientFormValues>({
    resolver: zodResolver(assignProgramToClientFormSchema),
    defaultValues: {
      clientId: '',
      startDate: toDateKey(new Date()),
    },
  })

  const teamForm = useForm<AssignProgramToTeamFormValues>({
    resolver: zodResolver(assignProgramToTeamFormSchema),
    defaultValues: {
      teamId: '',
      startDate: toDateKey(new Date()),
    },
  })

  React.useEffect(() => {
    if (!open) return
    setMode('client')
    clientForm.reset({
      clientId: '',
      startDate: toDateKey(new Date()),
    })
    teamForm.reset({
      teamId: '',
      startDate: toDateKey(new Date()),
    })
  }, [clientForm, teamForm, open])

  async function onClientSubmit(values: AssignProgramToClientFormValues) {
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

  async function onTeamSubmit(values: AssignProgramToTeamFormValues) {
    setPending(true)
    const result = await assignProgramToTeam(values.teamId, {
      programId,
      startDate: values.startDate?.trim() ? values.startDate.trim() : undefined,
    })
    setPending(false)

    if (result.success) {
      const memberMessage =
        result.assignedCount > 0
          ? ` Assigned to ${result.assignedCount} member${
              result.assignedCount === 1 ? '' : 's'
            }.`
          : ''
      if (result.failedCount > 0) {
        toast.warning(
          `Program assigned to team with ${result.failedCount} failure${
            result.failedCount === 1 ? '' : 's'
          }.${memberMessage}`
        )
      } else {
        toast.success(`Program assigned to team.${memberMessage}`)
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
      Assign
    </Button>
  )

  const hasTeams = teams.length > 0
  const hasClients = assignableClients.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign program</DialogTitle>
          <DialogDescription>
            Assign <span className="text-foreground font-medium">{programName}</span>{' '}
            to a client or team. Day 1 becomes the program start date.
          </DialogDescription>
        </DialogHeader>

        {!hasClients && !hasTeams ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Add a client or create a team first, then assign this program.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/clients">Go to clients</Link>
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/teams">Go to teams</Link>
              </Button>
            </div>
          </div>
        ) : (
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as 'client' | 'team')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client" disabled={!hasClients}>
                Client
              </TabsTrigger>
              <TabsTrigger value="team" disabled={!hasTeams}>
                Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="mt-4">
              {hasClients ? (
                <Form {...clientForm}>
                  <form
                    onSubmit={clientForm.handleSubmit(onClientSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={clientForm.control}
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
                      control={clientForm.control}
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
                        disabled={pending || clientForm.formState.isSubmitting}
                      >
                        {pending ? 'Assigning…' : 'Assign program'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No assignable clients. Add a client first.
                </p>
              )}
            </TabsContent>

            <TabsContent value="team" className="mt-4">
              {hasTeams ? (
                <Form {...teamForm}>
                  <form
                    onSubmit={teamForm.handleSubmit(onTeamSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={teamForm.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a team" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={teamForm.control}
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
                        disabled={pending || teamForm.formState.isSubmitting}
                      >
                        {pending ? 'Assigning…' : 'Assign to team'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No teams yet. Create a team first.
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
